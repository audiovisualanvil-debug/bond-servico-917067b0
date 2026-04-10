import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session, AuthenticatorAssuranceLevels } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { typedFrom } from '@/integrations/supabase/helpers';
import { AppRole, Profile } from '@/types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  needsMFA: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  completeMFA: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsMFA, setNeedsMFA] = useState(false);

  const checkMFAStatus = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (error) return false;
      
      // If user has enrolled MFA factors but current level is aal1, they need to verify
      if (data.currentLevel === 'aal1' && data.nextLevel === 'aal2') {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Fetch profile and role with retry (profile may not exist yet during signup)
  const fetchUserData = async (userId: string, retries = 3) => {
    try {
      const { data: profileData, error: profileError } = await typedFrom('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
          return fetchUserData(userId, retries - 1);
        }
        console.error('Error fetching profile:', profileError);
        return;
      }
      setProfile(profileData as Profile);

      const { data: rolesData, error: roleError } = await typedFrom('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (roleError) {
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
          return fetchUserData(userId, retries - 1);
        }
        console.error('Error fetching role:', roleError);
        return;
      }

      const roles = (rolesData || []).map((r: any) => r.role as AppRole);
      const primaryRole = roles.includes('admin') ? 'admin' : (roles[0] || null);
      setRole(primaryRole);
    } catch (error) {
      console.error('Error in fetchUserData:', error);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Check MFA status
          const mfaRequired = await checkMFAStatus();
          setNeedsMFA(mfaRequired);
          
          if (!mfaRequired) {
            setTimeout(() => {
              fetchUserData(session.user.id);
            }, 0);
          }
        } else {
          setProfile(null);
          setRole(null);
          setNeedsMFA(false);
        }
        
        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const mfaRequired = await checkMFAStatus();
        setNeedsMFA(mfaRequired);
        
        if (!mfaRequired) {
          fetchUserData(session.user.id);
        }
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        return { error };
      }
      
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const completeMFA = () => {
    setNeedsMFA(false);
    if (session?.user) {
      fetchUserData(session.user.id);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
    setNeedsMFA(false);
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        session,
        profile, 
        role, 
        isLoading, 
        isAuthenticated: !!user && !needsMFA,
        needsMFA,
        signIn,
        signOut,
        completeMFA,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
