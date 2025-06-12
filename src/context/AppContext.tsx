
"use client";
import type React from 'react';
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { InitialDataContext, SolicitudData, AppUser as AuthAppUser } from '@/types';
import { useAuth } from './AuthContext';
import { format } from 'date-fns';
import { useToast } from "@/hooks/use-toast"; 

export enum SolicitudStep {
  INITIAL_DATA = 1,
  PRODUCT_LIST = 2,
  PREVIEW = 3,
  SUCCESS = 4,
}

interface AppContextType {
  initialContextData: Omit<InitialDataContext, 'reference'> | null;
  solicitudes: SolicitudData[];
  currentStep: SolicitudStep;
  editingSolicitud: SolicitudData | null;
  isAddProductModalOpen: boolean;
  setInitialContextData: (data: Omit<InitialDataContext, 'reference'>) => void;
  addSolicitud: (solicitudData: Omit<SolicitudData, 'id'>) => void;
  updateSolicitud: (updatedSolicitud: SolicitudData) => void;
  deleteSolicitud: (solicitudId: string) => void;
  setCurrentStep: (step: SolicitudStep) => void;
  setEditingSolicitud: (solicitud: SolicitudData | null) => void;
  openAddProductModal: (solicitudToEdit?: SolicitudData | null) => void;
  closeAddProductModal: () => void;
  resetApp: () => void;
  solicitudToViewInline: SolicitudData | null;
  setSolicitudToViewInline: (solicitud: SolicitudData | null) => void;
  isDetailViewInlineVisible: boolean;
  setIsDetailViewInlineVisible: (isVisible: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [initialContextData, setInitialContextDataState] = useState<Omit<InitialDataContext, 'reference'> | null>(null);
  const [solicitudes, setSolicitudes] = useState<SolicitudData[]>([]);
  const [currentStep, setCurrentStepState] = useState<SolicitudStep>(SolicitudStep.INITIAL_DATA);
  const [editingSolicitud, setEditingSolicitudState] = useState<SolicitudData | null>(null);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [solicitudToViewInline, setSolicitudToViewInlineState] = useState<SolicitudData | null>(null);
  const [isDetailViewInlineVisible, setIsDetailViewInlineVisibleState] = useState<boolean>(false);
  const { toast } = useToast(); 
  const { user: authUser } = useAuth();
  const [internalUser, setInternalUser] = useState<AuthAppUser | null>(authUser);

  const resetApp = useCallback(() => {
    setInitialContextDataState(null);
    setSolicitudes([]);
    setCurrentStepState(SolicitudStep.INITIAL_DATA);
    setEditingSolicitudState(null);
    setIsAddProductModalOpen(false);
    setSolicitudToViewInlineState(null); 
    setIsDetailViewInlineVisibleState(false); 
  }, []);


  useEffect(() => {
    const authUserChanged = authUser?.uid !== internalUser?.uid ||
                           (authUser && !internalUser) ||
                           (!authUser && internalUser);

    if (authUserChanged) {
      resetApp();
      setInternalUser(authUser);
    }
  }, [authUser, internalUser, resetApp]);


  const setInitialContextData = useCallback((data: Omit<InitialDataContext, 'reference'>) => {
    setInitialContextDataState(prevData => ({ ...prevData, ...data }));
  }, []);

  const addSolicitud = useCallback((solicitudData: Omit<SolicitudData, 'id'>) => {
    if (!initialContextData || !initialContextData.ne) {
      console.error("NE from initialContextData is missing. Cannot generate Solicitud ID.");
      toast({
        title: "Error al añadir",
        description: "Falta el NE en los datos iniciales para generar el ID de la solicitud.",
        variant: "destructive",
      });
      return;
    }
    const now = new Date();
    const datePart = format(now, 'yyyyMMdd');
    const timePart = format(now, 'HHmmss');
    const newId = `${initialContextData.ne}-${datePart}-${timePart}`;

    const newSolicitud: SolicitudData = { ...solicitudData, id: newId };
    setSolicitudes((prevSolicitudes) => [...prevSolicitudes, newSolicitud]);
    toast({
      title: "Solicitud Añadida",
      description: `La solicitud con ID ${newId} ha sido añadida a la lista.`,
    });
  }, [initialContextData, toast]);

  const updateSolicitud = useCallback((updatedSolicitud: SolicitudData) => {
    setSolicitudes((prevSolicitudes) =>
      prevSolicitudes.map((s) => (s.id === updatedSolicitud.id ? updatedSolicitud : s))
    );
    setEditingSolicitudState(null);
    toast({
      title: "Solicitud Actualizada",
      description: `La solicitud con ID ${updatedSolicitud.id} ha sido actualizada.`,
    });
  }, [toast]);

  const deleteSolicitud = useCallback((solicitudId: string) => {
    console.log(`[AppContext] DELETE: Attempting to delete solicitud with ID: ${solicitudId}`);
    console.log('[AppContext] DELETE: Solicitudes BEFORE deletion:', JSON.stringify(solicitudes));

    const updatedSolicitudes = solicitudes.filter((s) => {
      // console.log(`[AppContext] DELETE: Comparing ${s.id} with ${solicitudId}. Match: ${s.id === solicitudId}`);
      return s.id !== solicitudId;
    });
    
    console.log('[AppContext] DELETE: Solicitudes AFTER filtering:', JSON.stringify(updatedSolicitudes));
    
    if (solicitudes.length === updatedSolicitudes.length) {
        console.warn(`[AppContext] DELETE: Solicitud ID ${solicitudId} NOT FOUND in current list. No change made.`);
    } else {
        console.log(`[AppContext] DELETE: Solicitud ID ${solicitudId} found and removed. Updating state.`);
    }

    setSolicitudes(updatedSolicitudes);

    if (solicitudToViewInline?.id === solicitudId) {
      setIsDetailViewInlineVisibleState(false);
      setSolicitudToViewInlineState(null);
    }
    toast({
      title: "Solicitud Eliminada",
      description: `La solicitud con ID ${solicitudId} ha sido eliminada de la lista.`,
    });
  }, [solicitudes, solicitudToViewInline, toast, setIsDetailViewInlineVisibleState, setSolicitudToViewInlineState]);


  const setCurrentStep = useCallback((step: SolicitudStep) => {
    setCurrentStepState(step);
    if (step !== SolicitudStep.PRODUCT_LIST) {
      setIsDetailViewInlineVisibleState(false);
      setSolicitudToViewInlineState(null);
    }
  }, [setIsDetailViewInlineVisibleState, setSolicitudToViewInlineState]);

  const setEditingSolicitud = useCallback((solicitud: SolicitudData | null) => {
    setEditingSolicitudState(solicitud);
  }, []);

  const openAddProductModal = useCallback((solicitudToEdit: SolicitudData | null = null) => {
    setEditingSolicitudState(solicitudToEdit);
    setIsAddProductModalOpen(true);
    setIsDetailViewInlineVisibleState(false); 
    setSolicitudToViewInlineState(null);
  }, [setIsDetailViewInlineVisibleState, setSolicitudToViewInlineState]);

  const closeAddProductModal = useCallback(() => {
    setIsAddProductModalOpen(false);
    setTimeout(() => setEditingSolicitudState(null), 150);
  }, []);

  const setSolicitudToViewInline = useCallback((solicitud: SolicitudData | null) => {
    setSolicitudToViewInlineState(solicitud);
    setIsDetailViewInlineVisibleState(!!solicitud); 
  }, [setIsDetailViewInlineVisibleState]);

  const setIsDetailViewInlineVisible = useCallback((isVisible: boolean) => {
    setIsDetailViewInlineVisibleState(isVisible);
    if (!isVisible) {
      setSolicitudToViewInlineState(null); 
    }
  }, [setSolicitudToViewInlineState]);


  return (
    <AppContext.Provider
      value={{
        initialContextData,
        solicitudes,
        currentStep,
        editingSolicitud,
        isAddProductModalOpen,
        setInitialContextData,
        addSolicitud,
        updateSolicitud,
        deleteSolicitud,
        setCurrentStep,
        setEditingSolicitud,
        openAddProductModal,
        closeAddProductModal,
        resetApp,
        solicitudToViewInline,
        setSolicitudToViewInline,
        isDetailViewInlineVisible,
        setIsDetailViewInlineVisible,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

