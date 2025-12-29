import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { User, Users, Heart, Baby } from 'lucide-react';
import { FamilyMember } from '@/hooks/useFamily';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface FamilyTreeProps {
  members: FamilyMember[];
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

function MemberNode({ member, delay }: { member: FamilyMember; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: delay * 0.1, duration: 0.3 }}
      className="flex flex-col items-center"
    >
      <div className="relative">
        <Avatar className="h-16 w-16 border-2 border-primary/30 shadow-lg">
          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
            {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-background border-2 border-primary/30 flex items-center justify-center">
          <span className="text-[10px] font-medium text-muted-foreground">
            {member.relationship.slice(0, 2)}
          </span>
        </div>
      </div>
      <p className="mt-2 text-sm font-medium text-foreground text-center max-w-[100px] truncate">
        {member.name}
      </p>
      <p className="text-xs text-muted-foreground">{member.relationship}</p>
    </motion.div>
  );
}

function RelationshipGroup({ 
  group, 
  members, 
  startDelay 
}: { 
  group: typeof RELATIONSHIP_GROUPS[0]; 
  members: FamilyMember[];
  startDelay: number;
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
            <MemberNode key={member.id} member={member} delay={startDelay + idx} />
          ))}
        </div>
      </Card>
    </motion.div>
  );
}

export function FamilyTree({ members }: FamilyTreeProps) {
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
