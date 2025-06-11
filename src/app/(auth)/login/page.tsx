
"use client";
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { LoginModal } from '@/components/auth/LoginModal';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
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
      } else if (user.role === 'revisor' || user.role === 'calificador' || user.role === 'admin' || user.role === 'autorevisor_plus') { 
        targetPath = '/database';
      }
      if (pathname !== targetPath) {
        router.push(targetPath);
      }
    }
  }, [user, loading, router, isClient, pathname]);

  const handleLoginSuccess = () => {
    // La redirección es manejada por el useEffect
  };

  if (!isClient || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center grid-bg">
        <Loader2 className="h-16 w-16 animate-spin text-white" />
      </div>
    );
  }

  if (user) { 
    return (
      <div className="min-h-screen flex items-center justify-center grid-bg">
        <Loader2 className="h-16 w-16 animate-spin text-white" />
        <p className="ml-3 text-white">Redirigiendo...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center grid-bg">
       <LoginModal
         isOpen={true}
         onClose={() => {
           if (pathname === '/login') router.push('/');
         }}
         onLoginSuccess={handleLoginSuccess}
       />
    </div>
  );
}
