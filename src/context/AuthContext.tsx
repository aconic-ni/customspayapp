
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
  setStaticUser: (user: AppUser | null) => void; // To set static user
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { isFirebaseInitialized } = useFirebaseApp();

  useEffect(() => {
    if (!isFirebaseInitialized) {
      setLoading(true); // Keep loading if Firebase isn't ready
      return;
    }

    // Set loading to true when we start listening for auth changes.
    setLoading(true);

    const unsubscribe = onAuthStateChanged(auth as Auth, async (firebaseUser: FirebaseUser | null) => {
      const currentLocalUserIsStatic = user?.isStaticUser;

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
          isStaticUser: false,
          role: userRole,
        });
      } else {
        // No Firebase user.
        // If the current local user is not static, set to null.
        // If it is static, keep them (static login persists until explicit static logout).
        if (!currentLocalUserIsStatic) {
            setUser(null);
        }
      }
      setLoading(false); 
    });

    return () => unsubscribe();
  // Only depend on isFirebaseInitialized. auth instance is stable.
  // Removing `user` from dependencies here is key to prevent re-subscribing `onAuthStateChanged`
  // when the `user` state itself changes due to login/logout or role fetch.
  }, [isFirebaseInitialized]);

  const logout = async () => {
    const wasStaticUser = user?.isStaticUser;
    setLoading(true);
    try {
      if (!wasStaticUser) {
        await firebaseSignOut(auth as Auth);
        // For Firebase users, onAuthStateChanged will handle setting user to null and loading to false.
      } else {
        // For static users, explicitly clear user and set loading to false.
        setUser(null);
        setLoading(false);
      }
    } catch (error) {
      console.error("Error signing out: ", error);
      // If Firebase signout fails, ensure loading is false.
      // For static user logout, loading is already handled if this block is reached.
      if (!wasStaticUser) {
          setLoading(false);
      }
    }
  };

  const setStaticUser = (staticUser: AppUser | null) => {
    setUser(staticUser);
    setLoading(false); // Static user state is immediately known.
  };
  
  return (
    <AuthContext.Provider value={{ user, loading, logout, setStaticUser }}>
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
