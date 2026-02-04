import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HardDrive, Laptop, Monitor, AlertTriangle, CheckCircle2, 
  Wrench, Package, TrendingUp, Calendar, DollarSign,
  Users, Building2, BarChart3, PieChart
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { format, isBefore, addDays } from 'date-fns';

interface DeviceStats {
  total: number;
  available: number;
  assigned: number;
  maintenance: number;
  retired: number;
  totalValue: number;
  warningCount: number;
  expiredCount: number;
  recentlyAdded: number;
  categoryBreakdown: { name: string; count: number; color: string }[];
  unitBreakdown: { name: string; count: number }[];
  supplierBreakdown: { name: string; count: number }[];
}

const STATUS_COLORS = {
  available: 'bg-green-500',
  assigned: 'bg-blue-500',
  maintenance: 'bg-yellow-500',
  retired: 'bg-gray-500',
  disposed: 'bg-red-500',
};

const CATEGORY_COLORS = [
  'hsl(var(--primary))',
  'hsl(200, 70%, 50%)',
  'hsl(280, 70%, 50%)',
  'hsl(160, 70%, 50%)',
  'hsl(340, 70%, 50%)',
  'hsl(45, 70%, 50%)',
];

export function DeviceInventoryReport() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DeviceStats>({
    total: 0,
    available: 0,
    assigned: 0,
    maintenance: 0,
    retired: 0,
    totalValue: 0,
    warningCount: 0,
    expiredCount: 0,
    recentlyAdded: 0,
    categoryBreakdown: [],
    unitBreakdown: [],
    supplierBreakdown: [],
  });

  useEffect(() => {
    if (user) loadStats();
  }, [user]);

  const loadStats = async () => {
    setLoading(true);
    
    const [devicesRes, categoriesRes, unitsRes, suppliersRes] = await Promise.all([
      supabase.from('device_inventory').select('*'),
      supabase.from('device_categories').select('id, name'),
      supabase.from('support_units').select('id, name'),
      supabase.from('device_suppliers').select('id, name'),
    ]);

    const devices = devicesRes.data || [];
    const categories = categoriesRes.data || [];
    const units = unitsRes.data || [];
    const suppliers = suppliersRes.data || [];
    
    const today = new Date();
    const warningDate = addDays(today, 30);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Calculate stats
    const available = devices.filter(d => d.status === 'available').length;
    const assigned = devices.filter(d => d.status === 'assigned').length;
    const maintenance = devices.filter(d => d.status === 'maintenance').length;
    const retired = devices.filter(d => d.status === 'retired' || d.status === 'disposed').length;
    
    const totalValue = devices.reduce((sum, d) => sum + (d.price || 0), 0);
    
    const warningCount = devices.filter(d => {
      if (!d.warranty_date) return false;
      const warranty = new Date(d.warranty_date);
      return !isBefore(warranty, today) && isBefore(warranty, warningDate);
    }).length;
    
    const expiredCount = devices.filter(d => {
      if (!d.warranty_date) return false;
      return isBefore(new Date(d.warranty_date), today);
    }).length;
    
    const recentlyAdded = devices.filter(d => 
      new Date(d.created_at) >= weekAgo
    ).length;

    // Category breakdown
    const categoryBreakdown = categories.map((cat, idx) => ({
      name: cat.name,
      count: devices.filter(d => d.category_id === cat.id).length,
      color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
    })).filter(c => c.count > 0).sort((a, b) => b.count - a.count);

    // Unit breakdown
    const unitBreakdown = units.map(unit => ({
      name: unit.name,
      count: devices.filter(d => d.unit_id === unit.id).length,
    })).filter(u => u.count > 0).sort((a, b) => b.count - a.count);

    // Supplier breakdown
    const supplierBreakdown = suppliers.map(supplier => ({
      name: supplier.name,
      count: devices.filter(d => d.supplier_id === supplier.id).length,
    })).filter(s => s.count > 0).sort((a, b) => b.count - a.count).slice(0, 5);

    setStats({
      total: devices.length,
      available,
      assigned,
      maintenance,
      retired,
      totalValue,
      warningCount,
      expiredCount,
      recentlyAdded,
      categoryBreakdown,
      unitBreakdown,
      supplierBreakdown,
    });

    setLoading(false);
  };

  const statusData = useMemo(() => [
    { label: language === 'bn' ? 'উপলব্ধ' : 'Available', count: stats.available, color: STATUS_COLORS.available, icon: CheckCircle2 },
    { label: language === 'bn' ? 'বরাদ্দ' : 'Assigned', count: stats.assigned, color: STATUS_COLORS.assigned, icon: Users },
    { label: language === 'bn' ? 'রক্ষণাবেক্ষণ' : 'Maintenance', count: stats.maintenance, color: STATUS_COLORS.maintenance, icon: Wrench },
    { label: language === 'bn' ? 'অবসর' : 'Retired', count: stats.retired, color: STATUS_COLORS.retired, icon: Package },
  ], [stats, language]);

  if (loading) {
    return (
      <Card className="col-span-full animate-pulse">
        <CardContent className="h-64 flex items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <HardDrive className="h-5 w-5 animate-spin" />
            <span>{language === 'bn' ? 'লোড হচ্ছে...' : 'Loading...'}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="col-span-full space-y-4"
    >
      <Card className="overflow-hidden">
        <CardHeader className="pb-2 bg-gradient-to-r from-primary/5 to-transparent">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <HardDrive className="h-5 w-5 text-primary" />
            </motion.div>
            {language === 'bn' ? 'ডিভাইস ইনভেন্টরি রিপোর্ট' : 'Device Inventory Report'}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-6">
          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="p-3 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20"
            >
              <div className="flex items-center justify-between">
                <HardDrive className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold text-primary">{stats.total}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {language === 'bn' ? 'মোট ডিভাইস' : 'Total Devices'}
              </p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="p-3 rounded-lg bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20"
            >
              <div className="flex items-center justify-between">
                <DollarSign className="h-5 w-5 text-green-500" />
                <span className="text-lg font-bold text-green-600">৳{(stats.totalValue / 1000).toFixed(0)}k</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {language === 'bn' ? 'মোট মূল্য' : 'Total Value'}
              </p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="p-3 rounded-lg bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20"
            >
              <div className="flex items-center justify-between">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <span className="text-2xl font-bold text-yellow-600">{stats.warningCount}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {language === 'bn' ? 'ওয়ারেন্টি সতর্কতা' : 'Warranty Warning'}
              </p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20"
            >
              <div className="flex items-center justify-between">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                <span className="text-2xl font-bold text-blue-600">+{stats.recentlyAdded}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {language === 'bn' ? 'এই সপ্তাহে' : 'This Week'}
              </p>
            </motion.div>
          </div>

          {/* Status Distribution */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {language === 'bn' ? 'স্ট্যাটাস বিতরণ' : 'Status Distribution'}
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <AnimatePresence>
                {statusData.map((status, idx) => (
                  <motion.div
                    key={status.label}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className={`p-2 rounded-lg ${status.color}/20`}>
                      <status.icon className={`h-4 w-4 ${status.color.replace('bg-', 'text-')}`} />
                    </div>
                    <div>
                      <p className="text-lg font-bold">{status.count}</p>
                      <p className="text-xs text-muted-foreground">{status.label}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            
            {/* Status Bar */}
            {stats.total > 0 && (
              <div className="h-3 rounded-full overflow-hidden flex bg-muted/50">
                {statusData.map((status, idx) => {
                  const percentage = (status.count / stats.total) * 100;
                  return percentage > 0 ? (
                    <motion.div
                      key={status.label}
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.8, delay: idx * 0.1 }}
                      className={`${status.color} first:rounded-l-full last:rounded-r-full`}
                      title={`${status.label}: ${status.count} (${percentage.toFixed(1)}%)`}
                    />
                  ) : null;
                })}
              </div>
            )}
          </div>

          {/* Category & Unit Breakdown */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Category Breakdown */}
            {stats.categoryBreakdown.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <PieChart className="h-4 w-4" />
                  {language === 'bn' ? 'ক্যাটাগরি অনুসারে' : 'By Category'}
                </h4>
                <div className="space-y-2">
                  {stats.categoryBreakdown.slice(0, 5).map((cat, idx) => (
                    <motion.div
                      key={cat.name}
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: '100%' }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-center gap-2"
                    >
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-sm flex-1 truncate">{cat.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {cat.count}
                      </Badge>
                      <div className="w-20">
                        <Progress 
                          value={(cat.count / stats.total) * 100} 
                          className="h-1.5"
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Unit Breakdown */}
            {stats.unitBreakdown.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {language === 'bn' ? 'ইউনিট অনুসারে' : 'By Unit'}
                </h4>
                <div className="space-y-2">
                  {stats.unitBreakdown.slice(0, 5).map((unit, idx) => (
                    <motion.div
                      key={unit.name}
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: '100%' }}
                      transition={{ delay: idx * 0.1 + 0.3 }}
                      className="flex items-center gap-2"
                    >
                      <Building2 className="w-3 h-3 text-primary" />
                      <span className="text-sm flex-1 truncate">{unit.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {unit.count}
                      </Badge>
                      <div className="w-20">
                        <Progress 
                          value={(unit.count / stats.total) * 100} 
                          className="h-1.5"
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Warranty Alerts */}
          {(stats.warningCount > 0 || stats.expiredCount > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center gap-3"
            >
              <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {language === 'bn' ? 'ওয়ারেন্টি সতর্কতা' : 'Warranty Alerts'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats.warningCount > 0 && (
                    <span className="text-yellow-600">
                      {stats.warningCount} {language === 'bn' ? 'টি শীঘ্রই শেষ হবে' : 'expiring soon'}
                    </span>
                  )}
                  {stats.warningCount > 0 && stats.expiredCount > 0 && ' • '}
                  {stats.expiredCount > 0 && (
                    <span className="text-red-500">
                      {stats.expiredCount} {language === 'bn' ? 'টি মেয়াদ উত্তীর্ণ' : 'expired'}
                    </span>
                  )}
                </p>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
