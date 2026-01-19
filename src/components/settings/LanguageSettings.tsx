import { Languages } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function LanguageSettings() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Languages className="h-5 w-5" /> {t('settings.language')}
          </CardTitle>
          <CardDescription>
            {language === 'bn' ? 'অ্যাপ্লিকেশনের ভাষা পরিবর্তন করুন।' : 'Change the application language.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('settings.language')}</Label>
            <Select value={language} onValueChange={(v: 'bn' | 'en') => setLanguage(v)}>
              <SelectTrigger className="w-full bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bn">
                  <span className="flex items-center gap-2">
                    🇧🇩 {t('settings.bangla')}
                  </span>
                </SelectItem>
                <SelectItem value="en">
                  <span className="flex items-center gap-2">
                    🇬🇧 {t('settings.english')}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {language === 'bn' ? 'এই সেটিং পুরো অ্যাপে প্রযোজ্য হবে।' : 'This setting will be applied across the entire app.'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
