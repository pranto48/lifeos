import { useState, useEffect } from 'react';
import { CalendarClock, Flag, MessageSquarePlus, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface FollowUpNote {
  id: string;
  content: string;
  created_at: string;
}

interface TaskFollowUpProps {
  taskId: string;
  needsFollowUp: boolean;
  followUpDate: string | null;
  onUpdate: (data: { needs_follow_up: boolean; follow_up_date: string | null }) => void;
}

export function TaskFollowUp({ taskId, needsFollowUp, followUpDate, onUpdate }: TaskFollowUpProps) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<FollowUpNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    loadNotes();
  }, [taskId]);

  const loadNotes = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('task_follow_up_notes')
      .select('id, content, created_at')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });
    setNotes(data || []);
    setLoading(false);
  };

  const addNote = async () => {
    if (!newNote.trim() || !user) return;
    setAddingNote(true);
    const { error } = await supabase.from('task_follow_up_notes').insert({
      task_id: taskId,
      user_id: user.id,
      content: newNote.trim(),
    });
    if (error) {
      toast.error('Failed to add note');
    } else {
      setNewNote('');
      loadNotes();
    }
    setAddingNote(false);
  };

  const deleteNote = async (noteId: string) => {
    const { error } = await supabase.from('task_follow_up_notes').delete().eq('id', noteId);
    if (error) {
      toast.error('Failed to delete note');
    } else {
      setNotes(prev => prev.filter(n => n.id !== noteId));
    }
  };

  return (
    <div className="space-y-4 p-3 rounded-lg border border-border bg-muted/30">
      <Label className="text-sm font-medium flex items-center gap-2">
        <Flag className="h-4 w-4 text-primary" />
        Follow-Up
      </Label>

      <div className="flex items-center justify-between">
        <Label htmlFor="needs-followup" className="text-sm">Needs Follow-Up</Label>
        <Switch
          id="needs-followup"
          checked={needsFollowUp}
          onCheckedChange={(checked) => onUpdate({
            needs_follow_up: checked,
            follow_up_date: checked ? followUpDate : null,
          })}
        />
      </div>

      {needsFollowUp && (
        <>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <CalendarClock className="h-3 w-3" />
              Follow-Up Date
            </Label>
            <Input
              type="date"
              value={followUpDate || ''}
              onChange={(e) => onUpdate({
                needs_follow_up: true,
                follow_up_date: e.target.value || null,
              })}
              className="bg-background"
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <MessageSquarePlus className="h-3 w-3" />
              Follow-Up Notes ({notes.length})
            </Label>

            <div className="flex gap-2">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add follow-up note..."
                className="bg-background resize-none h-16 text-sm"
              />
              <Button
                size="sm"
                onClick={addNote}
                disabled={!newNote.trim() || addingNote}
                className="self-end"
              >
                {addingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-2 text-xs text-muted-foreground">Loading...</div>
            ) : notes.length > 0 ? (
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-2">
                  {notes.map((note) => (
                    <div key={note.id} className="p-2 rounded bg-background border border-border text-sm group">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-foreground whitespace-pre-wrap flex-1">{note.content}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          onClick={() => deleteNote(note.id)}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(note.created_at), 'dd MMM yyyy, hh:mm a')}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">No follow-up notes yet</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
