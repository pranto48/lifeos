import { useState, useEffect } from 'react';
import { Check, X, Clock, User, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface TaskAssignment {
  id: string;
  task_id: string;
  assigned_by: string;
  assigned_to: string;
  status: string;
  assigned_at: string;
  message: string | null;
  task: {
    id: string;
    title: string;
    description: string | null;
    priority: string | null;
    due_date: string | null;
    task_type: string;
  };
  assigner: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

interface PendingTaskAssignmentsProps {
  onAccepted: () => void;
}

export function PendingTaskAssignments({ onAccepted }: PendingTaskAssignmentsProps) {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<TaskAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadAssignments();
    }
  }, [user]);

  const loadAssignments = async () => {
    if (!user) return;

    try {
      // First get pending assignments for the user
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('task_assignments')
        .select('*')
        .eq('assigned_to', user.id)
        .eq('status', 'pending')
        .order('assigned_at', { ascending: false });

      if (assignmentsError) throw assignmentsError;

      if (!assignmentsData || assignmentsData.length === 0) {
        setAssignments([]);
        setLoading(false);
        return;
      }

      // Get task details
      const taskIds = assignmentsData.map(a => a.task_id);
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('id, title, description, priority, due_date, task_type')
        .in('id', taskIds);

      if (tasksError) throw tasksError;

      // Get assigner profiles
      const assignerIds = [...new Set(assignmentsData.map(a => a.assigned_by))];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, avatar_url')
        .in('user_id', assignerIds);

      if (profilesError) throw profilesError;

      // Combine data
      const combined = assignmentsData.map(assignment => {
        const task = tasksData?.find(t => t.id === assignment.task_id);
        const assigner = profilesData?.find(p => p.user_id === assignment.assigned_by);
        
        return {
          ...assignment,
          task: task || {
            id: assignment.task_id,
            title: 'Unknown Task',
            description: null,
            priority: null,
            due_date: null,
            task_type: 'office'
          },
          assigner: assigner ? {
            full_name: assigner.full_name,
            email: assigner.email,
            avatar_url: assigner.avatar_url
          } : null
        };
      });

      setAssignments(combined);
    } catch (error) {
      console.error('Failed to load assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (assignmentId: string, accept: boolean) => {
    if (!user) return;

    setResponding(assignmentId);
    try {
      const assignment = assignments.find(a => a.id === assignmentId);
      if (!assignment) return;

      // Update assignment status
      const { error: updateError } = await supabase
        .from('task_assignments')
        .update({
          status: accept ? 'accepted' : 'rejected',
          responded_at: new Date().toISOString()
        })
        .eq('id', assignmentId);

      if (updateError) throw updateError;

      if (accept) {
        // Create a copy of the task for the accepting user
        // The task data should be available now thanks to RLS policy for assignees
        const taskData = assignment.task;
        
        if (taskData && taskData.title !== 'Unknown Task') {
          const { error: insertError } = await supabase
            .from('tasks')
            .insert({
              user_id: user.id,
              title: taskData.title,
              description: taskData.description 
                ? `${taskData.description}\n\n[Assigned by: ${assignment.assigner?.full_name || assignment.assigner?.email || 'Unknown'}]${assignment.message ? `\n[Message: ${assignment.message}]` : ''}`
                : `[Assigned by: ${assignment.assigner?.full_name || assignment.assigner?.email || 'Unknown'}]${assignment.message ? `\n[Message: ${assignment.message}]` : ''}`,
              priority: taskData.priority,
              status: 'todo',
              due_date: taskData.due_date,
              task_type: taskData.task_type,
              category_id: null, // User can assign their own category
            });

          if (insertError) throw insertError;
        } else {
          toast.error('Could not find task details');
          return;
        }

        toast.success('Task accepted and added to your list');
        onAccepted();
      } else {
        toast.success('Task assignment declined');
      }

      // Send notification to assigner
      try {
        const { data: myProfile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('user_id', user.id)
          .single();

        const myName = myProfile?.full_name || myProfile?.email || 'Someone';

        await supabase.functions.invoke('send-task-assignment-notification', {
          body: {
            type: accept ? 'accepted' : 'rejected',
            assignment_id: assignmentId,
            recipient_user_id: assignment.assigned_by,
            task_title: assignment.task.title,
            sender_name: myName,
          },
        });
      } catch (notifError) {
        console.error('Failed to send notification:', notifError);
      }

      // Remove from local state
      setAssignments(prev => prev.filter(a => a.id !== assignmentId));
    } catch (error) {
      console.error('Failed to respond to assignment:', error);
      toast.error('Failed to respond to assignment');
    } finally {
      setResponding(null);
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

  const priorityColors: Record<string, string> = {
    urgent: 'bg-red-500/20 text-red-400',
    high: 'bg-orange-500/20 text-orange-400',
    medium: 'bg-yellow-500/20 text-yellow-400',
    low: 'bg-green-500/20 text-green-400',
  };

  if (loading) {
    return null;
  }

  if (assignments.length === 0) {
    return null;
  }

  return (
    <Card className="bg-card border-primary/20 mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Pending Task Assignments
          <Badge variant="secondary" className="ml-2">
            {assignments.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {assignments.map((assignment) => (
          <div
            key={assignment.id}
            className="flex items-start justify-between p-4 rounded-lg border border-border bg-muted/30"
          >
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <p className="font-medium text-foreground truncate">
                  {assignment.task.title}
                </p>
                {assignment.task.priority && (
                  <Badge className={priorityColors[assignment.task.priority] || 'bg-muted text-muted-foreground'}>
                    {assignment.task.priority}
                  </Badge>
                )}
              </div>
              
              {assignment.task.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {assignment.task.description}
                </p>
              )}

              {assignment.message && (
                <p className="text-sm text-primary/80 italic border-l-2 border-primary/40 pl-2">
                  "{assignment.message}"
                </p>
              )}

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={assignment.assigner?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(assignment.assigner?.full_name || null, assignment.assigner?.email || null)}
                    </AvatarFallback>
                  </Avatar>
                  <span>
                    From: {assignment.assigner?.full_name || assignment.assigner?.email || 'Unknown'}
                  </span>
                </div>
                {assignment.task.due_date && (
                  <span>
                    Due: {format(new Date(assignment.task.due_date), 'MMM d, yyyy')}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 ml-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRespond(assignment.id, false)}
                disabled={responding === assignment.id}
                className="text-destructive hover:text-destructive"
              >
                {responding === assignment.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <X className="h-4 w-4 mr-1" />
                    Decline
                  </>
                )}
              </Button>
              <Button
                size="sm"
                onClick={() => handleRespond(assignment.id, true)}
                disabled={responding === assignment.id}
              >
                {responding === assignment.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Accept
                  </>
                )}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
