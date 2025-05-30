
"use client";
import type React from 'react';
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { InitialDataContext, SolicitudData, AppUser as AuthAppUser } from '@/types';
import { useAuth } from './AuthContext';
import { format } from 'date-fns';

export enum SolicitudStep {
  INITIAL_DATA = 1,
  PRODUCT_LIST = 2,
  PREVIEW = 3,
  SUCCESS = 4,
}

interface AppContextType {
  initialContextData: InitialDataContext | null;
  solicitudes: SolicitudData[];
  currentStep: SolicitudStep;
  editingSolicitud: SolicitudData | null;
  isAddProductModalOpen: boolean;
  setInitialContextData: (data: InitialDataContext) => void;
  addSolicitud: (solicitudData: Omit<SolicitudData, 'id'>) => void;
  updateSolicitud: (updatedSolicitud: SolicitudData) => void;
  deleteSolicitud: (solicitudId: string) => void;
  setCurrentStep: (step: SolicitudStep) => void;
  setEditingSolicitud: (solicitud: SolicitudData | null) => void;
  openAddProductModal: (solicitudToEdit?: SolicitudData | null) => void;
  closeAddProductModal: () => void;
  resetApp: () => void;

  // New state for inline detail view
  solicitudToViewInline: SolicitudData | null;
  setSolicitudToViewInline: (solicitud: SolicitudData | null) => void;
  isDetailViewInlineVisible: boolean;
  setIsDetailViewInlineVisible: (isVisible: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [initialContextData, setInitialContextDataState] = useState<InitialDataContext | null>(null);
  const [solicitudes, setSolicitudes] = useState<SolicitudData[]>([]);
  const [currentStep, setCurrentStepState] = useState<SolicitudStep>(SolicitudStep.INITIAL_DATA);
  const [editingSolicitud, setEditingSolicitudState] = useState<SolicitudData | null>(null);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);

  // New state for inline detail view
  const [solicitudToViewInline, setSolicitudToViewInlineState] = useState<SolicitudData | null>(null);
  const [isDetailViewInlineVisible, setIsDetailViewInlineVisibleState] = useState<boolean>(false);


  const { user: authUser } = useAuth();
  const [internalUser, setInternalUser] = useState<AuthAppUser | null>(authUser);

  const resetApp = useCallback(() => {
    setInitialContextDataState(null);
    setSolicitudes([]);
    setCurrentStepState(SolicitudStep.INITIAL_DATA);
    setEditingSolicitudState(null);
    setIsAddProductModalOpen(false);
    setSolicitudToViewInlineState(null); // Reset inline view state
    setIsDetailViewInlineVisibleState(false); // Reset inline view visibility
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


  const setInitialContextData = useCallback((data: InitialDataContext) => {
    setInitialContextDataState(prevData => ({ ...prevData, ...data }));
  }, []);

  const addSolicitud = useCallback((solicitudData: Omit<SolicitudData, 'id'>) => {
    if (!initialContextData || !initialContextData.ne) {
      console.error("NE from initialContextData is missing. Cannot generate Solicitud ID.");
      return;
    }
    const now = new Date();
    const datePart = format(now, 'yyyyMMdd');
    const timePart = format(now, 'HHmmss');
    const newId = `${initialContextData.ne}-${datePart}-${timePart}`;

    const newSolicitud: SolicitudData = { ...solicitudData, id: newId };
    setSolicitudes((prevSolicitudes) => [...prevSolicitudes, newSolicitud]);
  }, [initialContextData]);

  const updateSolicitud = useCallback((updatedSolicitud: SolicitudData) => {
    setSolicitudes((prevSolicitudes) =>
      prevSolicitudes.map((s) => (s.id === updatedSolicitud.id ? updatedSolicitud : s))
    );
    setEditingSolicitudState(null);
  }, []);

  const deleteSolicitud = useCallback((solicitudId: string) => {
    setSolicitudes((prevSolicitudes) => prevSolicitudes.filter((s) => s.id !== solicitudId));
    // If the deleted solicitud was being viewed inline, hide the detail view
    if (solicitudToViewInline?.id === solicitudId) {
      setIsDetailViewInlineVisibleState(false);
      setSolicitudToViewInlineState(null);
    }
  }, [solicitudToViewInline]);

  const setCurrentStep = useCallback((step: SolicitudStep) => {
    setCurrentStepState(step);
     // When navigating away from product list, hide inline detail
    if (step !== SolicitudStep.PRODUCT_LIST) {
      setIsDetailViewInlineVisibleState(false);
      setSolicitudToViewInlineState(null);
    }
  }, []);

  const setEditingSolicitud = useCallback((solicitud: SolicitudData | null) => {
    setEditingSolicitudState(solicitud);
  }, []);

  const openAddProductModal = useCallback((solicitudToEdit: SolicitudData | null = null) => {
    setEditingSolicitudState(solicitudToEdit);
    setIsAddProductModalOpen(true);
    setIsDetailViewInlineVisibleState(false); // Hide detail view when opening modal
    setSolicitudToViewInlineState(null);
  }, []);

  const closeAddProductModal = useCallback(() => {
    setIsAddProductModalOpen(false);
    setTimeout(() => setEditingSolicitudState(null), 150);
  }, []);

  // New setters for inline detail view
  const setSolicitudToViewInline = useCallback((solicitud: SolicitudData | null) => {
    setSolicitudToViewInlineState(solicitud);
    setIsDetailViewInlineVisibleState(!!solicitud); 
  }, []);

  const setIsDetailViewInlineVisible = useCallback((isVisible: boolean) => {
    setIsDetailViewInlineVisibleState(isVisible);
    if (!isVisible) {
      setSolicitudToViewInlineState(null); 
    }
  }, []);


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
