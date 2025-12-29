import { useState, useEffect } from 'react';
import { Heart, Gift, Calendar, PartyPopper } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, differenceInDays, addYears, isBefore, startOfDay } from 'date-fns';

interface FamilyEvent {
  id: string;
  title: string;
  event_date: string;
  event_type: string;
  family_member_id: string | null;
  family_member?: {
    name: string;
  } | null;
  daysUntil: number;
}

const eventIcons: Record<string, typeof Gift> = {
  birthday: Gift,
  anniversary: Heart,
  holiday: PartyPopper,
  other: Calendar,
};

export function UpcomingFamilyEvents() {
  const { user } = useAuth();
  const [events, setEvents] = useState<FamilyEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadUpcomingEvents();
  }, [user]);

  const loadUpcomingEvents = async () => {
    const { data, error } = await supabase
      .from('family_events')
      .select('*, family_member:family_members(name)')
      .eq('user_id', user?.id);

    if (!error && data) {
      const today = startOfDay(new Date());
      
      const processedEvents = data.map(event => {
        const eventDate = new Date(event.event_date);
        let nextOccurrence = new Date(
          today.getFullYear(),
          eventDate.getMonth(),
          eventDate.getDate()
        );

        // If the event already passed this year, get next year's occurrence
        if (isBefore(nextOccurrence, today)) {
          nextOccurrence = addYears(nextOccurrence, 1);
        }

        const daysUntil = differenceInDays(nextOccurrence, today);

        return {
          ...event,
          daysUntil,
        };
      });

      // Sort by days until and take the next 5
      const sortedEvents = processedEvents
        .sort((a, b) => a.daysUntil - b.daysUntil)
        .slice(0, 5);

      setEvents(sortedEvents);
    }
    setLoading(false);
  };

  const getDaysLabel = (days: number) => {
    if (days === 0) return 'Today!';
    if (days === 1) return 'Tomorrow';
    return `In ${days} days`;
  };

  const getEventColor = (days: number) => {
    if (days === 0) return 'text-green-400 bg-green-500/20';
    if (days <= 3) return 'text-yellow-400 bg-yellow-500/20';
    if (days <= 7) return 'text-blue-400 bg-blue-500/20';
    return 'text-muted-foreground bg-muted/50';
  };

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Gift className="h-4 w-4" /> Upcoming Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-muted/30 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Gift className="h-4 w-4" /> Upcoming Events
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No upcoming family events. Add some in the Family page!
          </p>
        ) : (
          <div className="space-y-2">
            {events.map(event => {
              const IconComponent = eventIcons[event.event_type] || Calendar;
              const colorClasses = getEventColor(event.daysUntil);

              return (
                <div 
                  key={event.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colorClasses.split(' ')[1]}`}>
                      <IconComponent className={`h-4 w-4 ${colorClasses.split(' ')[0]}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.family_member?.name && `${event.family_member.name} • `}
                        {format(new Date(event.event_date), 'MMM d')}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${colorClasses}`}>
                    {getDaysLabel(event.daysUntil)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
