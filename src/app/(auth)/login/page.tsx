
"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoginModal } from '@/components/auth/LoginModal';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || loading) return;
  
    if (user) {
      if (user.role === 'autorevisor') {
        router.push('/examiner');
      } else if (user.isStaticUser || user.role === 'revisor' || user.role === 'calificador') {
        router.push('/database');
      } else {
        router.push('/examiner'); // fallback para otros usuarios
      }
    }
  }, [user, loading, router, isClient]);

  const handleLoginSuccess = () => {
    // Redirection is handled by the useEffect listening to AuthContext's 'user' state.
    // Modal visibility for this page is always true until redirection.
  };

  if (!isClient || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center grid-bg">
        <Loader2 className="h-16 w-16 animate-spin text-white" />
      </div>
    );
  }

  if (user) { // If user exists, it means redirection is in progress or about to happen
    return (
      <div className="min-h-screen flex items-center justify-center grid-bg">
        <Loader2 className="h-16 w-16 animate-spin text-white" />
        <p className="ml-3 text-white">Redirigiendo...</p>
      </div>
    );
  }

  // Only render LoginModal if not loading, client is ready, and no user (meaning they need to log in)
  return (
    <div className="min-h-screen flex items-center justify-center grid-bg">
       <LoginModal
         isOpen={true} // This modal is always open on this dedicated login page
         onClose={() => router.push('/')} // If user manually closes, redirect to home or handle appropriately
         onLoginSuccess={handleLoginSuccess}
       />
    </div>
  );
}
