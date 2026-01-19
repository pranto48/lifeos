import { useState } from 'react';
import { Building2, Users, Briefcase, Plus, Pencil, Trash2, Monitor, Globe, Phone, Mail, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useSupportData, SupportUnit, SupportDepartment, SupportUser } from '@/hooks/useSupportData';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SupportUsers() {
  const { t, language } = useLanguage();
  const {
    units,
    departments,
    supportUsers,
    loading,
    addUnit,
    updateUnit,
    deleteUnit,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    getDepartmentsByUnit,
    addSupportUser,
    updateSupportUser,
    deleteSupportUser,
    getUsersByDepartment,
  } = useSupportData();

  // Dialog states
  const [unitDialog, setUnitDialog] = useState<{ open: boolean; editing: SupportUnit | null }>({ open: false, editing: null });
  const [deptDialog, setDeptDialog] = useState<{ open: boolean; editing: SupportDepartment | null }>({ open: false, editing: null });
  const [userDialog, setUserDialog] = useState<{ open: boolean; editing: SupportUser | null }>({ open: false, editing: null });

  // Form states
  const [unitForm, setUnitForm] = useState({ name: '', description: '' });
  const [deptForm, setDeptForm] = useState({ name: '', description: '', unit_id: '' });
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    phone: '',
    designation: '',
    device_info: '',
    ip_address: '',
    notes: '',
    department_id: '',
    is_active: true,
  });

  // Unit handlers
  const openUnitDialog = (unit?: SupportUnit) => {
    if (unit) {
      setUnitForm({ name: unit.name, description: unit.description || '' });
      setUnitDialog({ open: true, editing: unit });
    } else {
      setUnitForm({ name: '', description: '' });
      setUnitDialog({ open: true, editing: null });
    }
  };

  const handleSaveUnit = async () => {
    if (!unitForm.name.trim()) {
      toast.error('Unit name is required');
      return;
    }

    try {
      if (unitDialog.editing) {
        await updateUnit(unitDialog.editing.id, unitForm);
        toast.success('Unit updated');
      } else {
        await addUnit(unitForm.name, unitForm.description);
        toast.success('Unit added');
      }
      setUnitDialog({ open: false, editing: null });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteUnit = async (id: string) => {
    if (!confirm('Delete this unit? All departments and users under it will also be deleted.')) return;
    try {
      await deleteUnit(id);
      toast.success('Unit deleted');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Department handlers
  const openDeptDialog = (dept?: SupportDepartment) => {
    if (dept) {
      setDeptForm({ name: dept.name, description: dept.description || '', unit_id: dept.unit_id });
      setDeptDialog({ open: true, editing: dept });
    } else {
      setDeptForm({ name: '', description: '', unit_id: units[0]?.id || '' });
      setDeptDialog({ open: true, editing: null });
    }
  };

  const handleSaveDept = async () => {
    if (!deptForm.name.trim() || !deptForm.unit_id) {
      toast.error('Department name and unit are required');
      return;
    }

    try {
      if (deptDialog.editing) {
        await updateDepartment(deptDialog.editing.id, deptForm);
        toast.success('Department updated');
      } else {
        await addDepartment(deptForm.unit_id, deptForm.name, deptForm.description);
        toast.success('Department added');
      }
      setDeptDialog({ open: false, editing: null });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteDept = async (id: string) => {
    if (!confirm('Delete this department? All users under it will also be deleted.')) return;
    try {
      await deleteDepartment(id);
      toast.success('Department deleted');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Support User handlers
  const openUserDialog = (user?: SupportUser) => {
    if (user) {
      setUserForm({
        name: user.name,
        email: user.email || '',
        phone: user.phone || '',
        designation: user.designation || '',
        device_info: user.device_info || '',
        ip_address: user.ip_address || '',
        notes: user.notes || '',
        department_id: user.department_id,
        is_active: user.is_active,
      });
      setUserDialog({ open: true, editing: user });
    } else {
      setUserForm({
        name: '',
        email: '',
        phone: '',
        designation: '',
        device_info: '',
        ip_address: '',
        notes: '',
        department_id: departments[0]?.id || '',
        is_active: true,
      });
      setUserDialog({ open: true, editing: null });
    }
  };

  const handleSaveUser = async () => {
    if (!userForm.name.trim() || !userForm.department_id) {
      toast.error('User name and department are required');
      return;
    }

    try {
      if (userDialog.editing) {
        await updateSupportUser(userDialog.editing.id, userForm);
        toast.success('User updated');
      } else {
        await addSupportUser(userForm as any);
        toast.success('User added');
      }
      setUserDialog({ open: false, editing: null });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Delete this user?')) return;
    try {
      await deleteSupportUser(id);
      toast.success('User deleted');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Get unit name for a department
  const getUnitName = (unitId: string) => units.find(u => u.id === unitId)?.name || 'Unknown';

  // Get department name for a user
  const getDeptName = (deptId: string) => departments.find(d => d.id === deptId)?.name || 'Unknown';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">
          {language === 'bn' ? 'সাপোর্ট ইউজার ম্যানেজমেন্ট' : 'Support User Management'}
        </h1>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">{language === 'bn' ? 'ইউজার' : 'Users'}</span>
            <Badge variant="secondary" className="ml-1">{supportUsers.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="departments" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">{language === 'bn' ? 'বিভাগ' : 'Departments'}</span>
            <Badge variant="secondary" className="ml-1">{departments.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="units" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">{language === 'bn' ? 'ইউনিট' : 'Units'}</span>
            <Badge variant="secondary" className="ml-1">{units.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openUserDialog()} disabled={departments.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              {language === 'bn' ? 'নতুন ইউজার' : 'Add User'}
            </Button>
          </div>

          {departments.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                {language === 'bn' 
                  ? 'প্রথমে ইউনিট এবং বিভাগ যোগ করুন' 
                  : 'Please add units and departments first'}
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {supportUsers.map(user => {
              const dept = departments.find(d => d.id === user.department_id);
              const unit = dept ? units.find(u => u.id === dept.unit_id) : null;

              return (
                <Card key={user.id} className={`${!user.is_active ? 'opacity-60' : ''}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{user.name}</CardTitle>
                          {user.designation && (
                            <p className="text-xs text-muted-foreground">{user.designation}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openUserDialog(user)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteUser(user.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="h-3 w-3" />
                      <span>{unit?.name || 'N/A'} → {dept?.name || 'N/A'}</span>
                    </div>
                    {user.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span>{user.email}</span>
                      </div>
                    )}
                    {user.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span>{user.phone}</span>
                      </div>
                    )}
                    {user.device_info && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Monitor className="h-3 w-3" />
                        <span className="truncate">{user.device_info}</span>
                      </div>
                    )}
                    {user.ip_address && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Globe className="h-3 w-3" />
                        <span>{user.ip_address}</span>
                      </div>
                    )}
                    {!user.is_active && (
                      <Badge variant="secondary" className="text-xs">Inactive</Badge>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {supportUsers.length === 0 && departments.length > 0 && (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                {language === 'bn' ? 'কোন ইউজার নেই' : 'No users yet'}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Departments Tab */}
        <TabsContent value="departments" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openDeptDialog()} disabled={units.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              {language === 'bn' ? 'নতুন বিভাগ' : 'Add Department'}
            </Button>
          </div>

          {units.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                {language === 'bn' ? 'প্রথমে ইউনিট যোগ করুন' : 'Please add units first'}
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {departments.map(dept => (
              <Card key={dept.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle className="text-base">{dept.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{getUnitName(dept.unit_id)}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDeptDialog(dept)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteDept(dept.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {dept.description && (
                    <p className="text-sm text-muted-foreground">{dept.description}</p>
                  )}
                  <Badge variant="outline" className="mt-2">
                    {getUsersByDepartment(dept.id).length} {language === 'bn' ? 'ইউজার' : 'users'}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Units Tab */}
        <TabsContent value="units" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openUnitDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              {language === 'bn' ? 'নতুন ইউনিট' : 'Add Unit'}
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {units.map(unit => (
              <Card key={unit.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">{unit.name}</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openUnitDialog(unit)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteUnit(unit.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {unit.description && (
                    <p className="text-sm text-muted-foreground">{unit.description}</p>
                  )}
                  <Badge variant="outline" className="mt-2">
                    {getDepartmentsByUnit(unit.id).length} {language === 'bn' ? 'বিভাগ' : 'departments'}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>

          {units.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                {language === 'bn' ? 'কোন ইউনিট নেই' : 'No units yet'}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Unit Dialog */}
      <Dialog open={unitDialog.open} onOpenChange={(open) => setUnitDialog({ ...unitDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {unitDialog.editing 
                ? (language === 'bn' ? 'ইউনিট সম্পাদনা' : 'Edit Unit')
                : (language === 'bn' ? 'নতুন ইউনিট' : 'Add Unit')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{language === 'bn' ? 'নাম' : 'Name'}</Label>
              <Input
                value={unitForm.name}
                onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
                placeholder={language === 'bn' ? 'ইউনিটের নাম' : 'Unit name'}
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'bn' ? 'বিবরণ' : 'Description'}</Label>
              <Textarea
                value={unitForm.description}
                onChange={(e) => setUnitForm({ ...unitForm, description: e.target.value })}
                placeholder={language === 'bn' ? 'ঐচ্ছিক বিবরণ' : 'Optional description'}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setUnitDialog({ open: false, editing: null })}>
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button onClick={handleSaveUnit}>
              {unitDialog.editing ? (language === 'bn' ? 'সংরক্ষণ' : 'Save') : (language === 'bn' ? 'যোগ করুন' : 'Add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Department Dialog */}
      <Dialog open={deptDialog.open} onOpenChange={(open) => setDeptDialog({ ...deptDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {deptDialog.editing 
                ? (language === 'bn' ? 'বিভাগ সম্পাদনা' : 'Edit Department')
                : (language === 'bn' ? 'নতুন বিভাগ' : 'Add Department')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{language === 'bn' ? 'ইউনিট' : 'Unit'}</Label>
              <Select value={deptForm.unit_id} onValueChange={(v) => setDeptForm({ ...deptForm, unit_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={language === 'bn' ? 'ইউনিট নির্বাচন করুন' : 'Select unit'} />
                </SelectTrigger>
                <SelectContent>
                  {units.map(unit => (
                    <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{language === 'bn' ? 'নাম' : 'Name'}</Label>
              <Input
                value={deptForm.name}
                onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                placeholder={language === 'bn' ? 'বিভাগের নাম' : 'Department name'}
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'bn' ? 'বিবরণ' : 'Description'}</Label>
              <Textarea
                value={deptForm.description}
                onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                placeholder={language === 'bn' ? 'ঐচ্ছিক বিবরণ' : 'Optional description'}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeptDialog({ open: false, editing: null })}>
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button onClick={handleSaveDept}>
              {deptDialog.editing ? (language === 'bn' ? 'সংরক্ষণ' : 'Save') : (language === 'bn' ? 'যোগ করুন' : 'Add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Support User Dialog */}
      <Dialog open={userDialog.open} onOpenChange={(open) => setUserDialog({ ...userDialog, open })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {userDialog.editing 
                ? (language === 'bn' ? 'ইউজার সম্পাদনা' : 'Edit User')
                : (language === 'bn' ? 'নতুন ইউজার' : 'Add User')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>{language === 'bn' ? 'বিভাগ' : 'Department'}</Label>
                <Select value={userForm.department_id} onValueChange={(v) => setUserForm({ ...userForm, department_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'bn' ? 'বিভাগ নির্বাচন করুন' : 'Select department'} />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map(unit => (
                      <div key={unit.id}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                          {unit.name}
                        </div>
                        {getDepartmentsByUnit(unit.id).map(dept => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 col-span-2">
                <Label>{language === 'bn' ? 'নাম' : 'Name'} *</Label>
                <Input
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  placeholder={language === 'bn' ? 'ইউজারের নাম' : 'User name'}
                />
              </div>

              <div className="space-y-2">
                <Label>{language === 'bn' ? 'পদবী' : 'Designation'}</Label>
                <Input
                  value={userForm.designation}
                  onChange={(e) => setUserForm({ ...userForm, designation: e.target.value })}
                  placeholder={language === 'bn' ? 'পদবী' : 'Designation'}
                />
              </div>

              <div className="space-y-2">
                <Label>{language === 'bn' ? 'ইমেইল' : 'Email'}</Label>
                <Input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label>{language === 'bn' ? 'ফোন' : 'Phone'}</Label>
                <Input
                  value={userForm.phone}
                  onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                  placeholder="+880..."
                />
              </div>

              <div className="space-y-2">
                <Label>{language === 'bn' ? 'আইপি অ্যাড্রেস' : 'IP Address'}</Label>
                <Input
                  value={userForm.ip_address}
                  onChange={(e) => setUserForm({ ...userForm, ip_address: e.target.value })}
                  placeholder="192.168.1.1"
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label>{language === 'bn' ? 'ডিভাইস তথ্য' : 'Device Info'}</Label>
                <Input
                  value={userForm.device_info}
                  onChange={(e) => setUserForm({ ...userForm, device_info: e.target.value })}
                  placeholder={language === 'bn' ? 'কম্পিউটার/ল্যাপটপ মডেল' : 'Computer/Laptop model'}
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label>{language === 'bn' ? 'নোট' : 'Notes'}</Label>
                <Textarea
                  value={userForm.notes}
                  onChange={(e) => setUserForm({ ...userForm, notes: e.target.value })}
                  placeholder={language === 'bn' ? 'অতিরিক্ত নোট' : 'Additional notes'}
                  rows={2}
                />
              </div>

              <div className="flex items-center gap-3 col-span-2">
                <Switch
                  checked={userForm.is_active}
                  onCheckedChange={(c) => setUserForm({ ...userForm, is_active: c })}
                />
                <Label>{language === 'bn' ? 'সক্রিয়' : 'Active'}</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setUserDialog({ open: false, editing: null })}>
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button onClick={handleSaveUser}>
              {userDialog.editing ? (language === 'bn' ? 'সংরক্ষণ' : 'Save') : (language === 'bn' ? 'যোগ করুন' : 'Add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
