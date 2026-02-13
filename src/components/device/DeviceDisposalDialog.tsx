import { useState, useEffect } from 'react';
import { PackageX, AlertTriangle, FileText, DollarSign, User, Calendar, Hash } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { DeviceInventory } from '@/hooks/useDeviceInventory';

const DISPOSAL_METHODS = [
  { value: 'recycled', label: 'Recycled', labelBn: 'পুনর্ব্যবহারযোগ্য', icon: '♻️' },
  { value: 'sold', label: 'Sold', labelBn: 'বিক্রয়', icon: '💰' },
  { value: 'donated', label: 'Donated', labelBn: 'দান', icon: '🎁' },
  { value: 'destroyed', label: 'Destroyed', labelBn: 'ধ্বংস', icon: '🔨' },
  { value: 'returned_vendor', label: 'Returned to Vendor', labelBn: 'বিক্রেতাকে ফেরত', icon: '📦' },
  { value: 'auction', label: 'Auction', labelBn: 'নিলাম', icon: '🔔' },
  { value: 'scrap', label: 'Scrapped', labelBn: 'স্ক্র্যাপ', icon: '🗑️' },
  { value: 'other', label: 'Other', labelBn: 'অন্যান্য', icon: '📋' },
];

const DISPOSAL_REASONS = [
  { value: 'end_of_life', label: 'End of Life', labelBn: 'জীবনকাল শেষ' },
  { value: 'damaged_beyond_repair', label: 'Damaged Beyond Repair', labelBn: 'মেরামতের অযোগ্য' },
  { value: 'obsolete', label: 'Obsolete/Outdated', labelBn: 'অপ্রচলিত' },
  { value: 'replaced', label: 'Replaced by New Device', labelBn: 'নতুন ডিভাইস দ্বারা প্রতিস্থাপিত' },
  { value: 'surplus', label: 'Surplus Equipment', labelBn: 'উদ্বৃত্ত সরঞ্জাম' },
  { value: 'security_risk', label: 'Security Risk', labelBn: 'নিরাপত্তা ঝুঁকি' },
  { value: 'cost_inefficient', label: 'Cost Inefficient to Maintain', labelBn: 'রক্ষণাবেক্ষণ ব্যয়বহুল' },
  { value: 'other', label: 'Other', labelBn: 'অন্যান্য' },
];

interface DisposalRecord {
  id: string;
  device_id: string;
  disposal_date: string;
  disposal_method: string;
  disposal_reason: string | null;
  approved_by: string | null;
  certificate_number: string | null;
  disposal_value: number | null;
  buyer_info: string | null;
  notes: string | null;
  created_at: string;
}

interface DeviceDisposalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device: DeviceInventory | null;
  onDeviceDisposed: () => void;
}

export function DeviceDisposalDialog({ open, onOpenChange, device, onDeviceDisposed }: DeviceDisposalDialogProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [tab, setTab] = useState<'dispose' | 'history'>('dispose');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<DisposalRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [form, setForm] = useState({
    disposal_date: format(new Date(), 'yyyy-MM-dd'),
    disposal_method: 'recycled',
    disposal_reason: 'end_of_life',
    approved_by: '',
    certificate_number: '',
    disposal_value: '',
    buyer_info: '',
    notes: '',
  });

  // Load disposal history for this device
  useEffect(() => {
    if (open && device) {
      loadHistory();
    }
  }, [open, device]);

  const loadHistory = async () => {
    if (!device) return;
    setLoadingHistory(true);
    const { data } = await supabase
      .from('device_disposals')
      .select('*')
      .eq('device_id', device.id)
      .order('disposal_date', { ascending: false });
    if (data) {
      setHistory(data as DisposalRecord[]);
      // If device already has disposal records, show history tab
      if (data.length > 0) setTab('history');
      else setTab('dispose');
    }
    setLoadingHistory(false);
  };

  const handleDispose = async () => {
    if (!device || !user) return;

    setLoading(true);
    try {
      // Insert disposal record
      const { error: disposalError } = await supabase
        .from('device_disposals')
        .insert({
          device_id: device.id,
          user_id: user.id,
          disposal_date: form.disposal_date,
          disposal_method: form.disposal_method,
          disposal_reason: form.disposal_reason || null,
          approved_by: form.approved_by || null,
          certificate_number: form.certificate_number || null,
          disposal_value: form.disposal_value ? parseFloat(form.disposal_value) : null,
          buyer_info: form.buyer_info || null,
          notes: form.notes || null,
        });

      if (disposalError) throw disposalError;

      // Update device status to disposed and unassign
      const { error: updateError } = await supabase
        .from('device_inventory')
        .update({
          status: 'disposed',
          support_user_id: null,
        })
        .eq('id', device.id);

      if (updateError) throw updateError;

      toast.success(language === 'bn' ? 'ডিভাইস বাতিল হিসেবে চিহ্নিত হয়েছে' : 'Device marked as disposed');
      onDeviceDisposed();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || (language === 'bn' ? 'ত্রুটি হয়েছে' : 'An error occurred'));
    } finally {
      setLoading(false);
    }
  };

  const isAlreadyDisposed = device?.status === 'disposed';
  const methodInfo = DISPOSAL_METHODS.find(m => m.value === form.disposal_method);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageX className="h-5 w-5 text-destructive" />
            {language === 'bn' ? 'ডিভাইস বাতিল' : 'Device Disposal'}
          </DialogTitle>
          <DialogDescription>
            {device?.device_name} {device?.device_number ? `(#${device.device_number})` : ''}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh]">
          {/* Tab switcher */}
          <div className="flex gap-1 mb-4 bg-muted/50 rounded-lg p-1">
            <Button
              variant={tab === 'dispose' ? 'default' : 'ghost'}
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={() => setTab('dispose')}
              disabled={isAlreadyDisposed}
            >
              {language === 'bn' ? 'বাতিল করুন' : 'Dispose'}
            </Button>
            <Button
              variant={tab === 'history' ? 'default' : 'ghost'}
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={() => setTab('history')}
            >
              {language === 'bn' ? 'ইতিহাস' : 'History'} ({history.length})
            </Button>
          </div>

          {tab === 'dispose' && !isAlreadyDisposed && (
            <div className="space-y-4 px-1">
              {/* Warning */}
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="p-3 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <p className="text-xs text-destructive">
                    {language === 'bn'
                      ? 'এই কার্যক্রম ডিভাইসটিকে "বাতিল" হিসেবে চিহ্নিত করবে এবং বর্তমান ব্যবহারকারী থেকে বিচ্ছিন্ন করবে।'
                      : 'This action will mark the device as "Disposed" and unassign it from the current user.'}
                  </p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-3">
                {/* Disposal Date */}
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {language === 'bn' ? 'বাতিলের তারিখ' : 'Disposal Date'} *
                  </Label>
                  <Input
                    type="date"
                    value={form.disposal_date}
                    onChange={(e) => setForm({ ...form, disposal_date: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>

                {/* Disposal Method */}
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <PackageX className="h-3 w-3" />
                    {language === 'bn' ? 'বাতিল পদ্ধতি' : 'Method'} *
                  </Label>
                  <Select value={form.disposal_method} onValueChange={(v) => setForm({ ...form, disposal_method: v })}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DISPOSAL_METHODS.map(m => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.icon} {language === 'bn' ? m.labelBn : m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Disposal Reason */}
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {language === 'bn' ? 'বাতিলের কারণ' : 'Reason'}
                  </Label>
                  <Select value={form.disposal_reason} onValueChange={(v) => setForm({ ...form, disposal_reason: v })}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DISPOSAL_REASONS.map(r => (
                        <SelectItem key={r.value} value={r.value}>
                          {language === 'bn' ? r.labelBn : r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Approved By */}
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {language === 'bn' ? 'অনুমোদনকারী' : 'Approved By'}
                  </Label>
                  <Input
                    value={form.approved_by}
                    onChange={(e) => setForm({ ...form, approved_by: e.target.value })}
                    placeholder={language === 'bn' ? 'নাম/পদবী' : 'Name/Title'}
                    className="h-9 text-sm"
                  />
                </div>

                {/* Certificate Number */}
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    {language === 'bn' ? 'সার্টিফিকেট নং' : 'Certificate No.'}
                  </Label>
                  <Input
                    value={form.certificate_number}
                    onChange={(e) => setForm({ ...form, certificate_number: e.target.value })}
                    placeholder={language === 'bn' ? 'বাতিল সার্টিফিকেট' : 'Disposal certificate'}
                    className="h-9 text-sm"
                  />
                </div>

                {/* Disposal Value (for sold/auction) */}
                {(form.disposal_method === 'sold' || form.disposal_method === 'auction') && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {language === 'bn' ? 'বিক্রয় মূল্য' : 'Sale Value'}
                      </Label>
                      <Input
                        type="number"
                        value={form.disposal_value}
                        onChange={(e) => setForm({ ...form, disposal_value: e.target.value })}
                        placeholder="0.00"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {language === 'bn' ? 'ক্রেতা তথ্য' : 'Buyer Info'}
                      </Label>
                      <Input
                        value={form.buyer_info}
                        onChange={(e) => setForm({ ...form, buyer_info: e.target.value })}
                        placeholder={language === 'bn' ? 'ক্রেতার নাম/যোগাযোগ' : 'Buyer name/contact'}
                        className="h-9 text-sm"
                      />
                    </div>
                  </>
                )}

                {/* Notes */}
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">{language === 'bn' ? 'নোট' : 'Notes'}</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder={language === 'bn' ? 'অতিরিক্ত তথ্য...' : 'Additional details...'}
                    className="text-sm"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          )}

          {tab === 'dispose' && isAlreadyDisposed && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <PackageX className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>{language === 'bn' ? 'এই ডিভাইস ইতিমধ্যে বাতিল করা হয়েছে' : 'This device is already disposed'}</p>
            </div>
          )}

          {tab === 'history' && (
            <div className="space-y-3 px-1">
              {loadingHistory ? (
                <div className="text-center py-8 text-sm text-muted-foreground animate-pulse">
                  {language === 'bn' ? 'লোড হচ্ছে...' : 'Loading...'}
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  {language === 'bn' ? 'কোন বাতিলের রেকর্ড নেই' : 'No disposal records'}
                </div>
              ) : (
                history.map((record) => {
                  const method = DISPOSAL_METHODS.find(m => m.value === record.disposal_method);
                  const reason = DISPOSAL_REASONS.find(r => r.value === record.disposal_reason);
                  return (
                    <Card key={record.id} className="bg-muted/30">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            {method?.icon} {language === 'bn' ? method?.labelBn : method?.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(record.disposal_date), 'dd MMM yyyy')}
                          </span>
                        </div>
                        {reason && (
                          <p className="text-xs text-muted-foreground">
                            <strong>{language === 'bn' ? 'কারণ:' : 'Reason:'}</strong>{' '}
                            {language === 'bn' ? reason.labelBn : reason.label}
                          </p>
                        )}
                        {record.approved_by && (
                          <p className="text-xs text-muted-foreground">
                            <strong>{language === 'bn' ? 'অনুমোদন:' : 'Approved:'}</strong> {record.approved_by}
                          </p>
                        )}
                        {record.certificate_number && (
                          <p className="text-xs text-muted-foreground">
                            <strong>{language === 'bn' ? 'সার্টিফিকেট:' : 'Cert:'}</strong> {record.certificate_number}
                          </p>
                        )}
                        {record.disposal_value != null && (
                          <p className="text-xs text-muted-foreground">
                            <strong>{language === 'bn' ? 'মূল্য:' : 'Value:'}</strong> ৳{record.disposal_value.toLocaleString()}
                          </p>
                        )}
                        {record.buyer_info && (
                          <p className="text-xs text-muted-foreground">
                            <strong>{language === 'bn' ? 'ক্রেতা:' : 'Buyer:'}</strong> {record.buyer_info}
                          </p>
                        )}
                        {record.notes && (
                          <p className="text-xs text-muted-foreground italic">{record.notes}</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {language === 'bn' ? 'বন্ধ' : 'Close'}
          </Button>
          {tab === 'dispose' && !isAlreadyDisposed && (
            <Button
              variant="destructive"
              onClick={handleDispose}
              disabled={loading || !form.disposal_date}
            >
              <PackageX className="h-4 w-4 mr-1" />
              {loading
                ? (language === 'bn' ? 'প্রক্রিয়াকরণ...' : 'Processing...')
                : (language === 'bn' ? 'বাতিল করুন' : 'Dispose Device')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
