import { useState, useEffect } from 'react';
import { Send, Clock, Check, X, ChevronDown, ChevronUp, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { TaskAssignDialog } from './TaskAssignDialog';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface OutgoingAssignment {
  id: string;
  task_id: string;
  assigned_to: string;
  status: string;
  assigned_at: string;
  responded_at: string | null;
  message: string | null;
  task: {
    id: string;
    title: string;
    priority: string | null;
  };
  assignee: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

export function OutgoingTaskAssignments() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<OutgoingAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [reassigningTask, setReassigningTask] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    if (user) {
      loadAssignments();
    }
  }, [user]);

  const loadAssignments = async () => {
    if (!user) return;

    try {
      // Get outgoing assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('task_assignments')
        .select('*')
        .eq('assigned_by', user.id)
        .order('assigned_at', { ascending: false });

      if (assignmentsError) throw assignmentsError;

      if (!assignmentsData || assignmentsData.length === 0) {
        setAssignments([]);
        setLoading(false);
        return;
      }

      // Get task details
      const taskIds = [...new Set(assignmentsData.map(a => a.task_id))];
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('id, title, priority')
        .in('id', taskIds);

      // Get assignee profiles
      const assigneeIds = [...new Set(assignmentsData.map(a => a.assigned_to))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, avatar_url')
        .in('user_id', assigneeIds);

      // Combine data
      const combined = assignmentsData.map(assignment => {
        const task = tasksData?.find(t => t.id === assignment.task_id);
        const assignee = profilesData?.find(p => p.user_id === assignment.assigned_to);
        
        return {
          ...assignment,
          task: task || { id: assignment.task_id, title: 'Unknown Task', priority: null },
          assignee: assignee ? {
            full_name: assignee.full_name,
            email: assignee.email,
            avatar_url: assignee.avatar_url
          } : null
        };
      });

      setAssignments(combined);
    } catch (error) {
      console.error('Failed to load outgoing assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (assignmentId: string) => {
    setDeleting(assignmentId);
    try {
      const { error } = await supabase
        .from('task_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      setAssignments(prev => prev.filter(a => a.id !== assignmentId));
      toast.success('Assignment cancelled');
    } catch (error) {
      console.error('Failed to delete assignment:', error);
      toast.error('Failed to cancel assignment');
    } finally {
      setDeleting(null);
    }
  };

  const handleReassign = (assignment: OutgoingAssignment) => {
    // For declined assignments, offer direct reassign without deleting first
    setReassigningTask({ id: assignment.task_id, title: assignment.task.title });
    setReassignDialogOpen(true);
  };

  const handleReassignComplete = async () => {
    // Reload assignments to show new assignment
    await loadAssignments();
    toast.success('Task reassigned successfully');
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-500 border-yellow-500"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="text-green-500 border-green-500"><Check className="h-3 w-3 mr-1" /> Accepted</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-red-500 border-red-500"><X className="h-3 w-3 mr-1" /> Declined</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading || assignments.length === 0) {
    return null;
  }

  const pendingCount = assignments.filter(a => a.status === 'pending').length;
  const acceptedCount = assignments.filter(a => a.status === 'accepted').length;
  const rejectedCount = assignments.filter(a => a.status === 'rejected').length;

  return (
    <>
      <Card className="bg-card border-border mb-6">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-muted-foreground" />
                  Tasks I've Assigned
                  <Badge variant="secondary" className="ml-2">
                    {assignments.length}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-2 text-sm">
                    {pendingCount > 0 && (
                      <span className="text-yellow-500">{pendingCount} pending</span>
                    )}
                    {acceptedCount > 0 && (
                      <span className="text-green-500">{acceptedCount} accepted</span>
                    )}
                    {rejectedCount > 0 && (
                      <span className="text-red-500">{rejectedCount} declined</span>
                    )}
                  </div>
                  {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-3 pt-0">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-start justify-between p-4 rounded-lg border border-border bg-muted/20"
                >
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-foreground">
                        {assignment.task.title}
                      </p>
                      {getStatusBadge(assignment.status)}
                    </div>

                    {assignment.message && (
                      <p className="text-sm text-muted-foreground italic">
                        "{assignment.message}"
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span>To:</span>
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={assignment.assignee?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(assignment.assignee?.full_name || null, assignment.assignee?.email || null)}
                          </AvatarFallback>
                        </Avatar>
                        <span>
                          {assignment.assignee?.full_name || assignment.assignee?.email || 'Unknown'}
                        </span>
                      </div>
                      <span>
                        {format(new Date(assignment.assigned_at), 'MMM d, yyyy')}
                      </span>
                      {assignment.responded_at && (
                        <span>
                          Responded: {format(new Date(assignment.responded_at), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {assignment.status === 'rejected' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReassign(assignment)}
                        className="gap-1"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Reassign
                      </Button>
                    )}
                    {assignment.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(assignment.id)}
                        disabled={deleting === assignment.id}
                        className="text-destructive hover:text-destructive"
                      >
                        {deleting === assignment.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Reassign Dialog */}
      {reassigningTask && (
        <TaskAssignDialog
          open={reassignDialogOpen}
          onOpenChange={setReassignDialogOpen}
          taskId={reassigningTask.id}
          taskTitle={reassigningTask.title}
        onAssigned={handleReassignComplete}
      />
      )}
    </>
  );
}
