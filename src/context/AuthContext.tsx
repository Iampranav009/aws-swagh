import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, type User, signOut as firebaseSignOut, setPersistence, browserLocalPersistence } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, logout: async () => {} });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set persistence so users stay logged in across sessions (cookie-like remember me)
    try {
      setPersistence(auth, browserLocalPersistence).catch(() => {});
      const unsubscribe = onAuthStateChanged(auth, (u) => {
        setUser(u);
        setLoading(false);
      }, (error) => {
        console.error("Auth observer error:", error);
        setLoading(false);
      });
      return unsubscribe;
    } catch (e) {
      console.warn("Firebase not properly configured. Auth will not work.");
      setLoading(false);
    }
  }, []);

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch(e) {}
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
