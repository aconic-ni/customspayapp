
"use client";
import type React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut, type User as FirebaseUser, type Auth } from 'firebase/auth';
import { auth, db } from '@/lib/firebase'; // Firebase auth instance and db
import { doc, getDoc } from 'firebase/firestore';
import type { AppUser } from '@/types';
import { useFirebaseApp } from './FirebaseAppContext';

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  // setStaticUser: (user: AppUser | null) => void; // Eliminado
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { isFirebaseInitialized } = useFirebaseApp();

  useEffect(() => {
    if (!isFirebaseInitialized) {
      setLoading(true); 
      return;
    }

    setLoading(true);

    const unsubscribe = onAuthStateChanged(auth as Auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        let userRole: string | undefined = undefined;
        try {
          const userRoleDocRef = doc(db, "userRoles", firebaseUser.uid);
          const userRoleSnap = await getDoc(userRoleDocRef);
          if (userRoleSnap.exists()) {
            userRole = userRoleSnap.data()?.role as string | undefined;
            console.log(`Role for ${firebaseUser.email}: ${userRole}`);
          } else {
            console.log(`No role document found for ${firebaseUser.email}`);
          }
        } catch (roleError) {
          console.error("Error fetching user role for " + firebaseUser.email + ":", roleError);
        }

        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          // isStaticUser: false, // Eliminado
          role: userRole,
        });
      } else {
        setUser(null); // Si no hay usuario de Firebase, el usuario es null
      }
      setLoading(false); 
    });

    return () => unsubscribe();
  }, [isFirebaseInitialized]); // Dependencias simplificadas

  const logout = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth as Auth);
      setUser(null); // Aseguramos que el usuario se limpie localmente también
    } catch (error) {
      console.error("Error signing out: ", error);
    } finally {
      setLoading(false); // Se establece loading a false independientemente del resultado
    }
  };
  
  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
