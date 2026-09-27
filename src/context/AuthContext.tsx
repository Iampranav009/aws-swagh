import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  roleLoading: boolean;
  sbclCode: string;
  isAdmin: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, roleLoading: true, sbclCode: '', isAdmin: false, logout: async () => {} });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(true);
  const [sbclCode, setSbclCode] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) console.error('Supabase session error:', error);
      const sessionUser = data.session?.user ?? null;
      setRoleLoading(Boolean(sessionUser));
      setUser(sessionUser);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;
      setRoleLoading(Boolean(sessionUser));
      setUser(sessionUser);
      setLoading(false);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setSbclCode('');
      setIsAdmin(false);
      setRoleLoading(false);
      return;
    }
    setRoleLoading(true);
    Promise.all([
      supabase.from('sbcl_profiles').select('sbcl_code').eq('user_id', user.id).maybeSingle(),
      supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle(),
    ]).then(([profile, admin]) => {
      setSbclCode(profile.data?.sbcl_code ? String(profile.data.sbcl_code).toUpperCase() : '');
      setIsAdmin(Boolean(admin.data));
    }).catch(() => {
      setSbclCode('');
      setIsAdmin(false);
    }).finally(() => setRoleLoading(false));
  }, [user]);

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, roleLoading, sbclCode, isAdmin, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
