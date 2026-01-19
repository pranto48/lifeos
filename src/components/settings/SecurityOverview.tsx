import { Shield } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function SecurityOverview() {
  const { language, t } = useLanguage();

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Shield className="h-5 w-5" /> {t('settings.security')}
          </CardTitle>
          <CardDescription>
            {language === 'bn' ? 'আপনার অ্যাকাউন্ট নিরাপত্তা ওভারভিউ।' : 'Your account security overview.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Shield className="h-4 w-4 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {language === 'bn' ? 'রো লেভেল সিকিউরিটি' : 'Row Level Security'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {language === 'bn' 
                    ? 'আপনার সব ডেটা ডেটাবেস-লেভেল সিকিউরিটি পলিসি দ্বারা সুরক্ষিত। শুধুমাত্র আপনি আপনার ডেটা অ্যাক্সেস করতে পারবেন।'
                    : 'All your data is protected with database-level security policies. Only you can access your data.'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {language === 'bn' ? 'ভল্ট নোট এনক্রিপশন' : 'Vault Notes Encryption'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {language === 'bn' 
                    ? 'ভল্ট নোট AES-256-GCM এনক্রিপশন এবং PBKDF2 কী ডেরিভেশন ব্যবহার করে। আপনার পাসফ্রেজ কখনই আপনার ব্রাউজার ছেড়ে যায় না।'
                    : 'Vault notes use AES-256-GCM encryption with PBKDF2 key derivation. Your passphrase never leaves your browser.'
                  }
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
