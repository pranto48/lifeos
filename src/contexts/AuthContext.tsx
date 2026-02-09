import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { isSelfHosted, selfHostedApi } from '@/lib/selfHostedConfig';

interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
  roles?: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Self-hosted auth provider using local backend API
function SelfHostedAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session token
    const token = localStorage.getItem('lifeos_token');
    if (token) {
      selfHostedApi.getSession().then((result) => {
        if (result?.user) {
          setUser({
            id: result.user.id,
            email: result.user.email,
            user_metadata: { full_name: result.user.full_name },
            roles: result.user.roles,
          });
        }
        setLoading(false);
      }).catch(() => {
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const result = await selfHostedApi.login(email, password);
      setUser({
        id: result.user.id,
        email: result.user.email,
        user_metadata: { full_name: result.user.full_name },
        roles: result.user.roles,
      });
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const result = await selfHostedApi.register(email, password, fullName);
      setUser({
        id: result.user.id,
        email: result.user.email,
        user_metadata: { full_name: result.user.full_name },
        roles: result.user.roles,
      });
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    await selfHostedApi.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, session: null, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// Cloud auth provider using Supabase
function CloudAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ? {
          id: session.user.id,
          email: session.user.email,
          user_metadata: session.user.user_metadata,
        } : null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ? {
        id: session.user.id,
        email: session.user.email,
        user_metadata: session.user.user_metadata,
      } : null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName }
      }
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  if (isSelfHosted()) {
    return <SelfHostedAuthProvider>{children}</SelfHostedAuthProvider>;
  }
  return <CloudAuthProvider>{children}</CloudAuthProvider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
