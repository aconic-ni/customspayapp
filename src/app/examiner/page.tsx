
"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useAppContext, SolicitudStep } from '@/context/AppContext';
import { AppShell } from '@/components/layout/AppShell';
import { InitialDataForm } from '@/components/examiner/InitialInfoForm';
import { ProductListScreen } from '@/components/examiner/ProductListScreen';
import { PreviewScreen } from '@/components/examiner/PreviewScreen';
import { SuccessModal } from '@/components/examiner/SuccessModal';
import { AddProductModal } from '@/components/examiner/AddProductModal'; // Import AddProductModal
import { Loader2 } from 'lucide-react';

export default function SolicitudPage() {
  const { user, loading: authLoading } = useAuth();
  const { currentStep } = useAppContext();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || authLoading) {
      return;
    }

    if (!user) {
      router.push('/login');
    }
  }, [user, authLoading, router, isClient]);

  useEffect(() => {
    if (!isClient) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = ''; 
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isClient]);

  if (!isClient || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center grid-bg">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
        <p className="ml-4 text-lg text-white">Cargando aplicación...</p>
      </div>
    );
  }

  if (!user) {
    // This state is usually brief as the useEffect above will redirect.
    // Or it might be shown if context update is slightly delayed after redirect from login.
    return (
      <div className="min-h-screen flex items-center justify-center grid-bg">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
        <p className="text-lg ml-3 text-white">Verificando sesión...</p>
      </div>
    );
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case SolicitudStep.INITIAL_DATA:
        return <InitialDataForm />;
      case SolicitudStep.PRODUCT_LIST:
        return <ProductListScreen />;
      case SolicitudStep.PREVIEW:
        return <PreviewScreen />;
      case SolicitudStep.SUCCESS:
        // SuccessModal is rendered below based on currentStep
        // PreviewScreen is rendered so user can see what was successful
        return <PreviewScreen />; 
      default:
        return <InitialDataForm />;
    }
  };

  return (
    <AppShell>
      <div className="py-2 md:py-5">
         {renderStepContent()}
      </div>
      <AddProductModal /> {/* Ensure AddProductModal is always in the render tree */}
      {currentStep === SolicitudStep.SUCCESS && <SuccessModal />}
    </AppShell>
  );
}
