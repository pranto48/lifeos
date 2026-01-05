import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardMode } from '@/contexts/DashboardModeContext';
import { Loader2 } from 'lucide-react';

interface QuickAddNoteProps {
  onClose: () => void;
}

export function QuickAddNote({ onClose }: QuickAddNoteProps) {
  const { user } = useAuth();
  const { mode } = useDashboardMode();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !user) return;

    setLoading(true);
    try {
      const tagsArray = tags.split(',').map(t => t.trim()).filter(Boolean);
      
      const { error } = await supabase.from('notes').insert({
        user_id: user.id,
        title: title.trim(),
        content: content.trim() || null,
        tags: tagsArray,
        note_type: mode,
      });

      if (error) throw error;

      toast({
        title: 'Note created',
        description: 'Your note has been saved.',
      });
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="note-title">Title</Label>
        <Input
          id="note-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title"
          className="bg-muted/50 border-border"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="note-content">Content</Label>
        <Textarea
          id="note-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your note..."
          className="bg-muted/50 border-border resize-none h-32"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="note-tags">Tags (comma separated)</Label>
        <Input
          id="note-tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="work, ideas, important"
          className="bg-muted/50 border-border"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={!title.trim() || loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Add Note
        </Button>
      </div>
    </form>
  );
}
