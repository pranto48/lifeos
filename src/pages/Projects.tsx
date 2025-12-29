import { useState, useEffect } from 'react';
import { Lightbulb } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const statusColors: Record<string, string> = { idea: 'bg-blue-500/20 text-blue-400', researching: 'bg-yellow-500/20 text-yellow-400', building: 'bg-green-500/20 text-green-400', paused: 'bg-orange-500/20 text-orange-400', done: 'bg-primary/20 text-primary', archived: 'bg-muted text-muted-foreground' };

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    if (user) loadProjects();
  }, [user]);

  const loadProjects = async () => {
    const { data } = await supabase.from('projects').select('*').eq('user_id', user?.id).order('created_at', { ascending: false });
    setProjects(data || []);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Project Ideas</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.length === 0 ? (
          <Card className="bg-card border-border col-span-full">
            <CardContent className="py-12 text-center">
              <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No project ideas yet.</p>
            </CardContent>
          </Card>
        ) : (
          projects.map(project => (
            <Card key={project.id} className="bg-card border-border hover:bg-muted/30 transition-colors cursor-pointer">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="font-medium text-foreground">{project.title}</h3>
                  <Badge className={statusColors[project.status]}>{project.status}</Badge>
                </div>
                {project.description && <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>}
                <div className="flex gap-1 flex-wrap">
                  {project.tags?.map((tag: string) => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
