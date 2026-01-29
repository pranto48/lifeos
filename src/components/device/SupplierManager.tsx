import { useState } from 'react';
import { Plus, Pencil, Trash2, Building2, Phone, Mail, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { AnimatedIcon } from '@/components/ui/animated-icon';

export interface DeviceSupplier {
  id: string;
  user_id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface SupplierManagerProps {
  suppliers: DeviceSupplier[];
  isAdmin: boolean;
  onAdd: (data: Omit<DeviceSupplier, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<DeviceSupplier | null>;
  onUpdate: (id: string, data: Partial<DeviceSupplier>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

export function SupplierManager({ suppliers, isAdmin, onAdd, onUpdate, onDelete }: SupplierManagerProps) {
  const { language } = useLanguage();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DeviceSupplier | null>(null);
  const [form, setForm] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    is_active: true,
  });

  const openDialog = (supplier?: DeviceSupplier) => {
    if (supplier) {
      setForm({
        name: supplier.name,
        contact_person: supplier.contact_person || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
        notes: supplier.notes || '',
        is_active: supplier.is_active,
      });
      setEditing(supplier);
    } else {
      setForm({
        name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        notes: '',
        is_active: true,
      });
      setEditing(null);
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error(language === 'bn' ? 'সরবরাহকারীর নাম আবশ্যক' : 'Supplier name is required');
      return;
    }

    try {
      if (editing) {
        const success = await onUpdate(editing.id, {
          name: form.name.trim(),
          contact_person: form.contact_person || null,
          phone: form.phone || null,
          email: form.email || null,
          address: form.address || null,
          notes: form.notes || null,
          is_active: form.is_active,
        });
        if (success) {
          toast.success(language === 'bn' ? 'সরবরাহকারী আপডেট হয়েছে' : 'Supplier updated');
          setDialogOpen(false);
        }
      } else {
        const result = await onAdd({
          name: form.name.trim(),
          contact_person: form.contact_person || null,
          phone: form.phone || null,
          email: form.email || null,
          address: form.address || null,
          notes: form.notes || null,
          is_active: true,
        });
        if (result) {
          toast.success(language === 'bn' ? 'সরবরাহকারী যোগ হয়েছে' : 'Supplier added');
          setDialogOpen(false);
        }
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(language === 'bn' ? 'এই সরবরাহকারী মুছে ফেলতে চান?' : 'Delete this supplier?')) return;
    const success = await onDelete(id);
    if (success) {
      toast.success(language === 'bn' ? 'সরবরাহকারী মুছে ফেলা হয়েছে' : 'Supplier deleted');
    } else {
      toast.error(language === 'bn' ? 'মুছতে ব্যর্থ' : 'Failed to delete');
    }
  };

  const activeSuppliers = suppliers.filter(s => s.is_active);
  const inactiveSuppliers = suppliers.filter(s => !s.is_active);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <AnimatedIcon icon={Building2} animation="bounce" className="h-5 w-5 text-primary" />
          {language === 'bn' ? 'সরবরাহকারী তালিকা' : 'Supplier List'}
        </h3>
        {isAdmin && (
          <Button onClick={() => openDialog()} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            {language === 'bn' ? 'নতুন সরবরাহকারী' : 'Add Supplier'}
          </Button>
        )}
      </div>

      <ScrollArea className="h-[400px] rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{language === 'bn' ? 'নাম' : 'Name'}</TableHead>
              <TableHead>{language === 'bn' ? 'যোগাযোগকারী' : 'Contact Person'}</TableHead>
              <TableHead>{language === 'bn' ? 'ফোন' : 'Phone'}</TableHead>
              <TableHead>{language === 'bn' ? 'ইমেইল' : 'Email'}</TableHead>
              <TableHead>{language === 'bn' ? 'অবস্থা' : 'Status'}</TableHead>
              {isAdmin && <TableHead className="text-right">{language === 'bn' ? 'অ্যাকশন' : 'Actions'}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence mode="popLayout">
              {suppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 6 : 5} className="text-center text-muted-foreground py-8">
                    {language === 'bn' ? 'কোন সরবরাহকারী নেই' : 'No suppliers found'}
                  </TableCell>
                </TableRow>
              ) : (
                suppliers.map((supplier, index) => (
                  <motion.tr
                    key={supplier.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b"
                  >
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell>{supplier.contact_person || '-'}</TableCell>
                    <TableCell>
                      {supplier.phone ? (
                        <span className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3" />
                          {supplier.phone}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {supplier.email ? (
                        <span className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3" />
                          {supplier.email}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={supplier.is_active ? 'default' : 'secondary'}>
                        {supplier.is_active 
                          ? (language === 'bn' ? 'সক্রিয়' : 'Active')
                          : (language === 'bn' ? 'নিষ্ক্রিয়' : 'Inactive')
                        }
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDialog(supplier)}
                            className="h-8 w-8"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(supplier.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </TableBody>
        </Table>
      </ScrollArea>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing 
                ? (language === 'bn' ? 'সরবরাহকারী সম্পাদনা' : 'Edit Supplier')
                : (language === 'bn' ? 'নতুন সরবরাহকারী' : 'Add Supplier')
              }
            </DialogTitle>
            <DialogDescription>
              {language === 'bn' 
                ? 'সরবরাহকারীর তথ্য প্রবেশ করুন'
                : 'Enter supplier information'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{language === 'bn' ? 'নাম *' : 'Name *'}</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder={language === 'bn' ? 'সরবরাহকারীর নাম' : 'Supplier name'}
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'bn' ? 'যোগাযোগকারী' : 'Contact Person'}</Label>
              <Input
                value={form.contact_person}
                onChange={(e) => setForm(prev => ({ ...prev, contact_person: e.target.value }))}
                placeholder={language === 'bn' ? 'যোগাযোগকারীর নাম' : 'Contact person name'}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'bn' ? 'ফোন' : 'Phone'}</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="01XXXXXXXXX"
                />
              </div>
              <div className="space-y-2">
                <Label>{language === 'bn' ? 'ইমেইল' : 'Email'}</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@example.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{language === 'bn' ? 'ঠিকানা' : 'Address'}</Label>
              <Textarea
                value={form.address}
                onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
                placeholder={language === 'bn' ? 'সরবরাহকারীর ঠিকানা' : 'Supplier address'}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'bn' ? 'নোট' : 'Notes'}</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder={language === 'bn' ? 'অতিরিক্ত তথ্য' : 'Additional notes'}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button onClick={handleSave}>
              {editing 
                ? (language === 'bn' ? 'আপডেট করুন' : 'Update')
                : (language === 'bn' ? 'যোগ করুন' : 'Add')
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
