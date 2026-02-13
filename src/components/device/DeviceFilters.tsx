import { useState, useMemo } from 'react';
import { Search, Filter, Building2, Users, Truck, Tag, Activity, X, Cpu, MemoryStick, HardDrive } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface FilterState {
  searchQuery: string;
  category: string;
  status: string;
  unitLocation: string;
  department: string;
  supportUser: string;
  supplier: string;
  ramType: string;
  storageType: string;
  processorGen: string;
}

interface DeviceSupplier {
  id: string;
  name: string;
  is_active: boolean;
}

interface DeviceFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  categories: { id: string; name: string }[];
  units: { id: string; name: string }[];
  departments: { id: string; name: string; unit_id: string }[];
  supportUsers: { id: string; name: string; department_id: string; is_active: boolean }[];
  suppliers: DeviceSupplier[];
  statusOptions: { value: string; label: string; labelBn: string }[];
}

export function DeviceFilters({
  filters,
  onFiltersChange,
  categories,
  units,
  departments,
  supportUsers,
  suppliers,
  statusOptions,
}: DeviceFiltersProps) {
  const { language } = useLanguage();
  const isMobile = useIsMobile();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Cascading filter logic
  const filteredDepartments = useMemo(() => {
    if (filters.unitLocation === 'all') return departments;
    return departments.filter(d => d.unit_id === filters.unitLocation);
  }, [departments, filters.unitLocation]);

  const filteredUsers = useMemo(() => {
    let users = supportUsers.filter(u => u.is_active);
    if (filters.department !== 'all') {
      users = users.filter(u => u.department_id === filters.department);
    } else if (filters.unitLocation !== 'all') {
      const deptIds = filteredDepartments.map(d => d.id);
      users = users.filter(u => deptIds.includes(u.department_id));
    }
    return users;
  }, [supportUsers, filters.department, filters.unitLocation, filteredDepartments]);

  const updateFilter = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    
    // Reset cascading filters when parent changes
    if (key === 'unitLocation') {
      newFilters.department = 'all';
      newFilters.supportUser = 'all';
    } else if (key === 'department') {
      newFilters.supportUser = 'all';
    }
    
    onFiltersChange(newFilters);
  };

  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) => key !== 'searchQuery' && value !== 'all' && value !== ''
  ).length;

  const clearAllFilters = () => {
    onFiltersChange({
      searchQuery: filters.searchQuery,
      category: 'all',
      status: 'all',
      unitLocation: 'all',
      department: 'all',
      supportUser: 'all',
      supplier: 'all',
      ramType: 'all',
      storageType: 'all',
      processorGen: 'all',
    });
  };

  const RAM_TYPES = [
    { value: 'ddr3', label: 'DDR3' },
    { value: 'ddr4', label: 'DDR4' },
    { value: 'ddr5', label: 'DDR5' },
  ];

  const STORAGE_TYPES = [
    { value: 'nvme', label: 'NVMe SSD' },
    { value: 'sata_ssd', label: 'SATA SSD' },
    { value: 'hdd', label: 'HDD' },
  ];

  const PROCESSOR_GENS = [
    { value: 'gen8', label: '8th Gen' },
    { value: 'gen9', label: '9th Gen' },
    { value: 'gen10', label: '10th Gen' },
    { value: 'gen11', label: '11th Gen' },
    { value: 'gen12', label: '12th Gen' },
    { value: 'gen13', label: '13th Gen' },
    { value: 'gen14', label: '14th Gen' },
    { value: 'ryzen3', label: 'Ryzen 3' },
    { value: 'ryzen5', label: 'Ryzen 5' },
    { value: 'ryzen7', label: 'Ryzen 7' },
    { value: 'ryzen9', label: 'Ryzen 9' },
    { value: 'apple_m1', label: 'Apple M1' },
    { value: 'apple_m2', label: 'Apple M2' },
    { value: 'apple_m3', label: 'Apple M3' },
    { value: 'apple_m4', label: 'Apple M4' },
  ];

  const FilterContent = () => (
    <motion.div 
      className="space-y-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Primary Filters */}
      <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:gap-2">
        {/* Category */}
        <Select value={filters.category} onValueChange={(v) => updateFilter('category', v)}>
          <SelectTrigger className="w-full md:w-[140px] h-9 text-sm group">
            <motion.div className="flex items-center gap-1.5" whileHover={{ scale: 1.02 }}>
              <Tag className="h-3.5 w-3.5 text-primary transition-transform group-hover:rotate-12" />
              <SelectValue placeholder={language === 'bn' ? 'ক্যাটাগরি' : 'Category'} />
            </motion.div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{language === 'bn' ? 'সব ক্যাটাগরি' : 'All Categories'}</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status */}
        <Select value={filters.status} onValueChange={(v) => updateFilter('status', v)}>
          <SelectTrigger className="w-full md:w-[130px] h-9 text-sm group">
            <motion.div className="flex items-center gap-1.5" whileHover={{ scale: 1.02 }}>
              <Activity className="h-3.5 w-3.5 text-primary transition-transform group-hover:animate-pulse" />
              <SelectValue placeholder={language === 'bn' ? 'স্ট্যাটাস' : 'Status'} />
            </motion.div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{language === 'bn' ? 'সব স্ট্যাটাস' : 'All Status'}</SelectItem>
            {statusOptions.map(status => (
              <SelectItem key={status.value} value={status.value}>
                {language === 'bn' ? status.labelBn : status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Unit Location */}
        <Select value={filters.unitLocation} onValueChange={(v) => updateFilter('unitLocation', v)}>
          <SelectTrigger className="w-full md:w-[130px] h-9 text-sm group">
            <motion.div className="flex items-center gap-1.5" whileHover={{ scale: 1.02 }}>
              <Building2 className="h-3.5 w-3.5 text-primary transition-transform group-hover:scale-110" />
              <SelectValue placeholder={language === 'bn' ? 'ইউনিট' : 'Unit'} />
            </motion.div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{language === 'bn' ? 'সব ইউনিট' : 'All Units'}</SelectItem>
            {units.map(unit => (
              <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Supplier */}
        <Select value={filters.supplier} onValueChange={(v) => updateFilter('supplier', v)}>
          <SelectTrigger className="w-full md:w-[140px] h-9 text-sm group">
            <motion.div className="flex items-center gap-1.5" whileHover={{ scale: 1.02 }}>
              <Truck className="h-3.5 w-3.5 text-primary transition-transform group-hover:translate-x-1" />
              <SelectValue placeholder={language === 'bn' ? 'সাপ্লায়ার' : 'Supplier'} />
            </motion.div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{language === 'bn' ? 'সব সাপ্লায়ার' : 'All Suppliers'}</SelectItem>
            {suppliers.filter(s => s.is_active).map(supplier => (
              <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Hardware Specs Filters */}
      <div className="grid grid-cols-3 gap-2 md:flex md:flex-wrap md:gap-2">
        {/* RAM Type */}
        <Select value={filters.ramType} onValueChange={(v) => updateFilter('ramType', v)}>
          <SelectTrigger className="w-full md:w-[120px] h-9 text-sm group">
            <motion.div className="flex items-center gap-1.5" whileHover={{ scale: 1.02 }}>
              <MemoryStick className="h-3.5 w-3.5 text-primary" />
              <SelectValue placeholder="RAM" />
            </motion.div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{language === 'bn' ? 'সব RAM' : 'All RAM'}</SelectItem>
            {RAM_TYPES.map(r => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Storage Type */}
        <Select value={filters.storageType} onValueChange={(v) => updateFilter('storageType', v)}>
          <SelectTrigger className="w-full md:w-[130px] h-9 text-sm group">
            <motion.div className="flex items-center gap-1.5" whileHover={{ scale: 1.02 }}>
              <HardDrive className="h-3.5 w-3.5 text-primary" />
              <SelectValue placeholder="Storage" />
            </motion.div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{language === 'bn' ? 'সব স্টোরেজ' : 'All Storage'}</SelectItem>
            {STORAGE_TYPES.map(s => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Processor Generation */}
        <Select value={filters.processorGen} onValueChange={(v) => updateFilter('processorGen', v)}>
          <SelectTrigger className="w-full md:w-[140px] h-9 text-sm group">
            <motion.div className="flex items-center gap-1.5" whileHover={{ scale: 1.02 }}>
              <Cpu className="h-3.5 w-3.5 text-primary" />
              <SelectValue placeholder="Processor" />
            </motion.div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{language === 'bn' ? 'সব প্রসেসর' : 'All Processors'}</SelectItem>
            {PROCESSOR_GENS.map(p => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cascading User Filter - Advanced */}
      <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-between text-xs text-muted-foreground hover:text-foreground"
          >
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {language === 'bn' ? 'ব্যবহারকারী ফিল্টার' : 'User Filter'}
            </span>
            <motion.span
              animate={{ rotate: showAdvanced ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              ▼
            </motion.span>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <motion.div 
            className="grid grid-cols-2 gap-2 pt-2"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Select 
              value={filters.department} 
              onValueChange={(v) => updateFilter('department', v)}
              disabled={filters.unitLocation === 'all' && departments.length === 0}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder={language === 'bn' ? 'বিভাগ' : 'Department'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'bn' ? 'সব বিভাগ' : 'All Departments'}</SelectItem>
                {filteredDepartments.map(dept => (
                  <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              value={filters.supportUser} 
              onValueChange={(v) => updateFilter('supportUser', v)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder={language === 'bn' ? 'ব্যবহারকারী' : 'User'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'bn' ? 'সব ব্যবহারকারী' : 'All Users'}</SelectItem>
                {filteredUsers.map(user => (
                  <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </motion.div>
        </CollapsibleContent>
      </Collapsible>

      {/* Active Filters Display */}
      <AnimatePresence>
        {activeFilterCount > 0 && (
          <motion.div 
            className="flex flex-wrap items-center gap-2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <span className="text-xs text-muted-foreground">
              {language === 'bn' ? 'সক্রিয় ফিল্টার:' : 'Active filters:'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-6 px-2 text-xs text-destructive hover:text-destructive"
            >
              <X className="h-3 w-3 mr-1" />
              {language === 'bn' ? 'সব মুছুন' : 'Clear all'}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  if (isMobile) {
    return (
      <div className="space-y-2">
        {/* Mobile Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={language === 'bn' ? 'ডিভাইস খুঁজুন...' : 'Search devices...'}
              value={filters.searchQuery}
              onChange={(e) => updateFilter('searchQuery', e.target.value)}
              className="pl-9 h-10 text-sm"
            />
          </div>
          <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-10 w-10 relative">
                <motion.div whileTap={{ scale: 0.9 }}>
                  <Filter className="h-4 w-4" />
                </motion.div>
                {activeFilterCount > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1"
                  >
                    <Badge className="h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-primary">
                      {activeFilterCount}
                    </Badge>
                  </motion.div>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[70vh]">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  {language === 'bn' ? 'ফিল্টার' : 'Filters'}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <FilterContent />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Desktop Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <motion.div
            className="absolute left-3 top-1/2 -translate-y-1/2"
            whileHover={{ scale: 1.1 }}
          >
            <Search className="h-4 w-4 text-muted-foreground" />
          </motion.div>
          <Input
            placeholder={language === 'bn' ? 'ডিভাইস, সিরিয়াল, সাপ্লায়ার খুঁজুন...' : 'Search device, serial, supplier...'}
            value={filters.searchQuery}
            onChange={(e) => updateFilter('searchQuery', e.target.value)}
            className="pl-9 h-9 text-sm transition-all focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>
      <FilterContent />
    </div>
  );
}
