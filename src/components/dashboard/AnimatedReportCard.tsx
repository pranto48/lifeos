import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface AnimatedReportCardProps {
  title: string;
  icon: LucideIcon;
  iconColor?: string;
  children: ReactNode;
  className?: string;
  headerGradient?: boolean;
  delay?: number;
}

export function AnimatedReportCard({
  title,
  icon: Icon,
  iconColor = 'text-primary',
  children,
  className,
  headerGradient = true,
  delay = 0,
}: AnimatedReportCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.5,
        delay,
        type: "spring",
        stiffness: 100,
        damping: 20
      }}
      className={cn("col-span-full", className)}
    >
      <Card className="overflow-hidden relative group">
        {/* Animated border glow on hover */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, transparent 40%, hsl(var(--primary) / 0.1) 50%, transparent 60%)',
            backgroundSize: '200% 200%',
          }}
          animate={{
            backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear"
          }}
        />

        <CardHeader className={cn(
          "pb-2 relative",
          headerGradient && "bg-gradient-to-r from-primary/5 via-primary/3 to-transparent"
        )}>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <motion.div
              animate={{ 
                rotate: [0, 5, -5, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 3, 
                repeat: Infinity, 
                repeatDelay: 2,
                ease: "easeInOut"
              }}
            >
              <Icon className={cn("h-5 w-5", iconColor)} />
            </motion.div>
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: delay + 0.2 }}
            >
              {title}
            </motion.span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 relative">
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
}
