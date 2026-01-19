import { useState, useEffect } from 'react';
import { UserPlus, Search, Loader2, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';

interface Profile {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface TaskAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskTitle: string;
  onAssigned: () => void;
}

export function TaskAssignDialog({ open, onOpenChange, taskId, taskTitle, onAssigned }: TaskAssignDialogProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState('');
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);

  useEffect(() => {
    if (open) {
      setSearchQuery('');
      setMessage('');
      setUsers([]);
      setSelectedUser(null);
    }
  }, [open]);

  useEffect(() => {
    if (open && searchQuery.length >= 2) {
      searchUsers();
    } else {
      setUsers([]);
    }
  }, [searchQuery, open]);

  const searchUsers = async () => {
    if (!user || searchQuery.length < 2) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, avatar_url')
        .neq('user_id', user.id)
        .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Failed to search users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!user || !selectedUser) return;
    
    setAssigning(selectedUser.user_id);
    try {
      // Check if already assigned
      const { data: existing } = await supabase
        .from('task_assignments')
        .select('id')
        .eq('task_id', taskId)
        .eq('assigned_to', selectedUser.user_id)
        .eq('status', 'pending')
        .maybeSingle();

      if (existing) {
        toast.error('Task already assigned to this user');
        return;
      }

      // Get current user's profile for sender name
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('user_id', user.id)
        .single();

      const senderName = senderProfile?.full_name || senderProfile?.email || 'Someone';

      // Create assignment with message
      const { data: assignment, error } = await supabase
        .from('task_assignments')
        .insert({
          task_id: taskId,
          assigned_by: user.id,
          assigned_to: selectedUser.user_id,
          message: message.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Send notification to assignee
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          await supabase.functions.invoke('send-task-assignment-notification', {
            body: {
              type: 'assignment',
              assignment_id: assignment.id,
              recipient_user_id: selectedUser.user_id,
              task_title: taskTitle,
              sender_name: senderName,
              message: message.trim() || null,
            },
          });
        }
      } catch (notifError) {
        console.error('Failed to send notification:', notifError);
        // Don't fail the assignment if notification fails
      }

      toast.success('Task assigned successfully');
      onAssigned();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to assign task:', error);
      toast.error('Failed to assign task');
    } finally {
      setAssigning(null);
    }
  };

  const getInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return '?';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Assign Task
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Assign "<span className="font-medium text-foreground">{taskTitle}</span>" to another user
          </p>

          {!selectedUser ? (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchQuery.length < 2 
                      ? 'Type at least 2 characters to search' 
                      : 'No users found'}
                  </div>
                ) : (
                  users.map((profile) => (
                    <div
                      key={profile.user_id}
                      onClick={() => setSelectedUser(profile)}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={profile.avatar_url || undefined} />
                          <AvatarFallback>
                            {getInitials(profile.full_name, profile.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">
                            {profile.full_name || 'Unknown'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {profile.email}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/50 bg-primary/5">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={selectedUser.avatar_url || undefined} />
                  <AvatarFallback>
                    {getInitials(selectedUser.full_name, selectedUser.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-foreground">
                    {selectedUser.full_name || 'Unknown'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedUser.email}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedUser(null)}
                >
                  Change
                </Button>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Add a message (optional)
                </Label>
                <Textarea
                  placeholder="Add context or instructions for this task..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAssign}
                  disabled={assigning !== null}
                >
                  {assigning ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-2" />
                  )}
                  Assign Task
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
