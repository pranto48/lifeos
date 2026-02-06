import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  height?: string;
  delay?: number;
  showGlow?: boolean;
  className?: string;
}

export function AnimatedProgressBar({
  value,
  max = 100,
  color = 'bg-primary',
  height = 'h-2',
  delay = 0,
  showGlow = true,
  className,
}: AnimatedProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className={cn("relative w-full overflow-hidden rounded-full bg-muted/50", height, className)}>
      <motion.div
        className={cn("h-full rounded-full relative", color)}
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{
          duration: 1,
          delay,
          ease: [0.25, 0.46, 0.45, 0.94], // Custom easing
        }}
      >
        {/* Animated shimmer effect */}
        <motion.div
          className="absolute inset-0 opacity-50"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
          }}
          animate={{
            x: ['-100%', '100%'],
          }}
          transition={{
            duration: 1.5,
            delay: delay + 0.5,
            repeat: Infinity,
            repeatDelay: 2,
            ease: "easeInOut"
          }}
        />

        {/* Glow effect */}
        {showGlow && (
          <motion.div
            className={cn("absolute right-0 top-0 bottom-0 w-4 blur-sm", color)}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.8, 0.3] }}
            transition={{
              duration: 0.5,
              delay: delay + 1,
            }}
          />
        )}
      </motion.div>
    </div>
  );
}

interface SegmentedProgressBarProps {
  segments: { value: number; color: string; label: string }[];
  total: number;
  delay?: number;
  className?: string;
}

export function SegmentedProgressBar({
  segments,
  total,
  delay = 0,
  className,
}: SegmentedProgressBarProps) {
  let cumulativeDelay = delay;

  return (
    <div className={cn("h-3 rounded-full overflow-hidden flex bg-muted/50", className)}>
      {segments.map((segment, idx) => {
        const percentage = (segment.value / total) * 100;
        const segmentDelay = cumulativeDelay;
        cumulativeDelay += 0.1;

        if (percentage <= 0) return null;

        return (
          <motion.div
            key={segment.label}
            className={cn(
              "h-full relative",
              segment.color,
              idx === 0 && "rounded-l-full",
              idx === segments.length - 1 && "rounded-r-full"
            )}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{
              duration: 0.8,
              delay: segmentDelay,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            title={`${segment.label}: ${segment.value} (${percentage.toFixed(1)}%)`}
          >
            {/* Pulse effect on hover */}
            <motion.div
              className="absolute inset-0 opacity-0 hover:opacity-100"
              whileHover={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                transition: { duration: 0.2 }
              }}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
