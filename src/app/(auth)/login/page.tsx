
"use client";
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation'; // Added usePathname
import { LoginModal } from '@/components/auth/LoginModal';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname(); // Get current pathname
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || loading) return;
  
    if (user) {
      let targetPath = '/examiner'; // Default
      if (user.role === 'autorevisor') {
        targetPath = '/examiner';
      } else if (user.isStaticUser || user.role === 'revisor' || user.role === 'calificador') {
        targetPath = '/database';
      }
      // Only push if not already on the target path
      if (pathname !== targetPath) {
        router.push(targetPath);
      }
    }
  }, [user, loading, router, isClient, pathname]); // Added pathname to dependencies

  const handleLoginSuccess = () => {
    // Redirection is handled by the useEffect listening to AuthContext's 'user' state.
  };

  if (!isClient || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center grid-bg">
        <Loader2 className="h-16 w-16 animate-spin text-white" />
      </div>
    );
  }

  // If user exists and we are still on this page, it means redirection is pending.
  if (user) { 
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
         onClose={() => {
           // If user manually closes, behavior might depend on whether they are on "/" or "/login"
           // For "/login", perhaps redirect to "/" or just allow it to stay (though useEffect should redirect if logged in)
           if (pathname === '/login') router.push('/');
         }}
         onLoginSuccess={handleLoginSuccess}
       />
    </div>
  );
}
