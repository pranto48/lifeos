import { useMemo } from 'react';
import { format, parseISO, differenceInYears } from 'date-fns';
import { 
  X, Cake, Calendar, FileText, Heart, Users, Link2, 
  User, MapPin, Pencil, Trash2, Download
} from 'lucide-react';
import { motion } from 'framer-motion';
import { FamilyMember, FamilyEvent, FamilyDocument, FamilyConnection } from '@/hooks/useFamily';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface FamilyMemberDetailProps {
  member: FamilyMember;
  events: FamilyEvent[];
  documents: FamilyDocument[];
  connections: FamilyConnection[];
  allMembers: FamilyMember[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const CONNECTION_TYPES = [
  { value: 'spouse', label: 'Married / Partners', icon: Heart, color: 'text-pink-500', bg: 'bg-pink-500/10' },
  { value: 'parent_child', label: 'Parent → Child', icon: Users, color: 'text-green-500', bg: 'bg-green-500/10' },
  { value: 'sibling', label: 'Siblings', icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' },
];

const EVENT_TYPES = [
  { value: 'birthday', label: 'Birthday', icon: Cake, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { value: 'anniversary', label: 'Anniversary', icon: Heart, color: 'text-pink-500', bg: 'bg-pink-500/10' },
  { value: 'graduation', label: 'Graduation', icon: Calendar, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { value: 'other', label: 'Other', icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-500/10' },
];

export function FamilyMemberDetail({
  member,
  events,
  documents,
  connections,
  allMembers,
  onClose,
  onEdit,
  onDelete,
}: FamilyMemberDetailProps) {
  const age = member.date_of_birth
    ? differenceInYears(new Date(), parseISO(member.date_of_birth))
    : null;

  // Filter events for this member
  const memberEvents = useMemo(() => 
    events.filter(e => e.family_member_id === member.id),
    [events, member.id]
  );

  // Filter documents for this member
  const memberDocuments = useMemo(() => 
    documents.filter(d => d.family_member_id === member.id),
    [documents, member.id]
  );

  // Filter connections for this member
  const memberConnections = useMemo(() => 
    connections.filter(c => c.member_id_1 === member.id || c.member_id_2 === member.id),
    [connections, member.id]
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-card border border-border rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-6">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>

          <div className="flex items-start gap-4">
            <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
              {member.avatar_url && (
                <AvatarImage src={member.avatar_url} alt={member.name} className="object-cover" />
              )}
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-2xl">
                {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground">{member.name}</h2>
              <Badge variant="secondary" className="mt-2">
                {member.relationship}
              </Badge>
              
              {member.date_of_birth && (
                <div className="flex items-center gap-2 mt-3 text-muted-foreground">
                  <Cake className="h-4 w-4" />
                  <span className="text-sm">
                    {format(parseISO(member.date_of_birth), 'MMMM d, yyyy')}
                    {age !== null && <span className="ml-1">({age} years old)</span>}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={onEdit}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="text-destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {member.notes && (
            <p className="mt-4 text-sm text-muted-foreground bg-background/50 rounded-lg p-3">
              {member.notes}
            </p>
          )}
        </div>

        <Separator />

        {/* Content */}
        <ScrollArea className="h-[calc(90vh-280px)]">
          <div className="p-6 space-y-6">
            {/* Connections Section */}
            <section>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Connections ({memberConnections.length})
              </h3>
              {memberConnections.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No connections yet</p>
              ) : (
                <div className="grid gap-2">
                  {memberConnections.map(conn => {
                    const otherMemberId = conn.member_id_1 === member.id ? conn.member_id_2 : conn.member_id_1;
                    const otherMember = allMembers.find(m => m.id === otherMemberId);
                    const connType = CONNECTION_TYPES.find(t => t.value === conn.connection_type);
                    const ConnIcon = connType?.icon || Link2;
                    const isParent = conn.connection_type === 'parent_child' && conn.member_id_1 === member.id;
                    const isChild = conn.connection_type === 'parent_child' && conn.member_id_2 === member.id;

                    return (
                      <div key={conn.id} className={cn("flex items-center gap-3 p-3 rounded-lg", connType?.bg)}>
                        <Avatar className="h-10 w-10 border border-background">
                          {otherMember?.avatar_url && (
                            <AvatarImage src={otherMember.avatar_url} alt={otherMember?.name} />
                          )}
                          <AvatarFallback className="text-xs">
                            {otherMember?.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{otherMember?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {conn.connection_type === 'spouse' && 'Spouse / Partner'}
                            {isParent && `Parent of ${otherMember?.name}`}
                            {isChild && `Child of ${otherMember?.name}`}
                            {conn.connection_type === 'sibling' && 'Sibling'}
                          </p>
                        </div>
                        <ConnIcon className={cn("h-5 w-5", connType?.color)} />
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Events Section */}
            <section>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Events ({memberEvents.length})
              </h3>
              {memberEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No events for this member</p>
              ) : (
                <div className="grid gap-2">
                  {memberEvents.map(event => {
                    const eventType = EVENT_TYPES.find(t => t.value === event.event_type) || EVENT_TYPES[3];
                    const EventIcon = eventType.icon;

                    return (
                      <div key={event.id} className={cn("flex items-center gap-3 p-3 rounded-lg", eventType.bg)}>
                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", eventType.bg)}>
                          <EventIcon className={cn("h-5 w-5", eventType.color)} />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{event.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(event.event_date), 'MMMM d')}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {eventType.label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Documents Section */}
            <section>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documents ({memberDocuments.length})
              </h3>
              {memberDocuments.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No documents for this member</p>
              ) : (
                <div className="grid gap-2">
                  {memberDocuments.map(doc => {
                    const fileSize = doc.file_size
                      ? doc.file_size < 1024 * 1024
                        ? `${(doc.file_size / 1024).toFixed(1)} KB`
                        : `${(doc.file_size / (1024 * 1024)).toFixed(1)} MB`
                      : null;

                    return (
                      <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{doc.title}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">{doc.category}</Badge>
                            {fileSize && <span>{fileSize}</span>}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </ScrollArea>
      </motion.div>
    </motion.div>
  );
}
