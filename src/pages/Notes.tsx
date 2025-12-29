import { useState, useEffect } from 'react';
import { FileText, Pin, Star, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function Notes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (user) loadNotes();
  }, [user]);

  const loadNotes = async () => {
    const { data } = await supabase.from('notes').select('*').eq('user_id', user?.id).order('is_pinned', { ascending: false }).order('created_at', { ascending: false });
    setNotes(data || []);
  };

  const filtered = notes.filter(n => n.title.toLowerCase().includes(search.toLowerCase()) || n.content?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Notes</h1>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes..." className="pl-9 bg-muted/50" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 ? (
          <Card className="bg-card border-border col-span-full">
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No notes yet. Press 'n' to add one!</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map(note => (
            <Card key={note.id} className="bg-card border-border hover:bg-muted/30 transition-colors cursor-pointer">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <h3 className="font-medium text-foreground">{note.title}</h3>
                  <div className="flex gap-1">
                    {note.is_pinned && <Pin className="h-4 w-4 text-primary" />}
                    {note.is_favorite && <Star className="h-4 w-4 text-yellow-400" />}
                  </div>
                </div>
                {note.content && <p className="text-sm text-muted-foreground line-clamp-3">{note.content}</p>}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex gap-1">
                    {note.tags?.slice(0, 2).map((tag: string) => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}
                  </div>
                  <span className="text-xs text-muted-foreground">{format(new Date(note.created_at), 'MMM d')}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
