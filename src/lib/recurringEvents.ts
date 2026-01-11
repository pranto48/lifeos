import { addDays, addWeeks, addMonths, addYears, isBefore, isAfter, parseISO, format } from 'date-fns';

export type RecurringPattern = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

interface RecurringEvent {
  id: string;
  title: string;
  date: string;
  type: 'task' | 'goal' | 'family_event';
  priority?: string;
  status?: string;
  event_type?: string;
  is_recurring?: boolean;
  recurring_pattern?: string;
}

export function getNextOccurrence(date: Date, pattern: RecurringPattern): Date {
  switch (pattern) {
    case 'daily':
      return addDays(date, 1);
    case 'weekly':
      return addWeeks(date, 1);
    case 'biweekly':
      return addWeeks(date, 2);
    case 'monthly':
      return addMonths(date, 1);
    case 'quarterly':
      return addMonths(date, 3);
    case 'yearly':
      return addYears(date, 1);
    default:
      return addDays(date, 1);
  }
}

export function generateRecurringInstances(
  event: RecurringEvent,
  rangeStart: Date,
  rangeEnd: Date
): RecurringEvent[] {
  if (!event.is_recurring || !event.recurring_pattern) {
    return [];
  }

  const pattern = event.recurring_pattern as RecurringPattern;
  const instances: RecurringEvent[] = [];
  let currentDate = parseISO(event.date);

  // Move forward if the event date is before range start
  while (isBefore(currentDate, rangeStart)) {
    currentDate = getNextOccurrence(currentDate, pattern);
  }

  // Generate instances within the range (limit to 365 to prevent infinite loops)
  let count = 0;
  while (!isAfter(currentDate, rangeEnd) && count < 365) {
    instances.push({
      ...event,
      id: `${event.id}-recurring-${format(currentDate, 'yyyy-MM-dd')}`,
      date: format(currentDate, 'yyyy-MM-dd'),
    });
    currentDate = getNextOccurrence(currentDate, pattern);
    count++;
  }

  return instances;
}

export function getPatternLabel(pattern: string): string {
  const labels: Record<string, string> = {
    daily: 'Daily',
    weekly: 'Weekly',
    biweekly: 'Every 2 Weeks',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    yearly: 'Yearly',
  };
  return labels[pattern] || pattern;
}
