import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HardDrive } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(210, 70%, 50%)',
  'hsl(280, 70%, 50%)',
  'hsl(30, 70%, 50%)',
];

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

export function DeviceCategoryChart() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [data, setData] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      const [devicesRes, categoriesRes] = await Promise.all([
        supabase.from('device_inventory').select('category_id'),
        supabase.from('device_categories').select('id, name'),
      ]);

      if (devicesRes.data && categoriesRes.data) {
        const categoryMap: Record<string, string> = {};
        categoriesRes.data.forEach(cat => {
          categoryMap[cat.id] = cat.name;
        });

        const counts: Record<string, number> = {};
        devicesRes.data.forEach(device => {
          const catName = device.category_id ? categoryMap[device.category_id] || 'Uncategorized' : 'Uncategorized';
          counts[catName] = (counts[catName] || 0) + 1;
        });

        const chartData = Object.entries(counts)
          .map(([name, value], index) => ({
            name,
            value,
            color: COLORS[index % COLORS.length],
          }))
          .sort((a, b) => b.value - a.value);

        setData(chartData);
      }
      setLoading(false);
    };

    loadData();
  }, [user]);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            {language === 'bn' ? 'ডিভাইস ক্যাটাগরি' : 'Device Categories'}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[200px] flex items-center justify-center">
          <span className="text-sm text-muted-foreground">Loading...</span>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            {language === 'bn' ? 'ডিভাইস ক্যাটাগরি' : 'Device Categories'}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[200px] flex items-center justify-center">
          <span className="text-sm text-muted-foreground">
            {language === 'bn' ? 'কোন ডিভাইস নেই' : 'No devices found'}
          </span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <HardDrive className="h-4 w-4" />
          {language === 'bn' ? 'ডিভাইস ক্যাটাগরি' : 'Device Categories'}
          <span className="ml-auto text-xs font-normal">
            {language === 'bn' ? `মোট: ${total}` : `Total: ${total}`}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number, name: string) => [
                  `${value} (${((value / total) * 100).toFixed(1)}%)`,
                  name,
                ]}
              />
              <Legend
                layout="horizontal"
                verticalAlign="bottom"
                align="center"
                formatter={(value) => (
                  <span className="text-xs text-muted-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
