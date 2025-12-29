import { useState, useRef } from 'react';
import { format, differenceInDays, differenceInYears, parseISO, isBefore, addYears, setYear } from 'date-fns';
import { 
  Plus, Users, Calendar, FileText, Gift, Heart, Cake, 
  MoreVertical, Pencil, Trash2, Upload, Download, User,
  Baby, PartyPopper, AlertCircle, Clock, FolderOpen, GitBranch
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useFamily, FamilyMember, FamilyEvent, FamilyDocument } from '@/hooks/useFamily';
import { FamilyTree } from '@/components/family/FamilyTree';
import { cn } from '@/lib/utils';

const RELATIONSHIPS = [
  'Spouse', 'Parent', 'Child', 'Sibling', 'Grandparent', 'Grandchild',
  'Aunt', 'Uncle', 'Cousin', 'Niece', 'Nephew', 'In-law', 'Other'
];

const EVENT_TYPES = [
  { value: 'birthday', label: 'Birthday', icon: Cake, color: '#f97316' },
  { value: 'anniversary', label: 'Anniversary', icon: Heart, color: '#ec4899' },
  { value: 'graduation', label: 'Graduation', icon: PartyPopper, color: '#8b5cf6' },
  { value: 'other', label: 'Other', icon: Calendar, color: '#6366f1' },
];

const DOC_CATEGORIES = [
  'ID Document', 'Medical', 'Education', 'Insurance', 'Legal', 'Certificate', 'Other'
];

function getUpcomingEvents(events: FamilyEvent[], days: number = 30) {
  const today = new Date();
  const currentYear = today.getFullYear();
  
  return events
    .map(event => {
      const eventDate = parseISO(event.event_date);
      let nextOccurrence = setYear(eventDate, currentYear);
      
      if (isBefore(nextOccurrence, today)) {
        nextOccurrence = addYears(nextOccurrence, 1);
      }
      
      const daysUntil = differenceInDays(nextOccurrence, today);
      return { ...event, nextOccurrence, daysUntil };
    })
    .filter(e => e.daysUntil <= days && e.daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

function MemberCard({ member, onEdit, onDelete }: {
  member: FamilyMember;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const age = member.date_of_birth 
    ? differenceInYears(new Date(), parseISO(member.date_of_birth))
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <Card className="group hover:shadow-lg transition-all border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12 bg-primary/10">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{member.name}</h3>
                  <Badge variant="secondary" className="mt-1 text-xs">
                    {member.relationship}
                  </Badge>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onEdit}>
                      <Pencil className="h-4 w-4 mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onDelete} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {member.date_of_birth && (
                <p className="text-sm text-muted-foreground mt-2">
                  <Cake className="h-3.5 w-3.5 inline mr-1" />
                  {format(parseISO(member.date_of_birth), 'MMM d, yyyy')}
                  {age !== null && <span className="ml-1">({age} years old)</span>}
                </p>
              )}
              {member.notes && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{member.notes}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function EventCard({ event, onEdit, onDelete }: {
  event: FamilyEvent & { daysUntil?: number };
  onEdit: () => void;
  onDelete: () => void;
}) {
  const eventType = EVENT_TYPES.find(t => t.value === event.event_type) || EVENT_TYPES[3];
  const Icon = eventType.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 group"
    >
      <div 
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: `${eventType.color}20` }}
      >
        <Icon className="w-5 h-5" style={{ color: eventType.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{event.title}</span>
          {event.family_member && (
            <Badge variant="outline" className="text-xs">
              {event.family_member.name}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {format(parseISO(event.event_date), 'MMM d')}
          {event.daysUntil !== undefined && (
            <span className="ml-2">
              {event.daysUntil === 0 ? (
                <span className="text-primary font-medium">Today!</span>
              ) : event.daysUntil === 1 ? (
                <span className="text-orange-500">Tomorrow</span>
              ) : (
                <span>in {event.daysUntil} days</span>
              )}
            </span>
          )}
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-2" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  );
}

function DocumentCard({ doc, onDelete }: {
  doc: FamilyDocument;
  onDelete: () => void;
}) {
  const fileSize = doc.file_size 
    ? doc.file_size < 1024 * 1024 
      ? `${(doc.file_size / 1024).toFixed(1)} KB`
      : `${(doc.file_size / (1024 * 1024)).toFixed(1)} MB`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 group"
    >
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
        <FileText className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground truncate">{doc.title}</span>
          <Badge variant="outline" className="text-xs shrink-0">{doc.category}</Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="truncate">{doc.file_name}</span>
          {fileSize && <span>• {fileSize}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
          <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
            <Download className="h-4 w-4" />
          </a>
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}

export default function Family() {
  const { 
    members, events, documents, isLoading,
    createMember, updateMember, deleteMember,
    createEvent, updateEvent, deleteEvent,
    uploadDocument, deleteDocument
  } = useFamily();

  const [memberDialog, setMemberDialog] = useState(false);
  const [eventDialog, setEventDialog] = useState(false);
  const [docDialog, setDocDialog] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [editingEvent, setEditingEvent] = useState<FamilyEvent | null>(null);
  
  const [memberForm, setMemberForm] = useState({ name: '', relationship: '', date_of_birth: '', notes: '' });
  const [eventForm, setEventForm] = useState({ title: '', event_type: 'birthday', event_date: '', family_member_id: '', notes: '' });
  const [docForm, setDocForm] = useState({ title: '', category: 'general', family_member_id: '', notes: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const upcomingEvents = getUpcomingEvents(events, 30);

  const handleMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMember) {
      await updateMember.mutateAsync({ id: editingMember.id, ...memberForm });
    } else {
      await createMember.mutateAsync(memberForm);
    }
    setMemberDialog(false);
    setEditingMember(null);
    setMemberForm({ name: '', relationship: '', date_of_birth: '', notes: '' });
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...eventForm, family_member_id: eventForm.family_member_id || null };
    if (editingEvent) {
      await updateEvent.mutateAsync({ id: editingEvent.id, ...payload });
    } else {
      await createEvent.mutateAsync(payload);
    }
    setEventDialog(false);
    setEditingEvent(null);
    setEventForm({ title: '', event_type: 'birthday', event_date: '', family_member_id: '', notes: '' });
  };

  const handleDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    
    await uploadDocument.mutateAsync({
      file: selectedFile,
      document: { ...docForm, family_member_id: docForm.family_member_id || null }
    });
    setDocDialog(false);
    setDocForm({ title: '', category: 'general', family_member_id: '', notes: '' });
    setSelectedFile(null);
  };

  const openEditMember = (member: FamilyMember) => {
    setEditingMember(member);
    setMemberForm({
      name: member.name,
      relationship: member.relationship,
      date_of_birth: member.date_of_birth || '',
      notes: member.notes || '',
    });
    setMemberDialog(true);
  };

  const openEditEvent = (event: FamilyEvent) => {
    setEditingEvent(event);
    setEventForm({
      title: event.title,
      event_type: event.event_type,
      event_date: event.event_date,
      family_member_id: event.family_member_id || '',
      notes: event.notes || '',
    });
    setEventDialog(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Family</h1>
          <p className="text-muted-foreground">Manage family members, events, and documents</p>
        </div>
      </div>

      {/* Upcoming Events Alert */}
      {upcomingEvents.length > 0 && (
        <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                <Gift className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Upcoming Events</h3>
                <div className="mt-2 space-y-1">
                  {upcomingEvents.slice(0, 3).map(event => {
                    const eventType = EVENT_TYPES.find(t => t.value === event.event_type);
                    return (
                      <p key={event.id} className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{event.title}</span>
                        {' - '}
                        {event.daysUntil === 0 ? (
                          <span className="text-primary font-medium">Today!</span>
                        ) : event.daysUntil === 1 ? (
                          <span className="text-orange-500">Tomorrow</span>
                        ) : (
                          <span>in {event.daysUntil} days</span>
                        )}
                      </p>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{members.length}</p>
                <p className="text-sm text-muted-foreground">Family Members</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-500/10 to-pink-500/5 border-pink-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-pink-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{events.length}</p>
                <p className="text-sm text-muted-foreground">Events</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{documents.length}</p>
                <p className="text-sm text-muted-foreground">Documents</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="members" className="space-y-4">
        <TabsList>
          <TabsTrigger value="members" className="gap-2">
            <Users className="h-4 w-4" /> Members
          </TabsTrigger>
          <TabsTrigger value="tree" className="gap-2">
            <GitBranch className="h-4 w-4" /> Tree
          </TabsTrigger>
          <TabsTrigger value="events" className="gap-2">
            <Calendar className="h-4 w-4" /> Events
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" /> Documents
          </TabsTrigger>
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={memberDialog} onOpenChange={(open) => {
              setMemberDialog(open);
              if (!open) {
                setEditingMember(null);
                setMemberForm({ name: '', relationship: '', date_of_birth: '', notes: '' });
              }
            }}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" /> Add Member</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingMember ? 'Edit Member' : 'Add Family Member'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleMemberSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={memberForm.name}
                      onChange={(e) => setMemberForm(f => ({ ...f, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Relationship</Label>
                    <Select value={memberForm.relationship} onValueChange={(v) => setMemberForm(f => ({ ...f, relationship: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select relationship" /></SelectTrigger>
                      <SelectContent>
                        {RELATIONSHIPS.map(r => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date of Birth</Label>
                    <Input
                      type="date"
                      value={memberForm.date_of_birth}
                      onChange={(e) => setMemberForm(f => ({ ...f, date_of_birth: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={memberForm.notes}
                      onChange={(e) => setMemberForm(f => ({ ...f, notes: e.target.value }))}
                      rows={2}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setMemberDialog(false)}>Cancel</Button>
                    <Button type="submit" disabled={createMember.isPending || updateMember.isPending}>
                      {editingMember ? 'Save' : 'Add'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4"><div className="h-20 bg-muted rounded" /></CardContent>
                </Card>
              ))}
            </div>
          ) : members.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">No family members yet</h3>
                <p className="text-muted-foreground mb-4">Add your family members to track birthdays and events</p>
                <Button onClick={() => setMemberDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Add First Member
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {members.map(member => (
                  <MemberCard
                    key={member.id}
                    member={member}
                    onEdit={() => openEditMember(member)}
                    onDelete={() => confirm('Delete this family member?') && deleteMember.mutate(member.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        {/* Tree Tab */}
        <TabsContent value="tree" className="space-y-4">
          <FamilyTree members={members} />
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={eventDialog} onOpenChange={(open) => {
              setEventDialog(open);
              if (!open) {
                setEditingEvent(null);
                setEventForm({ title: '', event_type: 'birthday', event_date: '', family_member_id: '', notes: '' });
              }
            }}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" /> Add Event</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingEvent ? 'Edit Event' : 'Add Event'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleEventSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={eventForm.title}
                      onChange={(e) => setEventForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="e.g., Mom's Birthday"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={eventForm.event_type} onValueChange={(v) => setEventForm(f => ({ ...f, event_type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {EVENT_TYPES.map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={eventForm.event_date}
                        onChange={(e) => setEventForm(f => ({ ...f, event_date: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Family Member (optional)</Label>
                    <Select value={eventForm.family_member_id || "none"} onValueChange={(v) => setEventForm(f => ({ ...f, family_member_id: v === "none" ? "" : v }))}>
                      <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {members.map(m => (
                          <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={eventForm.notes}
                      onChange={(e) => setEventForm(f => ({ ...f, notes: e.target.value }))}
                      rows={2}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setEventDialog(false)}>Cancel</Button>
                    <Button type="submit" disabled={createEvent.isPending || updateEvent.isPending}>
                      {editingEvent ? 'Save' : 'Add'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {events.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">No events yet</h3>
                <p className="text-muted-foreground mb-4">Add birthdays, anniversaries, and other important dates</p>
                <Button onClick={() => setEventDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Add First Event
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-4 space-y-2">
                <AnimatePresence>
                  {events.map(event => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onEdit={() => openEditEvent(event)}
                      onDelete={() => confirm('Delete this event?') && deleteEvent.mutate(event.id)}
                    />
                  ))}
                </AnimatePresence>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={docDialog} onOpenChange={(open) => {
              setDocDialog(open);
              if (!open) {
                setDocForm({ title: '', category: 'general', family_member_id: '', notes: '' });
                setSelectedFile(null);
              }
            }}>
              <DialogTrigger asChild>
                <Button><Upload className="h-4 w-4 mr-2" /> Upload Document</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Document</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleDocSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>File</Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    />
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
                        selectedFile ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                      )}
                    >
                      {selectedFile ? (
                        <div className="flex items-center justify-center gap-2">
                          <FileText className="h-5 w-5 text-primary" />
                          <span className="font-medium">{selectedFile.name}</span>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Click to select a file</p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={docForm.title}
                      onChange={(e) => setDocForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="Document title"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={docForm.category} onValueChange={(v) => setDocForm(f => ({ ...f, category: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {DOC_CATEGORIES.map(c => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Family Member</Label>
                      <Select value={docForm.family_member_id || "none"} onValueChange={(v) => setDocForm(f => ({ ...f, family_member_id: v === "none" ? "" : v }))}>
                        <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {members.map(m => (
                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={docForm.notes}
                      onChange={(e) => setDocForm(f => ({ ...f, notes: e.target.value }))}
                      rows={2}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setDocDialog(false)}>Cancel</Button>
                    <Button type="submit" disabled={!selectedFile || uploadDocument.isPending}>
                      {uploadDocument.isPending ? 'Uploading...' : 'Upload'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {documents.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">No documents yet</h3>
                <p className="text-muted-foreground mb-4">Store important family documents securely</p>
                <Button onClick={() => setDocDialog(true)}>
                  <Upload className="h-4 w-4 mr-2" /> Upload First Document
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-4 space-y-2">
                <AnimatePresence>
                  {documents.map(doc => (
                    <DocumentCard
                      key={doc.id}
                      doc={doc}
                      onDelete={() => confirm('Delete this document?') && deleteDocument.mutate(doc)}
                    />
                  ))}
                </AnimatePresence>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
