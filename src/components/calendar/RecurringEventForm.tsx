import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Repeat } from 'lucide-react';

interface RecurringEventFormProps {
  isRecurring: boolean;
  onIsRecurringChange: (value: boolean) => void;
  recurringPattern: string;
  onRecurringPatternChange: (value: string) => void;
  recurringEndDate?: string;
  onRecurringEndDateChange?: (value: string) => void;
}

export function RecurringEventForm({
  isRecurring,
  onIsRecurringChange,
  recurringPattern,
  onRecurringPatternChange,
  recurringEndDate,
  onRecurringEndDateChange,
}: RecurringEventFormProps) {
  return (
    <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Repeat className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="recurring" className="text-sm font-medium">Recurring Event</Label>
        </div>
        <Switch
          id="recurring"
          checked={isRecurring}
          onCheckedChange={onIsRecurringChange}
        />
      </div>

      {isRecurring && (
        <div className="space-y-3 pt-2 border-t border-border">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Repeat Pattern</Label>
            <Select value={recurringPattern} onValueChange={onRecurringPatternChange}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Every 2 Weeks</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {onRecurringEndDateChange && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">End Date (optional)</Label>
              <Input
                type="date"
                value={recurringEndDate || ''}
                onChange={(e) => onRecurringEndDateChange(e.target.value)}
                className="bg-background"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
