import { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { GripVertical, Settings2, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardWidget } from '@/hooks/useDashboardLayout';

interface SortableItemProps {
  widget: DashboardWidget;
  onToggle: (id: string) => void;
}

function SortableItem({ widget, onToggle }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id, disabled: !widget.enabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 rounded-lg border ${
        widget.enabled ? 'bg-card border-border' : 'bg-muted/30 border-border/50'
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className={`cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted ${
          !widget.enabled ? 'opacity-30 cursor-not-allowed' : ''
        }`}
        disabled={!widget.enabled}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      
      <div className="flex-1">
        <span className={`text-sm font-medium ${!widget.enabled ? 'text-muted-foreground' : ''}`}>
          {widget.name}
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        {widget.enabled ? (
          <Eye className="h-4 w-4 text-green-500" />
        ) : (
          <EyeOff className="h-4 w-4 text-muted-foreground" />
        )}
        <Switch
          checked={widget.enabled}
          onCheckedChange={() => onToggle(widget.id)}
        />
      </div>
    </div>
  );
}

interface DashboardCustomizerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widgets: DashboardWidget[];
  onToggle: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onReset: () => void;
}

export function DashboardCustomizer({
  open,
  onOpenChange,
  widgets,
  onToggle,
  onReorder,
  onReset,
}: DashboardCustomizerProps) {
  const { language } = useLanguage();
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const enabledWidgets = widgets.filter(w => w.enabled).sort((a, b) => a.order - b.order);
  const disabledWidgets = widgets.filter(w => !w.enabled);
  const sortedWidgets = [...enabledWidgets, ...disabledWidgets];

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = enabledWidgets.findIndex(w => w.id === active.id);
      const newIndex = enabledWidgets.findIndex(w => w.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorder(oldIndex, newIndex);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            {language === 'bn' ? 'ড্যাশবোর্ড কাস্টমাইজ' : 'Customize Dashboard'}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            {language === 'bn' 
              ? 'উইজেটগুলি দেখান/লুকান এবং ড্র্যাগ করে পুনর্বিন্যাস করুন।'
              : 'Toggle widgets visibility and drag to reorder.'}
          </p>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={enabledWidgets.map(w => w.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {sortedWidgets.map(widget => (
                  <SortableItem
                    key={widget.id}
                    widget={widget}
                    onToggle={onToggle}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="outline" size="sm" onClick={onReset}>
            <RotateCcw className="h-4 w-4 mr-1" />
            {language === 'bn' ? 'রিসেট' : 'Reset'}
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            {language === 'bn' ? 'সম্পন্ন' : 'Done'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
