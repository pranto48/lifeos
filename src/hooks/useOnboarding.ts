import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isSelfHosted } from '@/lib/selfHostedConfig';

const ONBOARDING_KEY = 'lifeos_onboarding_completed';

export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingEnabled, setOnboardingEnabled] = useState(true);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      // In self-hosted mode, skip Supabase query entirely
      if (isSelfHosted()) {
        const completed = localStorage.getItem(ONBOARDING_KEY);
        if (!completed) {
          setShowOnboarding(true);
        }
        setIsLoading(false);
        return;
      }

      // First check if onboarding is enabled globally
      const { data: settings } = await supabase
        .from('app_settings')
        .select('onboarding_enabled')
        .eq('id', 'default')
        .maybeSingle();

      const isEnabled = settings?.onboarding_enabled ?? true;
      setOnboardingEnabled(isEnabled);

      // Only show onboarding if enabled and not completed
      if (isEnabled) {
        const completed = localStorage.getItem(ONBOARDING_KEY);
        if (!completed) {
          setShowOnboarding(true);
        }
      }
    } catch (error) {
      console.error('Failed to check onboarding status:', error);
      // Fallback to localStorage check
      const completed = localStorage.getItem(ONBOARDING_KEY);
      if (!completed) {
        setShowOnboarding(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setShowOnboarding(false);
  };

  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_KEY);
    setShowOnboarding(true);
  };

  return {
    showOnboarding,
    isLoading,
    completeOnboarding,
    resetOnboarding,
    onboardingEnabled
  };
}
