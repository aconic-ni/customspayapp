
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

    // If a static user is already set, don't override with Firebase auth state immediately
    // This allows static login to work without being clobbered by onAuthStateChanged if it runs slightly later
    if (user?.isStaticUser) {
      setLoading(false);
      return;
    }

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
          isStaticUser: false,
          role: userRole, // Set the fetched role
        });
      } else {
        // No Firebase user, check if a static user was previously set and clear it if necessary
        // This handles the case where a static user logs out, or if a Firebase session ends.
        if (user && !user.isStaticUser) { // Only clear if it wasn't a static user already logged out
            setUser(null);
        } else if (!user) { // If user is already null (e.g. initial load, no one logged in)
            setUser(null);
        }
        // if user is static and firebaseUser is null, we keep the static user.
      }
      setLoading(false); // Set loading false after user and role are processed
    });

    return () => unsubscribe();
  // Ensure user.isStaticUser is a dependency so that if a static user logs out and setStaticUser(null) is called,
  // this effect re-evaluates and onAuthStateChanged can take over if needed.
  }, [isFirebaseInitialized, user?.isStaticUser]);

  const logout = async () => {
    setLoading(true);
    const isLoggingOutStaticUser = user?.isStaticUser;
    try {
      if (!isLoggingOutStaticUser) {
        await firebaseSignOut(auth as Auth);
      }
      // For both static and Firebase users, setUser(null) is critical.
      // onAuthStateChanged will handle setting user to null for Firebase users.
      // For static users, this explicitly clears them.
      setUser(null);
    } catch (error) {
      console.error("Error signing out: ", error);
    } finally {
      // setLoading(false) will be handled by onAuthStateChanged for Firebase logout,
      // or immediately for static user logout.
      if (isLoggingOutStaticUser) {
        setLoading(false);
      }
    }
  };

  const setStaticUser = (staticUser: AppUser | null) => {
    setUser(staticUser);
    setLoading(false);
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
