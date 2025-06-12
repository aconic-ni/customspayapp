
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
        let originalRoleFromDb: string | undefined = undefined;
        let canReviewUserEmails: string[] | undefined = undefined; // Changed from canReviewUserEmail
        try {
          const userRoleDocRef = doc(db, "userRoles", firebaseUser.uid);
          const userRoleSnap = await getDoc(userRoleDocRef);
          if (userRoleSnap.exists()) {
            const roleData = userRoleSnap.data();
            originalRoleFromDb = roleData?.role as string | undefined;
            if (originalRoleFromDb) {
              userRole = originalRoleFromDb.trim().toLowerCase(); // Normalize role
            }
            // Fetch canReviewUserEmails as an array
            if (Array.isArray(roleData?.canReviewUserEmails)) {
              canReviewUserEmails = roleData.canReviewUserEmails.filter(email => typeof email === 'string' && email.trim() !== '');
            } else if (typeof roleData?.canReviewUserEmails === 'string' && roleData.canReviewUserEmails.trim() !== '') {
              // Handle legacy string by converting to array (optional, good for transition)
              canReviewUserEmails = [roleData.canReviewUserEmails.trim()];
            }
            console.log(`Role for ${firebaseUser.email}: ${userRole} (Original from DB: "${originalRoleFromDb}"), Can Review Emails: ${canReviewUserEmails?.join(', ') || 'N/A'}`);
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
          role: userRole,
          canReviewUserEmails: canReviewUserEmails, // Store the array
        });
      } else {
        setUser(null); 
      }
      setLoading(false); 
    });

    return () => unsubscribe();
  }, [isFirebaseInitialized]);

  const logout = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth as Auth);
      setUser(null); 
    } catch (error) {
      console.error("Error signing out: ", error);
    } finally {
      setLoading(false); 
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
