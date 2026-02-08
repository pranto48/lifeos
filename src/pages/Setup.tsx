import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import {
  Database,
  Server,
  User,
  CheckCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Shield,
  HardDrive,
  Key,
} from 'lucide-react';
import { selfHostedApi, markSetupComplete } from '@/lib/selfHostedConfig';

type Step = 'welcome' | 'database' | 'admin' | 'complete';

export default function Setup() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('welcome');
  const [loading, setLoading] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);

  // Database config
  const [dbType, setDbType] = useState<'postgresql' | 'mysql'>('postgresql');
  const [dbHost, setDbHost] = useState('localhost');
  const [dbPort, setDbPort] = useState('5432');
  const [dbName, setDbName] = useState('lifeos');
  const [dbUser, setDbUser] = useState('lifeos');
  const [dbPassword, setDbPassword] = useState('');

  // Admin config
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [adminName, setAdminName] = useState('');

  const handleTestConnection = async () => {
    setLoading(true);
    setTestSuccess(false);
    try {
      await selfHostedApi.testConnection({
        dbType,
        host: dbHost,
        port: parseInt(dbPort),
        database: dbName,
        username: dbUser,
        password: dbPassword,
      });
      setTestSuccess(true);
      toast({ title: 'Connection successful!', description: 'Database is reachable.' });
    } catch (err: any) {
      toast({
        title: 'Connection failed',
        description: err.message || 'Could not connect to the database.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async () => {
    if (adminPassword !== adminConfirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (adminPassword.length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    if (!adminEmail.includes('@')) {
      toast({ title: 'Please enter a valid email', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      await selfHostedApi.initializeDatabase({
        dbType,
        host: dbHost,
        port: parseInt(dbPort),
        database: dbName,
        username: dbUser,
        password: dbPassword,
        adminEmail,
        adminPassword,
        adminName: adminName || 'Administrator',
      });

      localStorage.setItem('lifeos_db_type', dbType);
      markSetupComplete();
      setStep('complete');
      toast({ title: 'Setup complete!', description: 'LifeOS is ready to use.' });
    } catch (err: any) {
      toast({
        title: 'Setup failed',
        description: err.message || 'Could not initialize database.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const stepVariants = {
    initial: { opacity: 0, x: 30 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 },
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4"
          >
            <HardDrive className="w-8 h-8 text-primary" />
          </motion.div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            <span className="text-primary">LifeOS</span> Setup
          </h1>
          <p className="text-muted-foreground">Self-hosted installation wizard</p>
        </div>

        {/* Progress indicators */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {(['welcome', 'database', 'admin', 'complete'] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${
                s === step ? 'w-8 bg-primary' : i < ['welcome', 'database', 'admin', 'complete'].indexOf(step) ? 'w-4 bg-primary/60' : 'w-4 bg-muted'
              }`}
            />
          ))}
        </div>

        <div className="glass-card rounded-2xl p-8">
          <AnimatePresence mode="wait">
            {/* Step 1: Welcome */}
            {step === 'welcome' && (
              <motion.div key="welcome" variants={stepVariants} initial="initial" animate="animate" exit="exit">
                <div className="text-center space-y-4">
                  <Server className="w-12 h-12 text-primary mx-auto" />
                  <h2 className="text-xl font-semibold text-foreground">Welcome to LifeOS</h2>
                  <p className="text-muted-foreground text-sm">
                    Set up your self-hosted instance by connecting to your database and creating an admin account.
                  </p>
                  <div className="grid grid-cols-2 gap-3 mt-6">
                    <div className="p-3 rounded-lg bg-muted/50 border border-border text-left">
                      <Database className="w-5 h-5 text-primary mb-1" />
                      <p className="text-sm font-medium">PostgreSQL</p>
                      <p className="text-xs text-muted-foreground">Recommended</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 border border-border text-left">
                      <Database className="w-5 h-5 text-primary mb-1" />
                      <p className="text-sm font-medium">MySQL</p>
                      <p className="text-xs text-muted-foreground">XAMPP compatible</p>
                    </div>
                  </div>
                  <Button className="w-full mt-4" onClick={() => setStep('database')}>
                    Get Started <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Database Configuration */}
            {step === 'database' && (
              <motion.div key="database" variants={stepVariants} initial="initial" animate="animate" exit="exit">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">Database Configuration</h2>
                  </div>

                  <div className="space-y-2">
                    <Label>Database Type</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDbType('postgresql');
                          setDbPort('5432');
                          setTestSuccess(false);
                        }}
                        className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                          dbType === 'postgresql'
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'bg-muted/30 border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        PostgreSQL
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDbType('mysql');
                          setDbPort('3306');
                          setTestSuccess(false);
                        }}
                        className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                          dbType === 'mysql'
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'bg-muted/30 border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        MySQL / MariaDB
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="dbHost">Server Host</Label>
                      <Input
                        id="dbHost"
                        value={dbHost}
                        onChange={(e) => { setDbHost(e.target.value); setTestSuccess(false); }}
                        placeholder="localhost"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dbPort">Port</Label>
                      <Input
                        id="dbPort"
                        value={dbPort}
                        onChange={(e) => { setDbPort(e.target.value); setTestSuccess(false); }}
                        placeholder={dbType === 'postgresql' ? '5432' : '3306'}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dbName">Database Name</Label>
                    <Input
                      id="dbName"
                      value={dbName}
                      onChange={(e) => { setDbName(e.target.value); setTestSuccess(false); }}
                      placeholder="lifeos"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="dbUser">Username</Label>
                      <Input
                        id="dbUser"
                        value={dbUser}
                        onChange={(e) => { setDbUser(e.target.value); setTestSuccess(false); }}
                        placeholder={dbType === 'postgresql' ? 'lifeos' : 'root'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dbPassword">Password</Label>
                      <Input
                        id="dbPassword"
                        type="password"
                        value={dbPassword}
                        onChange={(e) => { setDbPassword(e.target.value); setTestSuccess(false); }}
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleTestConnection}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : testSuccess ? (
                      <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                    ) : (
                      <Database className="w-4 h-4 mr-2" />
                    )}
                    {testSuccess ? 'Connection Verified' : 'Test Connection'}
                  </Button>

                  <div className="flex gap-2 pt-2">
                    <Button variant="ghost" onClick={() => setStep('welcome')}>
                      <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => setStep('admin')}
                      disabled={!testSuccess}
                    >
                      Continue <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Admin Account */}
            {step === 'admin' && (
              <motion.div key="admin" variants={stepVariants} initial="initial" animate="animate" exit="exit">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">Create Admin Account</h2>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adminName">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="adminName"
                        className="pl-10"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        placeholder="System Administrator"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adminEmail">Email Address</Label>
                    <div className="relative">
                      <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="adminEmail"
                        type="email"
                        className="pl-10"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="admin@example.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adminPassword">Password</Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="adminPassword"
                        type="password"
                        className="pl-10"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="Min 6 characters"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adminConfirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="adminConfirmPassword"
                        type="password"
                        className="pl-10"
                        value={adminConfirmPassword}
                        onChange={(e) => setAdminConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="ghost" onClick={() => setStep('database')}>
                      <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleInitialize}
                      disabled={loading || !adminEmail || !adminPassword}
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      Initialize LifeOS
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Complete */}
            {step === 'complete' && (
              <motion.div key="complete" variants={stepVariants} initial="initial" animate="animate" exit="exit">
                <div className="text-center space-y-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                  >
                    <CheckCircle className="w-16 h-16 text-primary mx-auto" />
                  </motion.div>
                  <h2 className="text-xl font-semibold text-foreground">Setup Complete!</h2>
                  <p className="text-muted-foreground text-sm">
                    LifeOS has been configured successfully. You can now sign in with your admin credentials.
                  </p>
                  <div className="p-4 rounded-lg bg-muted/50 border border-border text-left text-sm space-y-1">
                    <p><span className="text-muted-foreground">Database:</span> <span className="font-medium">{dbType === 'postgresql' ? 'PostgreSQL' : 'MySQL'}</span></p>
                    <p><span className="text-muted-foreground">Host:</span> <span className="font-medium">{dbHost}:{dbPort}</span></p>
                    <p><span className="text-muted-foreground">Admin:</span> <span className="font-medium">{adminEmail}</span></p>
                  </div>
                  <Button className="w-full" onClick={() => navigate('/auth')}>
                    Go to Sign In <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          LifeOS Self-Hosted • Configure via .env or this wizard
        </p>
      </motion.div>
    </div>
  );
}
