
"use client";
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { LoginModal } from '@/components/auth/LoginModal';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
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
    setIsLoginModalOpen(false); 
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
    <div className="min-h-screen flex flex-col items-center justify-center grid-bg text-white p-4">
      <main className="flex flex-col items-center text-center">
        <div
          id="appLogo"
          className="logo-pulse mb-8 cursor-pointer block mx-auto"
          onClick={() => setIsLoginModalOpen(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setIsLoginModalOpen(true)}
          aria-label="Abrir inicio de sesión"
        >
          <Building2 data-ai-hint="office building" className="h-32 w-32 text-white block mx-auto" strokeWidth={1.5} />
        </div>
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold">CustomsFA-L</h1>
          <p className="text-blue-200 mt-1 text-sm md:text-base">Sistema de GESTION DE PAGOS</p>
        </header>
        <Button
          onClick={() => setIsLoginModalOpen(true)}
          className="text-white bg-green-600 hover:bg-green-700 text-lg px-8 py-4"
          size="lg"
        >
          Iniciar Sesión
        </Button>
      </main>

      <footer className="absolute bottom-8 text-center text-sm text-blue-300">
        Stvaer © 2025 <em className="italic">for</em> ACONIC
      </footer>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
