import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Building, User } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Unit {
  id: string;
  name: string;
}

interface Department {
  id: string;
  name: string;
  unit_id: string;
}

interface SupportUser {
  id: string;
  name: string;
  department_id: string;
  is_active: boolean;
}

interface CascadingAssignmentProps {
  units: Unit[];
  departments: Department[];
  supportUsers: SupportUser[];
  selectedUserId: string;
  onUserChange: (userId: string) => void;
  className?: string;
}

export function CascadingAssignment({
  units,
  departments,
  supportUsers,
  selectedUserId,
  onUserChange,
  className = '',
}: CascadingAssignmentProps) {
  const { language } = useLanguage();
  
  // Find current selection hierarchy from selected user
  const findCurrentHierarchy = () => {
    if (!selectedUserId) return { unitId: '', departmentId: '' };
    
    const user = supportUsers.find(u => u.id === selectedUserId);
    if (!user) return { unitId: '', departmentId: '' };
    
    const dept = departments.find(d => d.id === user.department_id);
    if (!dept) return { unitId: '', departmentId: '' };
    
    return { unitId: dept.unit_id, departmentId: dept.id };
  };

  const initialHierarchy = findCurrentHierarchy();
  const [selectedUnitId, setSelectedUnitId] = useState(initialHierarchy.unitId);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(initialHierarchy.departmentId);

  // Update internal state when selectedUserId changes externally
  useEffect(() => {
    const hierarchy = findCurrentHierarchy();
    setSelectedUnitId(hierarchy.unitId);
    setSelectedDepartmentId(hierarchy.departmentId);
  }, [selectedUserId]);

  // Filter departments by selected unit
  const filteredDepartments = selectedUnitId
    ? departments.filter(d => d.unit_id === selectedUnitId)
    : [];

  // Filter users by selected department
  const filteredUsers = selectedDepartmentId
    ? supportUsers.filter(u => u.department_id === selectedDepartmentId && u.is_active)
    : [];

  const handleUnitChange = (unitId: string) => {
    setSelectedUnitId(unitId === 'none' ? '' : unitId);
    setSelectedDepartmentId('');
    onUserChange('');
  };

  const handleDepartmentChange = (departmentId: string) => {
    setSelectedDepartmentId(departmentId === 'none' ? '' : departmentId);
    onUserChange('');
  };

  const handleUserChange = (userId: string) => {
    onUserChange(userId === 'none' ? '' : userId);
  };

  return (
    <div className={`space-y-4 md:col-span-2 ${className}`}>
      <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-2">
        <User className="h-3.5 w-3.5" />
        {language === 'bn' ? 'বরাদ্দ প্রক্রিয়া' : 'Assignment Flow'}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 rounded-lg bg-muted/30 border border-border/50">
        {/* Unit Selection */}
        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1.5">
            <Building2 className="h-3 w-3 text-primary" />
            {language === 'bn' ? 'ইউনিট' : 'Unit'}
          </Label>
          <Select value={selectedUnitId || 'none'} onValueChange={handleUnitChange}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder={language === 'bn' ? 'ইউনিট নির্বাচন' : 'Select Unit'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{language === 'bn' ? 'নির্বাচন করুন' : 'Select'}</SelectItem>
              {units.map(unit => (
                <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Department Selection */}
        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1.5">
            <Building className="h-3 w-3 text-primary" />
            {language === 'bn' ? 'ডিপার্টমেন্ট' : 'Department'}
          </Label>
          <Select 
            value={selectedDepartmentId || 'none'} 
            onValueChange={handleDepartmentChange}
            disabled={!selectedUnitId}
          >
            <SelectTrigger className="text-sm">
              <SelectValue placeholder={language === 'bn' ? 'ডিপার্টমেন্ট নির্বাচন' : 'Select Department'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{language === 'bn' ? 'নির্বাচন করুন' : 'Select'}</SelectItem>
              {filteredDepartments.map(dept => (
                <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedUnitId && filteredDepartments.length === 0 && (
            <p className="text-[10px] text-muted-foreground">
              {language === 'bn' ? 'কোন ডিপার্টমেন্ট নেই' : 'No departments'}
            </p>
          )}
        </div>

        {/* User Selection */}
        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1.5">
            <User className="h-3 w-3 text-primary" />
            {language === 'bn' ? 'বরাদ্দ করুন' : 'Assign To'}
          </Label>
          <Select 
            value={selectedUserId || 'none'} 
            onValueChange={handleUserChange}
            disabled={!selectedDepartmentId}
          >
            <SelectTrigger className="text-sm">
              <SelectValue placeholder={language === 'bn' ? 'ব্যবহারকারী নির্বাচন' : 'Select User'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{language === 'bn' ? 'কেউ নয়' : 'None'}</SelectItem>
              {filteredUsers.map(user => (
                <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedDepartmentId && filteredUsers.length === 0 && (
            <p className="text-[10px] text-muted-foreground">
              {language === 'bn' ? 'কোন ব্যবহারকারী নেই' : 'No users'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
