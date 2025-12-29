import { useState, useEffect } from 'react';
import { Lightbulb, Plus, MoreVertical, Pencil, Trash2, Calendar, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  target_date: string | null;
  tags: string[] | null;
  created_at: string;
}

const statusColors: Record<string, string> = { 
  idea: 'bg-blue-500/20 text-blue-400', 
  researching: 'bg-yellow-500/20 text-yellow-400', 
  building: 'bg-green-500/20 text-green-400', 
  paused: 'bg-orange-500/20 text-orange-400', 
  done: 'bg-primary/20 text-primary', 
  archived: 'bg-muted text-muted-foreground' 
};

const priorityColors: Record<string, string> = {
  high: 'bg-red-500/20 text-red-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  low: 'bg-green-500/20 text-green-400',
};

export default function Projects() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [projects, setProjects] = useState<Project[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'idea',
    priority: 'medium',
    target_date: '',
    tags: '',
  });

  useEffect(() => {
    if (user) loadProjects();
  }, [user]);

  const loadProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    setProjects(data || []);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      status: 'idea',
      priority: 'medium',
      target_date: '',
      tags: '',
    });
    setEditingProject(null);
  };

  const openEditDialog = (project: Project) => {
    setEditingProject(project);
    setFormData({
      title: project.title,
      description: project.description || '',
      status: project.status,
      priority: project.priority,
      target_date: project.target_date || '',
      tags: project.tags?.join(', ') || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !user) return;

    try {
      const payload = {
        user_id: user.id,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        status: formData.status,
        priority: formData.priority,
        target_date: formData.target_date || null,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      };

      if (editingProject) {
        const { error } = await supabase
          .from('projects')
          .update(payload)
          .eq('id', editingProject.id);
        if (error) throw error;
        toast.success(t('projects.projectUpdated'));
      } else {
        const { error } = await supabase.from('projects').insert(payload);
        if (error) throw error;
        toast.success(t('projects.projectAdded'));
      }

      setDialogOpen(false);
      resetForm();
      loadProjects();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('projects.deleteConfirm'))) return;

    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete');
    } else {
      toast.success(t('projects.projectDeleted'));
      loadProjects();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t('projects.projectIdeas')}</h1>
        
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t('projects.addProject')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingProject ? t('projects.editProject') : t('projects.addProject')}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>{t('projects.projectTitle')}</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(f => ({ ...f, title: e.target.value }))}
                  placeholder={t('projects.projectTitle')}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>{t('projects.description')}</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
                  placeholder={t('projects.description')}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('projects.status')}</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData(f => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="idea">{t('projects.idea')}</SelectItem>
                      <SelectItem value="researching">{t('projects.researching')}</SelectItem>
                      <SelectItem value="building">{t('projects.building')}</SelectItem>
                      <SelectItem value="paused">{t('projects.paused')}</SelectItem>
                      <SelectItem value="done">{t('projects.done')}</SelectItem>
                      <SelectItem value="archived">{t('projects.archived')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('projects.priority')}</Label>
                  <Select value={formData.priority} onValueChange={(v) => setFormData(f => ({ ...f, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">{t('projects.high')}</SelectItem>
                      <SelectItem value="medium">{t('projects.medium')}</SelectItem>
                      <SelectItem value="low">{t('projects.low')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('projects.targetDate')}</Label>
                <Input
                  type="date"
                  value={formData.target_date}
                  onChange={(e) => setFormData(f => ({ ...f, target_date: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('projects.tags')}</Label>
                <Input
                  value={formData.tags}
                  onChange={(e) => setFormData(f => ({ ...f, tags: e.target.value }))}
                  placeholder="React, AI, SaaS..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit">
                  {editingProject ? t('common.save') : t('common.add')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.length === 0 ? (
          <Card className="bg-card border-border col-span-full">
            <CardContent className="py-12 text-center">
              <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t('projects.noProjectsYet')}</p>
              <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('projects.addProject')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          projects.map(project => (
            <Card key={project.id} className="bg-card border-border hover:bg-muted/30 transition-colors group">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="font-medium text-foreground">{project.title}</h3>
                  <div className="flex items-center gap-1">
                    <Badge className={statusColors[project.status]}>{t(`projects.${project.status}` as any)}</Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(project)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          {t('common.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(project.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t('common.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                
                {project.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                )}
                
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={priorityColors[project.priority]} variant="outline">
                    <Target className="h-3 w-3 mr-1" />
                    {t(`projects.${project.priority}` as any)}
                  </Badge>
                  {project.target_date && (
                    <Badge variant="outline" className="text-xs">
                      <Calendar className="h-3 w-3 mr-1" />
                      {format(new Date(project.target_date), 'MMM d, yyyy')}
                    </Badge>
                  )}
                </div>
                
                {project.tags && project.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {project.tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
