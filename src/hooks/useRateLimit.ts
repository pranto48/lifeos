import { useState, useCallback, useRef, useEffect } from 'react';

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  lockoutMs: number;
}

interface RateLimitState {
  attempts: number;
  firstAttemptTime: number | null;
  lockedUntil: number | null;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 60000, // 1 minute window
  lockoutMs: 300000, // 5 minute lockout
};

export function useRateLimit(key: string, config: Partial<RateLimitConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const storageKey = `rate_limit_${key}`;
  
  const [state, setState] = useState<RateLimitState>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore parse errors
    }
    return { attempts: 0, firstAttemptTime: null, lockedUntil: null };
  });

  const [remainingTime, setRemainingTime] = useState(0);
  const timerRef = useRef<number | null>(null);

  // Persist state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // Ignore storage errors
    }
  }, [state, storageKey]);

  // Update remaining time countdown
  useEffect(() => {
    const updateRemaining = () => {
      if (state.lockedUntil) {
        const remaining = Math.max(0, state.lockedUntil - Date.now());
        setRemainingTime(remaining);
        
        if (remaining <= 0) {
          // Reset after lockout expires
          setState({ attempts: 0, firstAttemptTime: null, lockedUntil: null });
        }
      } else {
        setRemainingTime(0);
      }
    };

    updateRemaining();
    timerRef.current = window.setInterval(updateRemaining, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [state.lockedUntil]);

  const isLocked = useCallback(() => {
    if (!state.lockedUntil) return false;
    return Date.now() < state.lockedUntil;
  }, [state.lockedUntil]);

  const getRemainingAttempts = useCallback(() => {
    // Check if window has expired
    if (state.firstAttemptTime && Date.now() - state.firstAttemptTime > finalConfig.windowMs) {
      return finalConfig.maxAttempts;
    }
    return Math.max(0, finalConfig.maxAttempts - state.attempts);
  }, [state, finalConfig]);

  const recordAttempt = useCallback(() => {
    const now = Date.now();
    
    setState(prev => {
      // Check if we're still locked
      if (prev.lockedUntil && now < prev.lockedUntil) {
        return prev;
      }

      // Check if window has expired - reset if so
      if (prev.firstAttemptTime && now - prev.firstAttemptTime > finalConfig.windowMs) {
        return {
          attempts: 1,
          firstAttemptTime: now,
          lockedUntil: null,
        };
      }

      const newAttempts = prev.attempts + 1;
      const firstAttemptTime = prev.firstAttemptTime || now;

      // Check if we've exceeded max attempts
      if (newAttempts >= finalConfig.maxAttempts) {
        return {
          attempts: newAttempts,
          firstAttemptTime,
          lockedUntil: now + finalConfig.lockoutMs,
        };
      }

      return {
        attempts: newAttempts,
        firstAttemptTime,
        lockedUntil: null,
      };
    });
  }, [finalConfig]);

  const reset = useCallback(() => {
    setState({ attempts: 0, firstAttemptTime: null, lockedUntil: null });
  }, []);

  const formatRemainingTime = useCallback(() => {
    const minutes = Math.floor(remainingTime / 60000);
    const seconds = Math.floor((remainingTime % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }, [remainingTime]);

  return {
    isLocked: isLocked(),
    remainingAttempts: getRemainingAttempts(),
    remainingTime,
    formatRemainingTime,
    recordAttempt,
    reset,
  };
}