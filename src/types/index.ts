
import type { Timestamp as FirestoreTimestamp } from 'firebase/firestore';

// Represents the data collected in the initial form, held in AppContext
export interface InitialDataContext {
  ne: string;
  reference: string;
  manager: string; // "De (Nombre Usuario)"
  date: Date; // Should always be a Date object in the context
  recipient: string; // "A:"
}

// Stricter types for form data and app context
export interface SolicitudData {
  id: string;

  monto?: number; // Will be number in form state due to Zod
  montoMoneda?: 'cordoba' | 'dolar' | 'euro';
  cantidadEnLetras?: string;

  consignatario?: string;
  declaracionNumero?: string;
  unidadRecaudadora?: string;
  codigo1?: string;
  codigo2?: string; // Codigo MUR

  banco?: 'BAC' | 'BANPRO' | 'BANCENTRO' | 'FICOSHA' | 'AVANZ' | 'ATLANTIDA' | 'ACCION POR CHEQUE/NO APLICA BANCO' | 'Otros';
  bancoOtros?: string;
  numeroCuenta?: string;
  monedaCuenta?: 'cordoba' | 'dolar' | 'euro' | 'Otros';
  monedaCuentaOtros?: string;

  elaborarChequeA?: string;
  elaborarTransferenciaA?: string;

  impuestosPagadosCliente?: boolean;
  impuestosPagadosRC?: string;
  impuestosPagadosTB?: string;
  impuestosPagadosCheque?: string;

  impuestosPendientesCliente?: boolean;
  soporte?: boolean;
  documentosAdjuntos?: boolean;

  constanciasNoRetencion?: boolean;
  constanciasNoRetencion1?: boolean;
  constanciasNoRetencion2?: boolean;

  pagoServicios?: boolean;
  tipoServicio?: 'COMIECO' | 'MARCHAMO' | 'FUMIGACION' | 'RECORRIDO' | 'EPN' | 'ANALISIS_Y_LABORATORIO' | 'OTROS';
  otrosTipoServicio?: string;
  facturaServicio?: string;
  institucionServicio?: string;

  correo?: string;
  observation?: string;
}


export interface AppUser {
  uid: string;
  email: string | null;
  displayName?: string | null;
  role?: 'revisor' | 'calificador' | 'autorevisor' | string;
}

// Represents the structure of each document in the "SolicitudCheques" collection
// Uses JS Date objects for client-side consistency. Conversion to Firestore Timestamp happens at write time.
export interface SolicitudRecord {
  examNe: string;
  examReference: string | null;
  examManager: string;
  examDate: Date | undefined; // Changed from Date
  examRecipient: string;

  solicitudId: string;

  monto: number | null;
  montoMoneda: string | null;
  cantidadEnLetras: string | null;

  consignatario: string | null;
  declaracionNumero: string | null;
  unidadRecaudadora: string | null;
  codigo1: string | null;
  codigo2: string | null;

  banco: string | null;
  bancoOtros: string | null;
  numeroCuenta: string | null;
  monedaCuenta: string | null;
  monedaCuentaOtros: string | null;

  elaborarChequeA: string | null;
  elaborarTransferenciaA: string | null;

  impuestosPagadosCliente: boolean;
  impuestosPagadosRC: string | null;
  impuestosPagadosTB: string | null;
  impuestosPagadosCheque: string | null;

  impuestosPendientesCliente: boolean;
  soporte: boolean;
  documentosAdjuntos: boolean;

  constanciasNoRetencion: boolean;
  constanciasNoRetencion1: boolean;
  constanciasNoRetencion2: boolean;

  pagoServicios: boolean;
  tipoServicio: string | null;
  otrosTipoServicio: string | null;
  facturaServicio: string | null;
  institucionServicio: string | null;

  correo: string | null;
  observation: string | null;

  savedAt: Date | undefined; // Changed from Date
  savedBy: string | null;

  paymentStatus?: string;
  paymentStatusLastUpdatedAt?: Date;
  paymentStatusLastUpdatedBy?: string;

  recepcionDCStatus?: boolean;
  recepcionDCLastUpdatedAt?: Date;
  recepcionDCLastUpdatedBy?: string;
}


// For exporting, it combines InitialDataContext-like info with SolicitudData-like info
export interface ExportableSolicitudContextData extends Omit<InitialDataContext, 'date'> {
  date?: Date | FirestoreTimestamp | null; // Keep FirestoreTimestamp for potential direct export use
  solicitudes?: SolicitudData[] | null;
  savedAt?: Date | FirestoreTimestamp | null;
  savedBy?: string | null;
}
