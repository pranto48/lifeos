import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HardDrive, AlertTriangle, CheckCircle2, 
  Wrench, Package, TrendingUp, DollarSign,
  Users, Building2, BarChart3, PieChart, Sparkles
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { addDays, isBefore } from 'date-fns';
import { AnimatedReportCard } from './AnimatedReportCard';
import { AnimatedCounter } from './AnimatedCounter';
import { AnimatedProgressBar, SegmentedProgressBar } from './AnimatedProgressBar';

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

  const statusSegments = useMemo(() => [
    { value: stats.available, color: 'bg-green-500', label: language === 'bn' ? 'উপলব্ধ' : 'Available' },
    { value: stats.assigned, color: 'bg-blue-500', label: language === 'bn' ? 'বরাদ্দ' : 'Assigned' },
    { value: stats.maintenance, color: 'bg-yellow-500', label: language === 'bn' ? 'রক্ষণাবেক্ষণ' : 'Maintenance' },
    { value: stats.retired, color: 'bg-gray-500', label: language === 'bn' ? 'অবসর' : 'Retired' },
  ], [stats, language]);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="col-span-full"
      >
        <div className="rounded-lg border bg-card p-8">
          <div className="flex flex-col items-center justify-center gap-4">
            <motion.div
              animate={{ 
                rotate: 360,
                scale: [1, 1.2, 1]
              }}
              transition={{ 
                rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                scale: { duration: 1, repeat: Infinity }
              }}
            >
              <HardDrive className="h-8 w-8 text-primary" />
            </motion.div>
            <motion.div
              className="flex gap-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary"
                  animate={{ y: [0, -8, 0] }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: i * 0.1,
                  }}
                />
              ))}
            </motion.div>
            <span className="text-sm text-muted-foreground">
              {language === 'bn' ? 'লোড হচ্ছে...' : 'Loading inventory data...'}
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <AnimatedReportCard
      title={language === 'bn' ? 'ডিভাইস ইনভেন্টরি রিপোর্ট' : 'Device Inventory Report'}
      icon={HardDrive}
      iconColor="text-primary"
      delay={0.1}
    >
      <div className="space-y-6">
        {/* Quick Stats Row with Animated Counters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Total Devices */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
            whileHover={{ scale: 1.05, y: -2 }}
            className="p-4 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 relative overflow-hidden group"
          >
            <motion.div
              className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-primary/10"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <div className="flex items-center justify-between relative">
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
              >
                <HardDrive className="h-6 w-6 text-primary" />
              </motion.div>
              <span className="text-3xl font-bold text-primary font-mono">
                <AnimatedCounter value={stats.total} delay={0.3} />
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-medium">
              {language === 'bn' ? 'মোট ডিভাইস' : 'Total Devices'}
            </p>
          </motion.div>

          {/* Total Value */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
            whileHover={{ scale: 1.05, y: -2 }}
            className="p-4 rounded-xl bg-gradient-to-br from-green-500/15 to-green-500/5 border border-green-500/20 relative overflow-hidden group"
          >
            <motion.div
              className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-green-500/10"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
            />
            <div className="flex items-center justify-between relative">
              <motion.div
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <DollarSign className="h-6 w-6 text-green-500" />
              </motion.div>
              <span className="text-2xl font-bold text-green-500 font-mono">
                ৳<AnimatedCounter value={stats.totalValue / 1000} delay={0.4} decimals={0} suffix="k" />
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-medium">
              {language === 'bn' ? 'মোট মূল্য' : 'Total Value'}
            </p>
          </motion.div>

          {/* Warranty Warning */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 100 }}
            whileHover={{ scale: 1.05, y: -2 }}
            className="p-4 rounded-xl bg-gradient-to-br from-yellow-500/15 to-yellow-500/5 border border-yellow-500/20 relative overflow-hidden group"
          >
            {stats.warningCount > 0 && (
              <motion.div
                className="absolute inset-0 bg-yellow-500/5"
                animate={{ opacity: [0, 0.5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
            <div className="flex items-center justify-between relative">
              <motion.div
                animate={stats.warningCount > 0 ? { 
                  rotate: [0, -10, 10, -10, 10, 0],
                  scale: [1, 1.1, 1]
                } : {}}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
              >
                <AlertTriangle className="h-6 w-6 text-yellow-500" />
              </motion.div>
              <span className="text-3xl font-bold text-yellow-500 font-mono">
                <AnimatedCounter value={stats.warningCount} delay={0.5} />
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-medium">
              {language === 'bn' ? 'ওয়ারেন্টি সতর্কতা' : 'Warranty Warning'}
            </p>
          </motion.div>

          {/* Recently Added */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 100 }}
            whileHover={{ scale: 1.05, y: -2 }}
            className="p-4 rounded-xl bg-gradient-to-br from-blue-500/15 to-blue-500/5 border border-blue-500/20 relative overflow-hidden group"
          >
            <motion.div
              className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-blue-500/10"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 3, repeat: Infinity, delay: 1 }}
            />
            <div className="flex items-center justify-between relative">
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <TrendingUp className="h-6 w-6 text-blue-500" />
              </motion.div>
              <span className="text-3xl font-bold text-blue-500 font-mono">
                +<AnimatedCounter value={stats.recentlyAdded} delay={0.6} />
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-medium">
              {language === 'bn' ? 'এই সপ্তাহে' : 'This Week'}
            </p>
            {stats.recentlyAdded > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 }}
              >
                <Sparkles className="absolute top-2 right-2 h-4 w-4 text-blue-400" />
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Status Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-4"
        >
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <BarChart3 className="h-4 w-4" />
            </motion.div>
            {language === 'bn' ? 'স্ট্যাটাস বিতরণ' : 'Status Distribution'}
          </h4>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <AnimatePresence>
              {statusData.map((status, idx) => (
                <motion.div
                  key={status.label}
                  initial={{ opacity: 0, x: -30, rotateY: -20 }}
                  animate={{ opacity: 1, x: 0, rotateY: 0 }}
                  transition={{ 
                    delay: 0.7 + idx * 0.1,
                    type: "spring",
                    stiffness: 100
                  }}
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: "0 10px 30px -10px rgba(0,0,0,0.3)"
                  }}
                  className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all cursor-default border border-transparent hover:border-primary/20"
                >
                  <motion.div 
                    className={`p-2.5 rounded-xl ${status.color}/20`}
                    whileHover={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.3 }}
                  >
                    <status.icon className={`h-5 w-5 ${status.color.replace('bg-', 'text-')}`} />
                  </motion.div>
                  <div>
                    <p className="text-xl font-bold font-mono">
                      <AnimatedCounter value={status.count} delay={0.8 + idx * 0.1} />
                    </p>
                    <p className="text-xs text-muted-foreground">{status.label}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          
          {/* Animated Status Bar */}
          {stats.total > 0 && (
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 1.1, duration: 0.5 }}
              style={{ transformOrigin: 'left' }}
            >
              <SegmentedProgressBar
                segments={statusSegments}
                total={stats.total}
                delay={1.2}
                className="h-4"
              />
            </motion.div>
          )}
        </motion.div>

        {/* Category & Unit Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3 }}
          className="grid md:grid-cols-2 gap-6"
        >
          {/* Category Breakdown */}
          {stats.categoryBreakdown.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <PieChart className="h-4 w-4" />
                </motion.div>
                {language === 'bn' ? 'ক্যাটাগরি অনুসারে' : 'By Category'}
              </h4>
              <div className="space-y-3">
                {stats.categoryBreakdown.slice(0, 5).map((cat, idx) => (
                  <motion.div
                    key={cat.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.4 + idx * 0.1 }}
                    whileHover={{ x: 4 }}
                    className="flex items-center gap-3 group"
                  >
                    <div 
                      className="w-3 h-3 rounded-full ring-2 ring-offset-2 ring-offset-background ring-current"
                      style={{ backgroundColor: cat.color, color: cat.color }}
                    />
                    <span className="text-sm flex-1 truncate group-hover:text-foreground transition-colors">{cat.name}</span>
                    <Badge variant="secondary" className="text-xs font-mono tabular-nums">
                      <AnimatedCounter value={cat.count} delay={1.5 + idx * 0.1} />
                    </Badge>
                    <div className="w-24">
                      <AnimatedProgressBar 
                        value={cat.count}
                        max={stats.total}
                        delay={1.5 + idx * 0.1}
                        height="h-2"
                        showGlow={false}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Unit Breakdown */}
          {stats.unitBreakdown.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <motion.div
                  animate={{ y: [0, -2, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Building2 className="h-4 w-4" />
                </motion.div>
                {language === 'bn' ? 'ইউনিট অনুসারে' : 'By Unit'}
              </h4>
              <div className="space-y-3">
                {stats.unitBreakdown.slice(0, 5).map((unit, idx) => (
                  <motion.div
                    key={unit.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.6 + idx * 0.1 }}
                    whileHover={{ x: 4 }}
                    className="flex items-center gap-3 group"
                  >
                    <motion.div
                      whileHover={{ rotate: 10 }}
                    >
                      <Building2 className="w-3 h-3 text-primary" />
                    </motion.div>
                    <span className="text-sm flex-1 truncate group-hover:text-foreground transition-colors">{unit.name}</span>
                    <Badge variant="outline" className="text-xs font-mono tabular-nums">
                      <AnimatedCounter value={unit.count} delay={1.7 + idx * 0.1} />
                    </Badge>
                    <div className="w-24">
                      <AnimatedProgressBar 
                        value={unit.count}
                        max={stats.total}
                        color="bg-primary"
                        delay={1.7 + idx * 0.1}
                        height="h-2"
                        showGlow={false}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Warranty Alerts */}
        {(stats.warningCount > 0 || stats.expiredCount > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 2, type: "spring" }}
            className="p-4 rounded-xl bg-gradient-to-r from-yellow-500/10 via-yellow-500/5 to-transparent border border-yellow-500/30 flex items-center gap-4 relative overflow-hidden"
          >
            {/* Animated warning pulse */}
            <motion.div
              className="absolute inset-0 bg-yellow-500/5"
              animate={{ opacity: [0, 0.3, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            
            <motion.div
              animate={{ 
                rotate: [0, -15, 15, -15, 15, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
            >
              <AlertTriangle className="h-6 w-6 text-yellow-500 shrink-0" />
            </motion.div>
            
            <div className="flex-1 relative">
              <p className="text-sm font-semibold text-yellow-600">
                {language === 'bn' ? 'ওয়ারেন্টি সতর্কতা' : 'Warranty Alerts'}
              </p>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                {stats.warningCount > 0 && (
                  <motion.span 
                    className="text-yellow-500 font-medium"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2.2 }}
                  >
                    <AnimatedCounter value={stats.warningCount} delay={2.2} /> {language === 'bn' ? 'টি শীঘ্রই শেষ হবে' : 'expiring soon'}
                  </motion.span>
                )}
                {stats.warningCount > 0 && stats.expiredCount > 0 && (
                  <span className="text-muted-foreground">•</span>
                )}
                {stats.expiredCount > 0 && (
                  <motion.span 
                    className="text-red-500 font-medium"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2.4 }}
                  >
                    <AnimatedCounter value={stats.expiredCount} delay={2.4} /> {language === 'bn' ? 'টি মেয়াদ উত্তীর্ণ' : 'expired'}
                  </motion.span>
                )}
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </AnimatedReportCard>
  );
}
