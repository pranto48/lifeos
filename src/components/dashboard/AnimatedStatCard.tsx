import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { AnimatedCounter } from './AnimatedCounter';
import { cn } from '@/lib/utils';

interface AnimatedStatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  color: string;
  index: number;
  prefix?: string;
  suffix?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: number;
}

export function AnimatedStatCard({
  title,
  value,
  icon: Icon,
  color,
  index,
  prefix = '',
  suffix = '',
  trend,
  trendValue,
}: AnimatedStatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        delay: index * 0.1,
        duration: 0.5,
        type: "spring",
        stiffness: 100,
        damping: 15
      }}
      whileHover={{ 
        scale: 1.03, 
        y: -4,
        transition: { duration: 0.2 }
      }}
    >
      <Card className="stat-card relative overflow-hidden group">
        {/* Animated background gradient */}
        <motion.div 
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: `radial-gradient(circle at 80% 20%, ${color.includes('blue') ? 'rgba(59, 130, 246, 0.1)' : 
              color.includes('red') ? 'rgba(239, 68, 68, 0.1)' : 
              color.includes('green') ? 'rgba(34, 197, 94, 0.1)' : 
              color.includes('yellow') ? 'rgba(234, 179, 8, 0.1)' : 
              'rgba(168, 85, 247, 0.1)'} 0%, transparent 70%)`
          }}
        />
        
        {/* Shimmer effect */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100"
          initial={{ x: '-100%' }}
          whileHover={{ 
            x: '100%',
            transition: { duration: 0.8, ease: "easeInOut" }
          }}
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
          }}
        />

        <CardContent className="p-4 relative z-10">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ rotate: -20, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 + 0.3, duration: 0.5 }}
              whileHover={{ 
                rotate: [0, -10, 10, -5, 5, 0],
                transition: { duration: 0.5 }
              }}
            >
              <Icon className={cn("h-5 w-5", color)} />
            </motion.div>
            <motion.span 
              className="font-mono text-2xl font-bold text-foreground"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 + 0.2, type: "spring" }}
            >
              <AnimatedCounter 
                value={value} 
                delay={index * 0.1 + 0.3}
                prefix={prefix}
                suffix={suffix}
              />
            </motion.span>
          </div>
          
          <motion.p 
            className="text-xs text-muted-foreground mt-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 + 0.4 }}
          >
            {title}
          </motion.p>

          {trend && trendValue !== undefined && (
            <motion.div
              className={cn(
                "flex items-center gap-1 mt-1 text-xs",
                trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-muted-foreground'
              )}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.1 + 0.5 }}
            >
              <span>{trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}</span>
              <span>{trendValue}%</span>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
