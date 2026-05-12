import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth, db, sanitizeForFirestore } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { AppUser, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  profile: AppUser | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Sync profile
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
          const newProfile: AppUser = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            role: user.email === 'abiworks.ng@gmail.com' ? UserRole.ADMIN : UserRole.PRO,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
          };
          await setDoc(userDocRef, sanitizeForFirestore(newProfile));
          setProfile(newProfile);
        } else {
          // Update last login
          await updateDoc(userDocRef, sanitizeForFirestore({
            lastLogin: serverTimestamp()
          }));
          const data = userDoc.data() as AppUser;
          // Security: Force admin role for master account even if database is out of sync
          if (user.email === 'abiworks.ng@gmail.com' && data.role !== UserRole.ADMIN) {
             data.role = UserRole.ADMIN;
             await updateDoc(userDocRef, sanitizeForFirestore({ role: UserRole.ADMIN }));
          }
          setProfile({ ...data, lastLogin: new Date() }); // local update for immediate UI
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
