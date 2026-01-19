import { useState, useEffect } from 'react';
import { History, Check, X, Clock, ChevronDown, ChevronUp, User, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { format } from 'date-fns';

interface AssignmentHistoryItem {
  id: string;
  task_id: string;
  assigned_by: string;
  assigned_to: string;
  status: string;
  assigned_at: string;
  responded_at: string | null;
  message: string | null;
  task: {
    id: string;
    title: string;
  };
  assigner: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  assignee: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

export function TaskAssignmentHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState<AssignmentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user]);

  const loadHistory = async () => {
    if (!user) return;

    try {
      // Get all assignments involving this user (as assigner or assignee) that are not pending
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('task_assignments')
        .select('*')
        .or(`assigned_by.eq.${user.id},assigned_to.eq.${user.id}`)
        .neq('status', 'pending')
        .order('responded_at', { ascending: false, nullsFirst: false })
        .limit(50);

      if (assignmentsError) throw assignmentsError;

      if (!assignmentsData || assignmentsData.length === 0) {
        setHistory([]);
        setLoading(false);
        return;
      }

      // Get task details
      const taskIds = [...new Set(assignmentsData.map(a => a.task_id))];
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('id, title')
        .in('id', taskIds);

      // Get all user profiles involved
      const userIds = [...new Set([
        ...assignmentsData.map(a => a.assigned_by),
        ...assignmentsData.map(a => a.assigned_to)
      ])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, avatar_url')
        .in('user_id', userIds);

      // Combine data
      const combined = assignmentsData.map(assignment => {
        const task = tasksData?.find(t => t.id === assignment.task_id);
        const assigner = profilesData?.find(p => p.user_id === assignment.assigned_by);
        const assignee = profilesData?.find(p => p.user_id === assignment.assigned_to);
        
        return {
          ...assignment,
          task: task || { id: assignment.task_id, title: 'Unknown Task' },
          assigner: assigner ? {
            full_name: assigner.full_name,
            email: assigner.email,
            avatar_url: assigner.avatar_url
          } : null,
          assignee: assignee ? {
            full_name: assignee.full_name,
            email: assignee.email,
            avatar_url: assignee.avatar_url
          } : null
        };
      });

      setHistory(combined);
    } catch (error) {
      console.error('Failed to load assignment history:', error);
    } finally {
      setLoading(false);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><Check className="h-3 w-3 mr-1" /> Accepted</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><X className="h-3 w-3 mr-1" /> Declined</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading || history.length === 0) {
    return null;
  }

  const acceptedCount = history.filter(h => h.status === 'accepted').length;
  const rejectedCount = history.filter(h => h.status === 'rejected').length;

  return (
    <Card className="bg-card border-border mb-6">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-muted-foreground" />
                Assignment History
                <Badge variant="secondary" className="ml-2">
                  {history.length}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-2 text-sm">
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
            {history.map((item) => {
              const isOutgoing = item.assigned_by === user?.id;
              
              return (
                <div
                  key={item.id}
                  className="flex items-start justify-between p-4 rounded-lg border border-border bg-muted/20"
                >
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-foreground">
                        {item.task.title}
                      </p>
                      {getStatusBadge(item.status)}
                      <Badge variant="outline" className="text-xs">
                        {isOutgoing ? 'Sent' : 'Received'}
                      </Badge>
                    </div>

                    {item.message && (
                      <p className="text-sm text-muted-foreground italic border-l-2 border-primary/40 pl-2">
                        "{item.message}"
                      </p>
                    )}

                    <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                      {/* Assigner */}
                      <div className="flex items-center gap-1">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={item.assigner?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(item.assigner?.full_name || null, item.assigner?.email || null)}
                          </AvatarFallback>
                        </Avatar>
                        <span className={isOutgoing ? 'font-medium' : ''}>
                          {isOutgoing ? 'You' : (item.assigner?.full_name || item.assigner?.email || 'Unknown')}
                        </span>
                      </div>

                      <ArrowRight className="h-4 w-4 text-muted-foreground" />

                      {/* Assignee */}
                      <div className="flex items-center gap-1">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={item.assignee?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(item.assignee?.full_name || null, item.assignee?.email || null)}
                          </AvatarFallback>
                        </Avatar>
                        <span className={!isOutgoing ? 'font-medium' : ''}>
                          {!isOutgoing ? 'You' : (item.assignee?.full_name || item.assignee?.email || 'Unknown')}
                        </span>
                      </div>

                      <span className="text-muted-foreground">•</span>
                      
                      <span>
                        {item.responded_at 
                          ? format(new Date(item.responded_at), 'MMM d, yyyy h:mm a')
                          : format(new Date(item.assigned_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
