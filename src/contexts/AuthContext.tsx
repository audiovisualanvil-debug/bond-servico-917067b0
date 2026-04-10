import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
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
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch profile and role with retry (profile may not exist yet during signup)
  const fetchUserData = async (userId: string, retries = 3) => {
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await typedFrom('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        if (retries > 0) {
          // Profile might not be created yet during signup, retry after delay
          await new Promise(resolve => setTimeout(resolve, 500));
          return fetchUserData(userId, retries - 1);
        }
        console.error('Error fetching profile:', profileError);
        return;
      }
      setProfile(profileData as Profile);

      // Fetch roles (user may have multiple)
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

      // Prioritize admin role when user has multiple roles
      const roles = (rolesData || []).map((r: any) => r.role as AppRole);
      const primaryRole = roles.includes('admin') ? 'admin' : (roles[0] || null);
      setRole(primaryRole);
    } catch (error) {
      console.error('Error in fetchUserData:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer Supabase calls with setTimeout
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
        }
        
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserData(session.user.id);
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

  // User creation is handled exclusively by the admin create-user edge function.
  // Self-registration is disabled — no client-side signUp method is exposed.

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        session,
        profile, 
        role, 
        isLoading, 
        isAuthenticated: !!user,
        signIn,
        signOut,
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
