import { motion, TargetAndTransition } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type AnimationType = 
  | 'pulse'
  | 'bounce'
  | 'shake'
  | 'rotate'
  | 'scale'
  | 'float'
  | 'heartbeat'
  | 'swing';

interface AnimatedIconProps {
  icon: LucideIcon;
  animation?: AnimationType;
  size?: number;
  color?: string;
  hoverAnimation?: AnimationType;
  continuous?: boolean;
  className?: string;
}

const getAnimation = (type: AnimationType): TargetAndTransition => {
  switch (type) {
    case 'pulse':
      return {
        scale: [1, 1.1, 1],
        opacity: [1, 0.8, 1],
        transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
      };
    case 'bounce':
      return {
        y: [0, -8, 0],
        transition: { duration: 0.6, repeat: Infinity, ease: 'easeOut' }
      };
    case 'shake':
      return {
        x: [-2, 2, -2, 2, 0],
        transition: { duration: 0.5, repeat: Infinity, repeatDelay: 2 }
      };
    case 'rotate':
      return {
        rotate: 360,
        transition: { duration: 2, repeat: Infinity, ease: 'linear' }
      };
    case 'scale':
      return {
        scale: [1, 1.2, 1],
        transition: { duration: 0.3 }
      };
    case 'float':
      return {
        y: [0, -5, 0],
        transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
      };
    case 'heartbeat':
      return {
        scale: [1, 1.15, 1, 1.15, 1],
        transition: { duration: 1.2, repeat: Infinity, repeatDelay: 0.8 }
      };
    case 'swing':
      return {
        rotate: [0, 15, -10, 5, 0],
        transition: { duration: 0.8, repeat: Infinity, repeatDelay: 1.5 }
      };
    default:
      return {};
  }
};

const getHoverAnimation = (type: AnimationType): TargetAndTransition => {
  switch (type) {
    case 'pulse':
      return { scale: 1.1, transition: { duration: 0.2 } };
    case 'bounce':
      return { y: -4, transition: { duration: 0.2 } };
    case 'shake':
      return { x: [0, -3, 3, -3, 3, 0], transition: { duration: 0.4 } };
    case 'rotate':
      return { rotate: 360, transition: { duration: 0.5 } };
    case 'scale':
      return { scale: 1.25, transition: { duration: 0.2 } };
    case 'float':
      return { y: -6, transition: { duration: 0.2 } };
    case 'heartbeat':
      return { scale: [1, 1.2, 1], transition: { duration: 0.3 } };
    case 'swing':
      return { rotate: [0, 20, -15, 10, -5, 0], transition: { duration: 0.5 } };
    default:
      return { scale: 1.1, transition: { duration: 0.2 } };
  }
};

export function AnimatedIcon({
  icon: Icon,
  animation,
  size = 16,
  color,
  hoverAnimation,
  continuous = false,
  className,
}: AnimatedIconProps) {
  const animateProps = continuous && animation ? getAnimation(animation) : undefined;
  const hoverProps = hoverAnimation 
    ? getHoverAnimation(hoverAnimation) 
    : animation 
      ? getAnimation(animation) 
      : { scale: 1.1, transition: { duration: 0.2 } };

  return (
    <motion.div
      className={cn('inline-flex items-center justify-center', className)}
      animate={animateProps}
      whileHover={hoverProps}
    >
      <Icon 
        size={size} 
        style={{ color }} 
        className="transition-colors"
      />
    </motion.div>
  );
}

// Preset animated icons for common use cases
export function LoadingSpinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <motion.div
      className={cn('inline-flex', className)}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
    </motion.div>
  );
}

export function SuccessCheck({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <motion.div
      className={cn('text-green-500', className)}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <motion.path
          d="M20 6L9 17l-5-5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        />
      </motion.svg>
    </motion.div>
  );
}

export function PulsingDot({ 
  color = 'bg-primary', 
  size = 'md' 
}: { 
  color?: string; 
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  return (
    <span className="relative inline-flex">
      <span className={cn('rounded-full', color, sizeClasses[size])} />
      <motion.span
        className={cn('absolute inset-0 rounded-full', color)}
        animate={{
          scale: [1, 1.5, 1.5],
          opacity: [0.7, 0, 0]
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeOut'
        }}
      />
    </span>
  );
}
