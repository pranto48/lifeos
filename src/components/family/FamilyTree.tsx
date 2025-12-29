import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Users, Heart, Baby, Link2, Plus, Trash2, X } from 'lucide-react';
import { FamilyMember, FamilyConnection } from '@/hooks/useFamily';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface FamilyTreeProps {
  members: FamilyMember[];
  connections: FamilyConnection[];
  onCreateConnection: (connection: { member_id_1: string; member_id_2: string; connection_type: string }) => void;
  onDeleteConnection: (id: string) => void;
  isCreating?: boolean;
}

const RELATIONSHIP_GROUPS = [
  { key: 'grandparents', label: 'Grandparents', relationships: ['Grandparent'], icon: Users, color: 'from-amber-500/20 to-amber-500/5', borderColor: 'border-amber-500/30' },
  { key: 'parents', label: 'Parents', relationships: ['Parent'], icon: Users, color: 'from-blue-500/20 to-blue-500/5', borderColor: 'border-blue-500/30' },
  { key: 'spouse', label: 'Spouse', relationships: ['Spouse'], icon: Heart, color: 'from-pink-500/20 to-pink-500/5', borderColor: 'border-pink-500/30' },
  { key: 'siblings', label: 'Siblings', relationships: ['Sibling'], icon: Users, color: 'from-purple-500/20 to-purple-500/5', borderColor: 'border-purple-500/30' },
  { key: 'children', label: 'Children', relationships: ['Child'], icon: Baby, color: 'from-green-500/20 to-green-500/5', borderColor: 'border-green-500/30' },
  { key: 'grandchildren', label: 'Grandchildren', relationships: ['Grandchild'], icon: Baby, color: 'from-teal-500/20 to-teal-500/5', borderColor: 'border-teal-500/30' },
  { key: 'extended', label: 'Extended Family', relationships: ['Aunt', 'Uncle', 'Cousin', 'Niece', 'Nephew', 'In-law'], icon: Users, color: 'from-indigo-500/20 to-indigo-500/5', borderColor: 'border-indigo-500/30' },
  { key: 'other', label: 'Other', relationships: ['Other'], icon: User, color: 'from-gray-500/20 to-gray-500/5', borderColor: 'border-gray-500/30' },
];

const CONNECTION_TYPES = [
  { value: 'spouse', label: 'Married / Partners', icon: Heart, color: 'text-pink-500' },
  { value: 'parent_child', label: 'Parent → Child', icon: Baby, color: 'text-green-500' },
  { value: 'sibling', label: 'Siblings', icon: Users, color: 'text-purple-500' },
];

function MemberNode({ 
  member, 
  delay, 
  connections,
  allMembers 
}: { 
  member: FamilyMember; 
  delay: number;
  connections: FamilyConnection[];
  allMembers: FamilyMember[];
}) {
  const memberConnections = connections.filter(
    c => c.member_id_1 === member.id || c.member_id_2 === member.id
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: delay * 0.1, duration: 0.3 }}
      className="flex flex-col items-center"
    >
      <div className="relative">
        <Avatar className="h-16 w-16 border-2 border-primary/30 shadow-lg">
          {member.avatar_url && (
            <AvatarImage src={member.avatar_url} alt={member.name} className="object-cover" />
          )}
          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
            {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        {memberConnections.length > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center">
            <Link2 className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
      <p className="mt-2 text-sm font-medium text-foreground text-center max-w-[100px] truncate">
        {member.name}
      </p>
      <p className="text-xs text-muted-foreground">{member.relationship}</p>
      {memberConnections.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1 justify-center max-w-[120px]">
          {memberConnections.slice(0, 2).map(conn => {
            const otherMemberId = conn.member_id_1 === member.id ? conn.member_id_2 : conn.member_id_1;
            const otherMember = allMembers.find(m => m.id === otherMemberId);
            const connType = CONNECTION_TYPES.find(t => t.value === conn.connection_type);
            return (
              <Badge key={conn.id} variant="outline" className="text-[10px] px-1 py-0">
                {connType?.value === 'spouse' && '💕'}
                {connType?.value === 'parent_child' && (conn.member_id_1 === member.id ? '👶' : '👨‍👩‍👧')}
                {connType?.value === 'sibling' && '👫'}
                {otherMember?.name.split(' ')[0]}
              </Badge>
            );
          })}
          {memberConnections.length > 2 && (
            <Badge variant="outline" className="text-[10px] px-1 py-0">
              +{memberConnections.length - 2}
            </Badge>
          )}
        </div>
      )}
    </motion.div>
  );
}

function RelationshipGroup({ 
  group, 
  members, 
  startDelay,
  connections,
  allMembers
}: { 
  group: typeof RELATIONSHIP_GROUPS[0]; 
  members: FamilyMember[];
  startDelay: number;
  connections: FamilyConnection[];
  allMembers: FamilyMember[];
}) {
  const Icon = group.icon;
  
  if (members.length === 0) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: startDelay * 0.1 }}
      className="relative"
    >
      <Card className={cn(
        "p-6 bg-gradient-to-br border-2",
        group.color,
        group.borderColor
      )}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-background/80 flex items-center justify-center">
            <Icon className="w-4 h-4 text-foreground" />
          </div>
          <h3 className="font-semibold text-foreground">{group.label}</h3>
          <span className="text-sm text-muted-foreground">({members.length})</span>
        </div>
        <div className="flex flex-wrap gap-6 justify-center">
          {members.map((member, idx) => (
            <MemberNode 
              key={member.id} 
              member={member} 
              delay={startDelay + idx}
              connections={connections}
              allMembers={allMembers}
            />
          ))}
        </div>
      </Card>
    </motion.div>
  );
}

function ConnectionsList({ 
  connections, 
  members, 
  onDelete 
}: { 
  connections: FamilyConnection[]; 
  members: FamilyMember[];
  onDelete: (id: string) => void;
}) {
  if (connections.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No connections yet. Add connections to show relationships between family members.
      </p>
    );
  }

  return (
    <div className="space-y-2 max-h-[300px] overflow-y-auto">
      {connections.map(conn => {
        const member1 = members.find(m => m.id === conn.member_id_1);
        const member2 = members.find(m => m.id === conn.member_id_2);
        const connType = CONNECTION_TYPES.find(t => t.value === conn.connection_type);
        const ConnIcon = connType?.icon || Link2;

        return (
          <div 
            key={conn.id} 
            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 group"
          >
            <div className="flex items-center gap-3">
              <div className={cn("w-8 h-8 rounded-full bg-muted flex items-center justify-center", connType?.color)}>
                <ConnIcon className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span>{member1?.name || 'Unknown'}</span>
                  <span className="text-muted-foreground">
                    {conn.connection_type === 'spouse' && '💕'}
                    {conn.connection_type === 'parent_child' && '→'}
                    {conn.connection_type === 'sibling' && '↔'}
                  </span>
                  <span>{member2?.name || 'Unknown'}</span>
                </div>
                <p className="text-xs text-muted-foreground">{connType?.label}</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
              onClick={() => onDelete(conn.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}

function AddConnectionDialog({ 
  members, 
  onAdd, 
  isCreating 
}: { 
  members: FamilyMember[]; 
  onAdd: (connection: { member_id_1: string; member_id_2: string; connection_type: string }) => void;
  isCreating?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [member1, setMember1] = useState('');
  const [member2, setMember2] = useState('');
  const [connectionType, setConnectionType] = useState('spouse');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!member1 || !member2 || member1 === member2) return;
    
    onAdd({ member_id_1: member1, member_id_2: member2, connection_type: connectionType });
    setMember1('');
    setMember2('');
    setConnectionType('spouse');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={members.length < 2}>
          <Plus className="h-4 w-4 mr-2" /> Add Connection
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Family Connection</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>First Family Member</Label>
            <Select value={member1} onValueChange={setMember1}>
              <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
              <SelectContent>
                {members.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.name} ({m.relationship})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Connection Type</Label>
            <Select value={connectionType} onValueChange={setConnectionType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONNECTION_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    <div className="flex items-center gap-2">
                      <t.icon className={cn("h-4 w-4", t.color)} />
                      {t.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {connectionType === 'parent_child' && 'First member is the parent, second is the child'}
              {connectionType === 'spouse' && 'Both members are married or partners'}
              {connectionType === 'sibling' && 'Both members are siblings'}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Second Family Member</Label>
            <Select value={member2} onValueChange={setMember2}>
              <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
              <SelectContent>
                {members.filter(m => m.id !== member1).map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.name} ({m.relationship})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={!member1 || !member2 || member1 === member2 || isCreating}>
              Add Connection
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function FamilyTree({ members, connections, onCreateConnection, onDeleteConnection, isCreating }: FamilyTreeProps) {
  const [showConnections, setShowConnections] = useState(false);

  const groupedMembers = useMemo(() => {
    const groups: Record<string, FamilyMember[]> = {};
    
    RELATIONSHIP_GROUPS.forEach(group => {
      groups[group.key] = members.filter(m => 
        group.relationships.includes(m.relationship)
      );
    });
    
    return groups;
  }, [members]);

  let delayCounter = 0;

  if (members.length === 0) {
    return (
      <Card className="p-12 text-center border-dashed">
        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-semibold text-foreground mb-2">No family members yet</h3>
        <p className="text-muted-foreground">Add family members to see your family tree</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={showConnections ? "default" : "outline"}
            size="sm"
            onClick={() => setShowConnections(!showConnections)}
          >
            <Link2 className="h-4 w-4 mr-2" />
            Connections ({connections.length})
          </Button>
        </div>
        <AddConnectionDialog 
          members={members} 
          onAdd={onCreateConnection}
          isCreating={isCreating}
        />
      </div>

      {/* Connections Panel */}
      <AnimatePresence>
        {showConnections && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Family Connections</h3>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowConnections(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <ConnectionsList 
                connections={connections} 
                members={members} 
                onDelete={onDeleteConnection} 
              />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tree visualization header */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20"
        >
          <User className="w-4 h-4 text-primary" />
          <span className="font-medium text-foreground">You</span>
        </motion.div>
        
        {/* Connector line */}
        <motion.div
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: 0.2 }}
          className="w-0.5 h-8 bg-gradient-to-b from-primary/50 to-primary/20 mx-auto origin-top"
        />
      </div>

      {/* Family tree structure */}
      <div className="grid gap-6">
        {/* Upper generation (Grandparents, Parents) */}
        <div className="grid md:grid-cols-2 gap-6">
          {RELATIONSHIP_GROUPS.slice(0, 2).map(group => {
            const groupMembers = groupedMembers[group.key];
            const currentDelay = delayCounter;
            delayCounter += groupMembers.length + 1;
            return (
              <RelationshipGroup 
                key={group.key} 
                group={group} 
                members={groupMembers}
                startDelay={currentDelay}
                connections={connections}
                allMembers={members}
              />
            );
          })}
        </div>

        {/* Same generation (Spouse, Siblings) */}
        <div className="grid md:grid-cols-2 gap-6">
          {RELATIONSHIP_GROUPS.slice(2, 4).map(group => {
            const groupMembers = groupedMembers[group.key];
            const currentDelay = delayCounter;
            delayCounter += groupMembers.length + 1;
            return (
              <RelationshipGroup 
                key={group.key} 
                group={group} 
                members={groupMembers}
                startDelay={currentDelay}
                connections={connections}
                allMembers={members}
              />
            );
          })}
        </div>

        {/* Lower generation (Children, Grandchildren) */}
        <div className="grid md:grid-cols-2 gap-6">
          {RELATIONSHIP_GROUPS.slice(4, 6).map(group => {
            const groupMembers = groupedMembers[group.key];
            const currentDelay = delayCounter;
            delayCounter += groupMembers.length + 1;
            return (
              <RelationshipGroup 
                key={group.key} 
                group={group} 
                members={groupMembers}
                startDelay={currentDelay}
                connections={connections}
                allMembers={members}
              />
            );
          })}
        </div>

        {/* Extended family and Other */}
        <div className="grid md:grid-cols-2 gap-6">
          {RELATIONSHIP_GROUPS.slice(6).map(group => {
            const groupMembers = groupedMembers[group.key];
            const currentDelay = delayCounter;
            delayCounter += groupMembers.length + 1;
            return (
              <RelationshipGroup 
                key={group.key} 
                group={group} 
                members={groupMembers}
                startDelay={currentDelay}
                connections={connections}
                allMembers={members}
              />
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex flex-wrap gap-4 justify-center pt-6 border-t border-border/50"
      >
        {RELATIONSHIP_GROUPS.filter(g => groupedMembers[g.key].length > 0).map(group => (
          <div key={group.key} className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className={cn("w-3 h-3 rounded-full bg-gradient-to-br", group.color)} />
            <span>{group.label}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
