import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const typeLabels: Record<string, string> = { dps: 'DPS', fdr: 'FDR', stocks: 'Stocks', crypto: 'Crypto', business: 'Business', mutual_fund: 'Mutual Fund', bonds: 'Bonds', real_estate: 'Real Estate', other: 'Other' };

export default function Investments() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [investments, setInvestments] = useState<any[]>([]);

  useEffect(() => {
    if (user) loadInvestments();
  }, [user]);

  const loadInvestments = async () => {
    const { data } = await supabase.from('investments').select('*').eq('user_id', user?.id).order('created_at', { ascending: false });
    setInvestments(data || []);
  };

  const totalPrincipal = investments.reduce((s, i) => s + Number(i.principal), 0);
  const totalCurrent = investments.reduce((s, i) => s + Number(i.current_value || i.principal), 0);
  const totalPL = totalCurrent - totalPrincipal;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t('investments.title')}</h1>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">{t('investments.totalValue')}</p>
          <p className="font-mono text-2xl font-bold text-primary">৳{totalCurrent.toLocaleString()}</p>
          <p className={`text-sm font-mono ${totalPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalPL >= 0 ? '+' : ''}৳{totalPL.toLocaleString()} ({totalPrincipal > 0 ? ((totalPL / totalPrincipal) * 100).toFixed(1) : 0}%)
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {investments.length === 0 ? (
          <Card className="bg-card border-border col-span-full">
            <CardContent className="py-12 text-center">
              <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t('investments.noInvestmentsYet')}</p>
            </CardContent>
          </Card>
        ) : (
          investments.map(inv => {
            const pl = Number(inv.current_value || inv.principal) - Number(inv.principal);
            return (
              <Card key={inv.id} className="bg-card border-border">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-foreground">{inv.name}</h3>
                      <Badge variant="secondary" className="mt-1">{typeLabels[inv.type]}</Badge>
                    </div>
                    {pl >= 0 ? <TrendingUp className="h-5 w-5 text-green-400" /> : <TrendingDown className="h-5 w-5 text-red-400" />}
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('investments.principal')}</span>
                    <span className="font-mono text-foreground">৳{Number(inv.principal).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('investments.current')}</span>
                    <span className="font-mono text-foreground">৳{Number(inv.current_value || inv.principal).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-border">
                    <span className="text-muted-foreground">{t('investments.profitLoss')}</span>
                    <span className={`font-mono font-semibold ${pl >= 0 ? 'text-green-400' : 'text-red-400'}`}>{pl >= 0 ? '+' : ''}৳{pl.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
