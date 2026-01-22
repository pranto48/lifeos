import { useState, useEffect } from 'react';
import { 
  HardDrive, Plus, Pencil, Trash2, Search, Download, 
  Wrench, Calendar, DollarSign, User, Tag, 
  Package, FileText, AlertTriangle, CheckCircle, Clock,
  MoreVertical, Eye, Filter, Settings2, QrCode, Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDeviceInventory, DeviceInventory as DeviceType, DeviceServiceHistory, DeviceCategory } from '@/hooks/useDeviceInventory';
import { useSupportData, SupportUser } from '@/hooks/useSupportData';
import { DeviceQRCode } from '@/components/device/DeviceQRCode';
import { BulkDeviceAssign } from '@/components/device/BulkDeviceAssign';

const STATUS_OPTIONS = [
  { value: 'available', label: 'Available', labelBn: 'উপলব্ধ', color: 'bg-green-500/20 text-green-600' },
  { value: 'assigned', label: 'Assigned', labelBn: 'বরাদ্দকৃত', color: 'bg-blue-500/20 text-blue-600' },
  { value: 'maintenance', label: 'In Maintenance', labelBn: 'রক্ষণাবেক্ষণে', color: 'bg-yellow-500/20 text-yellow-600' },
  { value: 'retired', label: 'Retired', labelBn: 'অবসরপ্রাপ্ত', color: 'bg-gray-500/20 text-gray-600' },
  { value: 'disposed', label: 'Disposed', labelBn: 'বাতিল', color: 'bg-red-500/20 text-red-600' },
];

const SERVICE_TYPES = [
  { value: 'repair', label: 'Repair', labelBn: 'মেরামত' },
  { value: 'maintenance', label: 'Maintenance', labelBn: 'রক্ষণাবেক্ষণ' },
  { value: 'upgrade', label: 'Upgrade', labelBn: 'আপগ্রেড' },
  { value: 'cleaning', label: 'Cleaning', labelBn: 'পরিষ্কার' },
  { value: 'replacement', label: 'Part Replacement', labelBn: 'যন্ত্রাংশ প্রতিস্থাপন' },
  { value: 'other', label: 'Other', labelBn: 'অন্যান্য' },
];

interface SupportUserInfo {
  id: string;
  name: string;
  department_name: string;
  unit_name: string;
}

export default function DeviceInventoryPage() {
  const { language } = useLanguage();
  const {
    categories,
    devices,
    loading,
    isAdmin,
    addCategory,
    updateCategory,
    deleteCategory,
    addDevice,
    updateDevice,
    deleteDevice,
    getServiceHistory,
    addServiceRecord,
    deleteServiceRecord,
    reload,
  } = useDeviceInventory();

  const { supportUsers, departments, units } = useSupportData();

  // Search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSupportUser, setFilterSupportUser] = useState<string>('all');

  // Device dialog
  const [deviceDialog, setDeviceDialog] = useState<{ open: boolean; editing: DeviceType | null }>({ open: false, editing: null });
  const [deviceForm, setDeviceForm] = useState({
    device_name: '',
    device_number: '',
    serial_number: '',
    purchase_date: '',
    delivery_date: '',
    supplier_name: '',
    requisition_number: '',
    bod_number: '',
    warranty_date: '',
    price: '',
    bill_details: '',
    status: 'available',
    notes: '',
    category_id: '',
    support_user_id: '',
  });

  // Bulk assign dialog
  const [bulkAssignDialog, setBulkAssignDialog] = useState(false);

  // Category dialog
  const [categoryDialog, setCategoryDialog] = useState<{ open: boolean; editing: DeviceCategory | null }>({ open: false, editing: null });
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });

  // Service history dialog
  const [serviceDialog, setServiceDialog] = useState<{ open: boolean; device: DeviceType | null }>({ open: false, device: null });
  const [serviceHistory, setServiceHistory] = useState<DeviceServiceHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Add service dialog
  const [addServiceDialog, setAddServiceDialog] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    service_date: format(new Date(), 'yyyy-MM-dd'),
    service_type: 'maintenance',
    description: '',
    cost: '',
    technician_name: '',
    task_id: '',
  });

  // Quick assign dialog
  const [quickAssignDialog, setQuickAssignDialog] = useState<{ open: boolean; device: DeviceType | null }>({ open: false, device: null });
  const [quickAssignUserId, setQuickAssignUserId] = useState<string>('');

  // Tasks for linking
  const [availableTasks, setAvailableTasks] = useState<{ id: string; title: string }[]>([]);

  // Load tasks for service history linking
  useEffect(() => {
    const loadTasks = async () => {
      const { data } = await supabase
        .from('tasks')
        .select('id, title')
        .eq('task_type', 'office')
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) {
        setAvailableTasks(data);
      }
    };
    loadTasks();
  }, []);

  // Support user info map
  const supportUserMap: Record<string, SupportUserInfo> = {};
  supportUsers.forEach(su => {
    const dept = departments.find(d => d.id === su.department_id);
    const unit = dept ? units.find(u => u.id === dept.unit_id) : null;
    supportUserMap[su.id] = {
      id: su.id,
      name: su.name,
      department_name: dept?.name || 'N/A',
      unit_name: unit?.name || 'N/A',
    };
  });

  // Filter devices
  const filteredDevices = devices.filter(device => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = !query ||
      device.device_name.toLowerCase().includes(query) ||
      device.device_number?.toLowerCase().includes(query) ||
      device.serial_number?.toLowerCase().includes(query) ||
      device.supplier_name?.toLowerCase().includes(query) ||
      device.requisition_number?.toLowerCase().includes(query);

    if (!matchesSearch) return false;
    if (filterCategory !== 'all' && device.category_id !== filterCategory) return false;
    if (filterStatus !== 'all' && device.status !== filterStatus) return false;
    if (filterSupportUser !== 'all' && device.support_user_id !== filterSupportUser) return false;

    return true;
  });

  // Check warranty status
  const getWarrantyStatus = (warrantyDate: string | null) => {
    if (!warrantyDate) return null;
    const warranty = new Date(warrantyDate);
    const today = new Date();
    const warningDate = addDays(today, 30);

    if (isBefore(warranty, today)) {
      return { status: 'expired', label: language === 'bn' ? 'মেয়াদ উত্তীর্ণ' : 'Expired', color: 'bg-red-500/20 text-red-600' };
    }
    if (isBefore(warranty, warningDate)) {
      return { status: 'expiring', label: language === 'bn' ? 'শীঘ্রই শেষ' : 'Expiring Soon', color: 'bg-yellow-500/20 text-yellow-600' };
    }
    return { status: 'valid', label: language === 'bn' ? 'সক্রিয়' : 'Active', color: 'bg-green-500/20 text-green-600' };
  };

  // Device dialog handlers
  const openDeviceDialog = (device?: DeviceType) => {
    if (device) {
      setDeviceForm({
        device_name: device.device_name,
        device_number: (device as any).device_number || '',
        serial_number: device.serial_number || '',
        purchase_date: device.purchase_date || '',
        delivery_date: device.delivery_date || '',
        supplier_name: device.supplier_name || '',
        requisition_number: device.requisition_number || '',
        bod_number: device.bod_number || '',
        warranty_date: device.warranty_date || '',
        price: device.price?.toString() || '',
        bill_details: device.bill_details || '',
        status: device.status,
        notes: device.notes || '',
        category_id: device.category_id || '',
        support_user_id: device.support_user_id || '',
      });
      setDeviceDialog({ open: true, editing: device });
    } else {
      setDeviceForm({
        device_name: '',
        device_number: '',
        serial_number: '',
        purchase_date: '',
        delivery_date: '',
        supplier_name: '',
        requisition_number: '',
        bod_number: '',
        warranty_date: '',
        price: '',
        bill_details: '',
        status: 'available',
        notes: '',
        category_id: categories[0]?.id || '',
        support_user_id: '',
      });
      setDeviceDialog({ open: true, editing: null });
    }
  };

  const handleSaveDevice = async () => {
    if (!deviceForm.device_name.trim()) {
      toast.error(language === 'bn' ? 'ডিভাইসের নাম আবশ্যক' : 'Device name is required');
      return;
    }

    const data = {
      device_name: deviceForm.device_name.trim(),
      device_number: deviceForm.device_number || null,
      serial_number: deviceForm.serial_number || null,
      purchase_date: deviceForm.purchase_date || null,
      delivery_date: deviceForm.delivery_date || null,
      supplier_name: deviceForm.supplier_name || null,
      requisition_number: deviceForm.requisition_number || null,
      bod_number: deviceForm.bod_number || null,
      warranty_date: deviceForm.warranty_date || null,
      price: deviceForm.price ? parseFloat(deviceForm.price) : null,
      bill_details: deviceForm.bill_details || null,
      status: deviceForm.status,
      notes: deviceForm.notes || null,
      category_id: deviceForm.category_id || null,
      support_user_id: deviceForm.support_user_id || null,
    };

    try {
      if (deviceDialog.editing) {
        await updateDevice(deviceDialog.editing.id, data);
        toast.success(language === 'bn' ? 'ডিভাইস আপডেট হয়েছে' : 'Device updated');
      } else {
        await addDevice(data);
        toast.success(language === 'bn' ? 'ডিভাইস যোগ হয়েছে' : 'Device added');
      }
      setDeviceDialog({ open: false, editing: null });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteDevice = async (id: string) => {
    if (!confirm(language === 'bn' ? 'এই ডিভাইস মুছে ফেলতে চান?' : 'Delete this device?')) return;
    const success = await deleteDevice(id);
    if (success) {
      toast.success(language === 'bn' ? 'ডিভাইস মুছে ফেলা হয়েছে' : 'Device deleted');
    } else {
      toast.error(language === 'bn' ? 'মুছতে ব্যর্থ' : 'Failed to delete');
    }
  };

  // Category handlers
  const openCategoryDialog = (category?: DeviceCategory) => {
    if (category) {
      setCategoryForm({ name: category.name, description: category.description || '' });
      setCategoryDialog({ open: true, editing: category });
    } else {
      setCategoryForm({ name: '', description: '' });
      setCategoryDialog({ open: true, editing: null });
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast.error(language === 'bn' ? 'ক্যাটাগরি নাম আবশ্যক' : 'Category name is required');
      return;
    }

    try {
      if (categoryDialog.editing) {
        await updateCategory(categoryDialog.editing.id, categoryForm);
        toast.success(language === 'bn' ? 'ক্যাটাগরি আপডেট হয়েছে' : 'Category updated');
      } else {
        await addCategory(categoryForm.name, categoryForm.description);
        toast.success(language === 'bn' ? 'ক্যাটাগরি যোগ হয়েছে' : 'Category added');
      }
      setCategoryDialog({ open: false, editing: null });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm(language === 'bn' ? 'এই ক্যাটাগরি মুছে ফেলতে চান?' : 'Delete this category?')) return;
    const success = await deleteCategory(id);
    if (success) {
      toast.success(language === 'bn' ? 'ক্যাটাগরি মুছে ফেলা হয়েছে' : 'Category deleted');
    } else {
      toast.error(language === 'bn' ? 'মুছতে ব্যর্থ' : 'Failed to delete');
    }
  };

  // Service history handlers
  const openServiceDialog = async (device: DeviceType) => {
    setServiceDialog({ open: true, device });
    setLoadingHistory(true);
    const history = await getServiceHistory(device.id);
    setServiceHistory(history);
    setLoadingHistory(false);
  };

  const handleAddService = async () => {
    if (!serviceDialog.device || !serviceForm.service_date || !serviceForm.service_type) {
      toast.error(language === 'bn' ? 'তারিখ ও ধরন আবশ্যক' : 'Date and type are required');
      return;
    }

    const record = await addServiceRecord({
      device_id: serviceDialog.device.id,
      service_date: serviceForm.service_date,
      service_type: serviceForm.service_type,
      description: serviceForm.description || null,
      cost: serviceForm.cost ? parseFloat(serviceForm.cost) : null,
      technician_name: serviceForm.technician_name || null,
      task_id: serviceForm.task_id || null,
    });

    if (record) {
      setServiceHistory(prev => [record, ...prev]);
      toast.success(language === 'bn' ? 'সার্ভিস রেকর্ড যোগ হয়েছে' : 'Service record added');
      setAddServiceDialog(false);
      setServiceForm({
        service_date: format(new Date(), 'yyyy-MM-dd'),
        service_type: 'maintenance',
        description: '',
        cost: '',
        technician_name: '',
        task_id: '',
      });
    } else {
      toast.error(language === 'bn' ? 'যোগ করতে ব্যর্থ' : 'Failed to add');
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm(language === 'bn' ? 'এই রেকর্ড মুছে ফেলতে চান?' : 'Delete this record?')) return;
    const success = await deleteServiceRecord(id);
    if (success) {
      setServiceHistory(prev => prev.filter(s => s.id !== id));
      toast.success(language === 'bn' ? 'রেকর্ড মুছে ফেলা হয়েছে' : 'Record deleted');
    }
  };

  // Quick assign handler
  const handleQuickAssign = async () => {
    if (!quickAssignDialog.device) return;
    
    const success = await updateDevice(quickAssignDialog.device.id, {
      support_user_id: quickAssignUserId || null,
      status: quickAssignUserId ? 'assigned' : 'available',
    });
    
    if (success) {
      toast.success(language === 'bn' ? 'ডিভাইস বরাদ্দ হয়েছে' : 'Device assigned');
      setQuickAssignDialog({ open: false, device: null });
      setQuickAssignUserId('');
    } else {
      toast.error(language === 'bn' ? 'বরাদ্দ করতে ব্যর্থ' : 'Failed to assign');
    }
  };

  const openQuickAssignDialog = (device: DeviceType) => {
    setQuickAssignUserId(device.support_user_id || '');
    setQuickAssignDialog({ open: true, device });
  };

  // Bulk assign handler
  const handleBulkAssign = async (deviceIds: string[], userId: string | null): Promise<boolean> => {
    try {
      for (const deviceId of deviceIds) {
        await updateDevice(deviceId, {
          support_user_id: userId,
          status: userId ? 'assigned' : 'available',
        });
      }
      reload();
      return true;
    } catch (error) {
      return false;
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Device Name', 'Serial Number', 'Category', 'Status', 'Purchase Date', 'Delivery Date', 'Supplier', 'Requisition No', 'BOD No', 'Warranty Date', 'Price', 'Assigned To', 'Notes'];
    const rows = filteredDevices.map(device => {
      const category = categories.find(c => c.id === device.category_id);
      const supportUser = device.support_user_id ? supportUserMap[device.support_user_id] : null;
      return [
        device.device_name,
        device.serial_number || '',
        category?.name || '',
        STATUS_OPTIONS.find(s => s.value === device.status)?.label || device.status,
        device.purchase_date || '',
        device.delivery_date || '',
        device.supplier_name || '',
        device.requisition_number || '',
        device.bod_number || '',
        device.warranty_date || '',
        device.price?.toString() || '',
        supportUser?.name || '',
        device.notes || '',
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `device_inventory_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success(language === 'bn' ? 'CSV ডাউনলোড হয়েছে' : 'CSV downloaded');
  };

  // Stats
  const stats = {
    total: devices.length,
    available: devices.filter(d => d.status === 'available').length,
    assigned: devices.filter(d => d.status === 'assigned').length,
    maintenance: devices.filter(d => d.status === 'maintenance').length,
    expiringWarranty: devices.filter(d => {
      const status = getWarrantyStatus(d.warranty_date);
      return status?.status === 'expiring';
    }).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">{language === 'bn' ? 'লোড হচ্ছে...' : 'Loading...'}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <HardDrive className="h-5 w-5 md:h-6 md:w-6" />
            {language === 'bn' ? 'ডিভাইস ইনভেন্টরি' : 'Device Inventory'}
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            {language === 'bn' ? 'আপনার সকল ডিভাইস পরিচালনা করুন' : 'Manage all your devices'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">{language === 'bn' ? 'রপ্তানি' : 'Export'}</span>
          </Button>
          {isAdmin && (
            <>
              <Button variant="outline" size="sm" onClick={() => setBulkAssignDialog(true)}>
                <Users className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">{language === 'bn' ? 'ব্যাচ বরাদ্দ' : 'Bulk Assign'}</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => openCategoryDialog()}>
                <Tag className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">{language === 'bn' ? 'ক্যাটাগরি' : 'Category'}</span>
              </Button>
              <Button size="sm" onClick={() => openDeviceDialog()}>
                <Plus className="h-4 w-4 mr-1" />
                {language === 'bn' ? 'ডিভাইস যোগ' : 'Add Device'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 md:gap-4">
        <Card className="bg-card">
          <CardContent className="p-3 md:p-4 text-center">
            <div className="text-lg md:text-2xl font-bold text-foreground">{stats.total}</div>
            <div className="text-[10px] md:text-xs text-muted-foreground">{language === 'bn' ? 'মোট ডিভাইস' : 'Total Devices'}</div>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="p-3 md:p-4 text-center">
            <div className="text-lg md:text-2xl font-bold text-green-600">{stats.available}</div>
            <div className="text-[10px] md:text-xs text-muted-foreground">{language === 'bn' ? 'উপলব্ধ' : 'Available'}</div>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-3 md:p-4 text-center">
            <div className="text-lg md:text-2xl font-bold text-blue-600">{stats.assigned}</div>
            <div className="text-[10px] md:text-xs text-muted-foreground">{language === 'bn' ? 'বরাদ্দকৃত' : 'Assigned'}</div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-500/10 border-yellow-500/20">
          <CardContent className="p-3 md:p-4 text-center">
            <div className="text-lg md:text-2xl font-bold text-yellow-600">{stats.maintenance}</div>
            <div className="text-[10px] md:text-xs text-muted-foreground">{language === 'bn' ? 'রক্ষণাবেক্ষণে' : 'Maintenance'}</div>
          </CardContent>
        </Card>
        <Card className="bg-orange-500/10 border-orange-500/20">
          <CardContent className="p-3 md:p-4 text-center">
            <div className="text-lg md:text-2xl font-bold text-orange-600">{stats.expiringWarranty}</div>
            <div className="text-[10px] md:text-xs text-muted-foreground">{language === 'bn' ? 'ওয়ারেন্টি শেষ' : 'Warranty Expiring'}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="bg-card">
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={language === 'bn' ? 'ডিভাইস খুঁজুন...' : 'Search devices...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full sm:w-[150px] h-9 text-sm">
                <SelectValue placeholder={language === 'bn' ? 'ক্যাটাগরি' : 'Category'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'bn' ? 'সব ক্যাটাগরি' : 'All Categories'}</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[140px] h-9 text-sm">
                <SelectValue placeholder={language === 'bn' ? 'স্ট্যাটাস' : 'Status'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'bn' ? 'সব স্ট্যাটাস' : 'All Status'}</SelectItem>
                {STATUS_OPTIONS.map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    {language === 'bn' ? status.labelBn : status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterSupportUser} onValueChange={setFilterSupportUser}>
              <SelectTrigger className="w-full sm:w-[150px] h-9 text-sm">
                <SelectValue placeholder={language === 'bn' ? 'ব্যবহারকারী' : 'User'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'bn' ? 'সব ব্যবহারকারী' : 'All Users'}</SelectItem>
                {supportUsers.filter(u => u.is_active).map(user => (
                  <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Devices Table */}
      <Card className="bg-card">
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">{language === 'bn' ? 'ডিভাইস' : 'Device'}</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">{language === 'bn' ? 'সিরিয়াল' : 'Serial'}</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">{language === 'bn' ? 'ক্যাটাগরি' : 'Category'}</TableHead>
                  <TableHead className="text-xs">{language === 'bn' ? 'স্ট্যাটাস' : 'Status'}</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">{language === 'bn' ? 'বরাদ্দ' : 'Assigned'}</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">{language === 'bn' ? 'ওয়ারেন্টি' : 'Warranty'}</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">{language === 'bn' ? 'মূল্য' : 'Price'}</TableHead>
                  <TableHead className="text-xs w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDevices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      <HardDrive className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      {language === 'bn' ? 'কোন ডিভাইস পাওয়া যায়নি' : 'No devices found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDevices.map(device => {
                    const category = categories.find(c => c.id === device.category_id);
                    const status = STATUS_OPTIONS.find(s => s.value === device.status);
                    const warranty = getWarrantyStatus(device.warranty_date);
                    const supportUser = device.support_user_id ? supportUserMap[device.support_user_id] : null;

                    return (
                      <TableRow key={device.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <DeviceQRCode device={device} />
                            <div>
                              <div className="font-medium text-xs md:text-sm">{device.device_name}</div>
                              <div className="text-[10px] md:text-xs text-muted-foreground">
                                {device.device_number && <span className="mr-2">#{device.device_number}</span>}
                                <span className="md:hidden">{device.serial_number || ''}</span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs hidden md:table-cell">
                          {device.serial_number || '-'}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {category && (
                            <Badge variant="outline" className="text-[10px] md:text-xs">
                              {category.name}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-[10px] md:text-xs ${status?.color}`}>
                            {language === 'bn' ? status?.labelBn : status?.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {supportUser ? (
                            <div className="text-xs">
                              <div className="font-medium">{supportUser.name}</div>
                              <div className="text-muted-foreground text-[10px]">{supportUser.department_name}</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {warranty ? (
                            <div>
                              <Badge className={`text-[10px] ${warranty.color}`}>
                                {warranty.label}
                              </Badge>
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                {format(new Date(device.warranty_date!), 'dd/MM/yyyy')}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {device.price ? (
                            <span className="text-xs font-medium">৳{device.price.toLocaleString()}</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {isAdmin && (
                                <>
                                  <DropdownMenuItem onClick={() => openDeviceDialog(device)}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    {language === 'bn' ? 'সম্পাদনা' : 'Edit'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openQuickAssignDialog(device)}>
                                    <User className="h-4 w-4 mr-2" />
                                    {language === 'bn' ? 'দ্রুত বরাদ্দ' : 'Quick Assign'}
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuItem onClick={() => openServiceDialog(device)}>
                                <Wrench className="h-4 w-4 mr-2" />
                                {language === 'bn' ? 'সার্ভিস ইতিহাস' : 'Service History'}
                              </DropdownMenuItem>
                              {isAdmin && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteDevice(device.id)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {language === 'bn' ? 'মুছুন' : 'Delete'}
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Device Dialog */}
      <Dialog open={deviceDialog.open} onOpenChange={(open) => setDeviceDialog({ open, editing: null })}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {deviceDialog.editing 
                ? (language === 'bn' ? 'ডিভাইস সম্পাদনা' : 'Edit Device')
                : (language === 'bn' ? 'নতুন ডিভাইস যোগ করুন' : 'Add New Device')
              }
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Device Name */}
            <div className="space-y-2">
              <Label className="text-xs">{language === 'bn' ? 'ডিভাইসের নাম' : 'Device Name'} *</Label>
              <Input
                value={deviceForm.device_name}
                onChange={(e) => setDeviceForm({ ...deviceForm, device_name: e.target.value })}
                placeholder={language === 'bn' ? 'ল্যাপটপ HP ProBook 450' : 'Laptop HP ProBook 450'}
                className="text-sm"
              />
            </div>

            {/* Device Number */}
            <div className="space-y-2">
              <Label className="text-xs">{language === 'bn' ? 'ডিভাইস নম্বর' : 'Device Number'}</Label>
              <Input
                value={deviceForm.device_number}
                onChange={(e) => setDeviceForm({ ...deviceForm, device_number: e.target.value })}
                placeholder={language === 'bn' ? 'DEV-001' : 'DEV-001'}
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">{language === 'bn' ? 'সিরিয়াল নম্বর' : 'Serial Number'}</Label>
              <Input
                value={deviceForm.serial_number}
                onChange={(e) => setDeviceForm({ ...deviceForm, serial_number: e.target.value })}
                className="text-sm"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label className="text-xs">{language === 'bn' ? 'ক্যাটাগরি' : 'Category'}</Label>
              <Select value={deviceForm.category_id} onValueChange={(v) => setDeviceForm({ ...deviceForm, category_id: v })}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder={language === 'bn' ? 'ক্যাটাগরি নির্বাচন করুন' : 'Select category'} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label className="text-xs">{language === 'bn' ? 'স্ট্যাটাস' : 'Status'}</Label>
              <Select value={deviceForm.status} onValueChange={(v) => setDeviceForm({ ...deviceForm, status: v })}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {language === 'bn' ? status.labelBn : status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Assigned To */}
            <div className="space-y-2">
              <Label className="text-xs">{language === 'bn' ? 'বরাদ্দ' : 'Assigned To'}</Label>
              <Select value={deviceForm.support_user_id || "none"} onValueChange={(v) => setDeviceForm({ ...deviceForm, support_user_id: v === "none" ? "" : v })}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder={language === 'bn' ? 'ব্যবহারকারী নির্বাচন' : 'Select user'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{language === 'bn' ? 'কেউ নয়' : 'None'}</SelectItem>
                  {supportUsers.filter(u => u.is_active).map(user => (
                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Purchase Date */}
            <div className="space-y-2">
              <Label className="text-xs">{language === 'bn' ? 'ক্রয়ের তারিখ' : 'Purchase Date'}</Label>
              <Input
                type="date"
                value={deviceForm.purchase_date}
                onChange={(e) => setDeviceForm({ ...deviceForm, purchase_date: e.target.value })}
                className="text-sm"
              />
            </div>

            {/* Delivery Date */}
            <div className="space-y-2">
              <Label className="text-xs">{language === 'bn' ? 'ডেলিভারি তারিখ' : 'Delivery Date'}</Label>
              <Input
                type="date"
                value={deviceForm.delivery_date}
                onChange={(e) => setDeviceForm({ ...deviceForm, delivery_date: e.target.value })}
                className="text-sm"
              />
            </div>

            {/* Supplier Name */}
            <div className="space-y-2">
              <Label className="text-xs">{language === 'bn' ? 'সরবরাহকারীর নাম' : 'Supplier Name'}</Label>
              <Input
                value={deviceForm.supplier_name}
                onChange={(e) => setDeviceForm({ ...deviceForm, supplier_name: e.target.value })}
                className="text-sm"
              />
            </div>

            {/* Requisition Number */}
            <div className="space-y-2">
              <Label className="text-xs">{language === 'bn' ? 'রিকুইজিশন নম্বর' : 'Requisition Number'}</Label>
              <Input
                value={deviceForm.requisition_number}
                onChange={(e) => setDeviceForm({ ...deviceForm, requisition_number: e.target.value })}
                className="text-sm"
              />
            </div>

            {/* BOD Number */}
            <div className="space-y-2">
              <Label className="text-xs">{language === 'bn' ? 'BOD নম্বর' : 'BOD Number'}</Label>
              <Input
                value={deviceForm.bod_number}
                onChange={(e) => setDeviceForm({ ...deviceForm, bod_number: e.target.value })}
                className="text-sm"
              />
            </div>

            {/* Warranty Date */}
            <div className="space-y-2">
              <Label className="text-xs">{language === 'bn' ? 'ওয়ারেন্টি তারিখ' : 'Warranty Date'}</Label>
              <Input
                type="date"
                value={deviceForm.warranty_date}
                onChange={(e) => setDeviceForm({ ...deviceForm, warranty_date: e.target.value })}
                className="text-sm"
              />
            </div>

            {/* Price */}
            <div className="space-y-2">
              <Label className="text-xs">{language === 'bn' ? 'মূল্য (৳)' : 'Price (৳)'}</Label>
              <Input
                type="number"
                value={deviceForm.price}
                onChange={(e) => setDeviceForm({ ...deviceForm, price: e.target.value })}
                className="text-sm"
              />
            </div>

            {/* Bill Details */}
            <div className="space-y-2 md:col-span-2">
              <Label className="text-xs">{language === 'bn' ? 'বিল বিবরণ' : 'Bill Details'}</Label>
              <Textarea
                value={deviceForm.bill_details}
                onChange={(e) => setDeviceForm({ ...deviceForm, bill_details: e.target.value })}
                placeholder={language === 'bn' ? 'বিল নম্বর, তারিখ ইত্যাদি' : 'Bill number, date, etc.'}
                className="text-sm"
                rows={2}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2 md:col-span-2">
              <Label className="text-xs">{language === 'bn' ? 'নোট' : 'Notes'}</Label>
              <Textarea
                value={deviceForm.notes}
                onChange={(e) => setDeviceForm({ ...deviceForm, notes: e.target.value })}
                className="text-sm"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeviceDialog({ open: false, editing: null })}>
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button onClick={handleSaveDevice}>
              {deviceDialog.editing 
                ? (language === 'bn' ? 'আপডেট করুন' : 'Update')
                : (language === 'bn' ? 'যোগ করুন' : 'Add')
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={categoryDialog.open} onOpenChange={(open) => setCategoryDialog({ open, editing: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {categoryDialog.editing 
                ? (language === 'bn' ? 'ক্যাটাগরি সম্পাদনা' : 'Edit Category')
                : (language === 'bn' ? 'নতুন ক্যাটাগরি' : 'New Category')
              }
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">{language === 'bn' ? 'নাম' : 'Name'} *</Label>
              <Input
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder={language === 'bn' ? 'ল্যাপটপ, ডেস্কটপ, প্রিন্টার' : 'Laptop, Desktop, Printer'}
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">{language === 'bn' ? 'বিবরণ' : 'Description'}</Label>
              <Textarea
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                className="text-sm"
                rows={2}
              />
            </div>

            {/* Existing Categories */}
            {categories.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs">{language === 'bn' ? 'বিদ্যমান ক্যাটাগরি' : 'Existing Categories'}</Label>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {categories.map(cat => (
                    <div key={cat.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                      <span className="text-sm">{cat.name}</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                          setCategoryForm({ name: cat.name, description: cat.description || '' });
                          setCategoryDialog({ open: true, editing: cat });
                        }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteCategory(cat.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialog({ open: false, editing: null })}>
              {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
            </Button>
            <Button onClick={handleSaveCategory} disabled={!categoryForm.name.trim()}>
              {categoryDialog.editing 
                ? (language === 'bn' ? 'আপডেট' : 'Update')
                : (language === 'bn' ? 'যোগ করুন' : 'Add')
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Service History Dialog */}
      <Dialog open={serviceDialog.open} onOpenChange={(open) => setServiceDialog({ open, device: null })}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              {language === 'bn' ? 'সার্ভিস ইতিহাস' : 'Service History'}
              {serviceDialog.device && (
                <Badge variant="outline" className="ml-2">{serviceDialog.device.device_name}</Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Button size="sm" onClick={() => setAddServiceDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              {language === 'bn' ? 'সার্ভিস যোগ করুন' : 'Add Service Record'}
            </Button>

            {loadingHistory ? (
              <div className="text-center py-8 text-muted-foreground">
                {language === 'bn' ? 'লোড হচ্ছে...' : 'Loading...'}
              </div>
            ) : serviceHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wrench className="h-12 w-12 mx-auto mb-2 opacity-30" />
                {language === 'bn' ? 'কোন সার্ভিস রেকর্ড নেই' : 'No service records yet'}
              </div>
            ) : (
              <div className="space-y-3">
                {serviceHistory.map(record => {
                  const serviceType = SERVICE_TYPES.find(s => s.value === record.service_type);
                  const linkedTask = availableTasks.find(t => t.id === record.task_id);
                  
                  return (
                    <Card key={record.id} className="bg-muted/30">
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {language === 'bn' ? serviceType?.labelBn : serviceType?.label}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(record.service_date), 'dd/MM/yyyy')}
                              </span>
                            </div>
                            {record.description && (
                              <p className="text-sm">{record.description}</p>
                            )}
                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                              {record.technician_name && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {record.technician_name}
                                </span>
                              )}
                              {record.cost && (
                                <span className="flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  ৳{record.cost.toLocaleString()}
                                </span>
                              )}
                              {linkedTask && (
                                <span className="flex items-center gap-1 text-primary">
                                  <FileText className="h-3 w-3" />
                                  {linkedTask.title}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-destructive"
                            onClick={() => handleDeleteService(record.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Service Record Dialog */}
      <Dialog open={addServiceDialog} onOpenChange={setAddServiceDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {language === 'bn' ? 'সার্ভিস রেকর্ড যোগ করুন' : 'Add Service Record'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">{language === 'bn' ? 'তারিখ' : 'Date'} *</Label>
                <Input
                  type="date"
                  value={serviceForm.service_date}
                  onChange={(e) => setServiceForm({ ...serviceForm, service_date: e.target.value })}
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">{language === 'bn' ? 'ধরন' : 'Type'} *</Label>
                <Select value={serviceForm.service_type} onValueChange={(v) => setServiceForm({ ...serviceForm, service_type: v })}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {language === 'bn' ? type.labelBn : type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">{language === 'bn' ? 'বিবরণ' : 'Description'}</Label>
              <Textarea
                value={serviceForm.description}
                onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                className="text-sm"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">{language === 'bn' ? 'টেকনিশিয়ান' : 'Technician'}</Label>
                <Input
                  value={serviceForm.technician_name}
                  onChange={(e) => setServiceForm({ ...serviceForm, technician_name: e.target.value })}
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">{language === 'bn' ? 'খরচ (৳)' : 'Cost (৳)'}</Label>
                <Input
                  type="number"
                  value={serviceForm.cost}
                  onChange={(e) => setServiceForm({ ...serviceForm, cost: e.target.value })}
                  className="text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">{language === 'bn' ? 'লিংকড টাস্ক' : 'Link to Task'}</Label>
              <Select value={serviceForm.task_id || "none"} onValueChange={(v) => setServiceForm({ ...serviceForm, task_id: v === "none" ? "" : v })}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder={language === 'bn' ? 'টাস্ক নির্বাচন (ঐচ্ছিক)' : 'Select task (optional)'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{language === 'bn' ? 'কোন টাস্ক নয়' : 'No task'}</SelectItem>
                  {availableTasks.map(task => (
                    <SelectItem key={task.id} value={task.id}>{task.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddServiceDialog(false)}>
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button onClick={handleAddService}>
              {language === 'bn' ? 'যোগ করুন' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Assign Dialog */}
      <Dialog open={quickAssignDialog.open} onOpenChange={(open) => setQuickAssignDialog({ open, device: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {language === 'bn' ? 'ডিভাইস বরাদ্দ করুন' : 'Assign Device'}
            </DialogTitle>
            <DialogDescription>
              {quickAssignDialog.device?.device_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">{language === 'bn' ? 'সাপোর্ট ইউজার নির্বাচন করুন' : 'Select Support User'}</Label>
              <Select value={quickAssignUserId || "none"} onValueChange={(v) => setQuickAssignUserId(v === "none" ? "" : v)}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder={language === 'bn' ? 'ব্যবহারকারী নির্বাচন করুন' : 'Select user'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{language === 'bn' ? 'কেউ নয় (উপলব্ধ)' : 'None (Available)'}</SelectItem>
                  {supportUsers.filter(u => u.is_active).map(user => {
                    const dept = departments.find(d => d.id === user.department_id);
                    const unit = dept ? units.find(u => u.id === dept.unit_id) : null;
                    return (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex flex-col">
                          <span>{user.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {unit?.name} → {dept?.name}
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickAssignDialog({ open: false, device: null })}>
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button onClick={handleQuickAssign}>
              {language === 'bn' ? 'বরাদ্দ করুন' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Assign Dialog */}
      <BulkDeviceAssign
        open={bulkAssignDialog}
        onOpenChange={setBulkAssignDialog}
        devices={devices}
        supportUsers={supportUsers}
        onAssign={handleBulkAssign}
      />
    </div>
  );
}
