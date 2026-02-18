import { useState } from 'react';
import { Settings as SettingsIcon, Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { SettingsNav, SettingsCategory } from '@/components/settings/SettingsNav';
import { ProfileSettings } from '@/components/settings/ProfileSettings';
import { LanguageSettings } from '@/components/settings/LanguageSettings';
import { PreferencesSettings } from '@/components/settings/PreferencesSettings';
import { SecurityOverview } from '@/components/settings/SecurityOverview';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { SessionManagement } from '@/components/settings/SessionManagement';
import { PasswordChange } from '@/components/settings/PasswordChange';
import { TwoFactorAuth } from '@/components/settings/TwoFactorAuth';
import { BiometricManagement } from '@/components/settings/BiometricManagement';
import { TrustedDevicesManagement } from '@/components/settings/TrustedDevicesManagement';
import { DataExport } from '@/components/settings/DataExport';
import { LicenseSettings } from '@/components/settings/LicenseSettings';
import { CalendarIntegrationSettings } from '@/components/settings/CalendarIntegrationSettings';
import { AdminSettings } from '@/components/settings/AdminSettings';
import { useIsMobile } from '@/hooks/use-mobile';
import { useIsAdmin } from '@/hooks/useUserRoles';
import { SectionErrorBoundary } from '@/components/ErrorBoundary';

export default function Settings() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const isMobile = useIsMobile();
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('profile');
  const { hasRole: isAdmin, recheckRoles } = useIsAdmin();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleCategoryChange = (category: SettingsCategory) => {
    setActiveCategory(category);
    setMobileNavOpen(false);
  };

  const renderContent = () => {
    switch (activeCategory) {
      case 'profile':
        return <ProfileSettings />;
      case 'language':
        return <LanguageSettings />;
      case 'preferences':
        return <PreferencesSettings />;
      case 'security':
        return <SecurityOverview />;
      case 'password':
        return <PasswordChange />;
      case '2fa':
        return <TwoFactorAuth />;
      case 'sessions':
        return <SessionManagement />;
      case 'devices':
        return <TrustedDevicesManagement />;
      case 'biometric':
        return <BiometricManagement />;
      case 'notifications':
        return <NotificationSettings />;
      case 'calendar':
        return <CalendarIntegrationSettings />;
      case 'backup':
        return <DataExport />;
      case 'license':
        return <LicenseSettings />;
      case 'admin':
        return <AdminSettings onAdminStatusChange={() => recheckRoles()} />;
      default:
        return <ProfileSettings />;
    }
  };

  const getCategoryTitle = () => {
    const titles: Record<SettingsCategory, { en: string; bn: string }> = {
      profile: { en: 'Profile', bn: 'প্রোফাইল' },
      language: { en: 'Language', bn: 'ভাষা' },
      preferences: { en: 'Preferences', bn: 'পছন্দসমূহ' },
      security: { en: 'Security Overview', bn: 'নিরাপত্তা ওভারভিউ' },
      password: { en: 'Password', bn: 'পাসওয়ার্ড' },
      '2fa': { en: 'Two-Factor Authentication', bn: 'টু-ফ্যাক্টর অথেন্টিকেশন' },
      sessions: { en: 'Active Sessions', bn: 'সক্রিয় সেশন' },
      devices: { en: 'Trusted Devices', bn: 'বিশ্বস্ত ডিভাইস' },
      biometric: { en: 'Biometric Authentication', bn: 'বায়োমেট্রিক অথেন্টিকেশন' },
      notifications: { en: 'Notifications', bn: 'নোটিফিকেশন' },
      calendar: { en: 'Calendar Sync', bn: 'ক্যালেন্ডার সিঙ্ক' },
      backup: { en: 'Backup & Restore', bn: 'ব্যাকআপ ও রিস্টোর' },
      license: { en: 'License', bn: 'লাইসেন্স' },
      admin: { en: 'Admin Panel', bn: 'এডমিন প্যানেল' },
    };
    return language === 'bn' ? titles[activeCategory].bn : titles[activeCategory].en;
  };

  return (
    <div className="flex h-full min-h-[calc(100vh-8rem)]">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="w-64 border-r border-border bg-card/50 flex-shrink-0">
          <div className="p-4 border-b border-border">
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              {t('settings.title')}
            </h1>
          </div>
          <SettingsNav
            activeCategory={activeCategory}
            onCategoryChange={handleCategoryChange}
            isAdmin={isAdmin}
          />
        </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Mobile Header */}
        {isMobile && (
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border p-4 flex items-center gap-3">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <div className="p-4 border-b border-border">
                  <h1 className="text-lg font-semibold flex items-center gap-2">
                    <SettingsIcon className="h-5 w-5" />
                    {t('settings.title')}
                  </h1>
                </div>
                <SettingsNav
                  activeCategory={activeCategory}
                  onCategoryChange={handleCategoryChange}
                  isAdmin={isAdmin}
                />
              </SheetContent>
            </Sheet>
            <h2 className="font-semibold">{getCategoryTitle()}</h2>
          </div>
        )}

        <div className="p-4 md:p-6 max-w-2xl">
          {!isMobile && (
            <h2 className="text-xl font-semibold mb-6">{getCategoryTitle()}</h2>
          )}
          <SectionErrorBoundary sectionName={getCategoryTitle()}>
            {renderContent()}
          </SectionErrorBoundary>
        </div>
      </main>
    </div>
  );
}
