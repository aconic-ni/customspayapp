
"use client";
import React, { useState, useEffect } from 'react';
import { doc, getDoc, Timestamp as FirestoreTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { SolicitudRecord, InitialDataContext } from '@/types';
import { Loader2, ArrowLeft, Printer, CheckSquare, Square, Banknote, Landmark, Hash, User, FileText, Mail, MessageSquare, Building, Code, CalendarDays, Info, Send, Users, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card'; // Removed CardHeader, CardTitle as they are not used directly here for the main card
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface DatabaseSolicitudDetailViewProps {
  id: string;
  onBackToList?: () => void;
  isInlineView?: boolean;
}

const DetailItem: React.FC<{ label: string; value?: string | number | null | boolean | Date; icon?: React.ElementType; className?: string }> = ({ label, value, icon: Icon, className }) => {
  let displayValue: string;
  if (typeof value === 'boolean') {
    displayValue = value ? 'Sí' : 'No';
  } else if (value instanceof Date) {
    displayValue = format(value, "PPP", { locale: es });
  } else {
    displayValue = String(value ?? 'N/A');
  }
  return (
    <div className={cn("py-1 flex items-baseline", className)}>
      <p className="text-xs font-medium text-muted-foreground flex items-center shrink-0">
        {Icon && <Icon className="h-3.5 w-3.5 mr-1.5 text-primary/70" />}
        {label}:&nbsp;
      </p>
      <p className="text-sm text-foreground break-words">{displayValue}</p>
    </div>
  );
};

const CheckboxDetailItem: React.FC<{ label: string; checked?: boolean; subLabel?: string }> = ({ label, checked, subLabel }) => (
  <div className="flex items-center py-1">
    {checked ? <CheckSquare className="h-4 w-4 text-green-600 mr-2" /> : <Square className="h-4 w-4 text-muted-foreground mr-2" />}
    <span className="text-sm text-foreground">{label}</span>
    {subLabel && <span className="text-xs text-muted-foreground ml-1">{subLabel}</span>}
  </div>
);

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function DatabaseSolicitudDetailView({ id, onBackToList, isInlineView }: DatabaseSolicitudDetailViewProps) {
  const [solicitud, setSolicitud] = useState<SolicitudRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      const fetchSolicitud = async () => {
        setLoading(true);
        setError(null);
        try {
          const docRef = doc(db, "SolicitudCheques", id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            // Perform robust conversion from Firestore data to SolicitudRecord
            const examDate = data.examDate instanceof FirestoreTimestamp ? data.examDate.toDate() : (data.examDate instanceof Date ? data.examDate : undefined);
            const savedAt = data.savedAt instanceof FirestoreTimestamp ? data.savedAt.toDate() : (data.savedAt instanceof Date ? data.savedAt : undefined);
            const paymentStatusLastUpdatedAt = data.paymentStatusLastUpdatedAt instanceof FirestoreTimestamp ? data.paymentStatusLastUpdatedAt.toDate() : (data.paymentStatusLastUpdatedAt instanceof Date ? data.paymentStatusLastUpdatedAt : undefined);

            setSolicitud({
              examNe: data.examNe || '',
              examReference: data.examReference || null,
              examManager: data.examManager || '',
              examDate: examDate,
              examRecipient: data.examRecipient || '',
              solicitudId: docSnap.id,
              monto: data.monto ?? null,
              montoMoneda: data.montoMoneda || null,
              cantidadEnLetras: data.cantidadEnLetras || null,
              consignatario: data.consignatario || null,
              declaracionNumero: data.declaracionNumero || null,
              unidadRecaudadora: data.unidadRecaudadora || null,
              codigo1: data.codigo1 || null,
              codigo2: data.codigo2 || null,
              banco: data.banco || null,
              bancoOtros: data.bancoOtros || null,
              numeroCuenta: data.numeroCuenta || null,
              monedaCuenta: data.monedaCuenta || null,
              monedaCuentaOtros: data.monedaCuentaOtros || null,
              elaborarChequeA: data.elaborarChequeA || null,
              elaborarTransferenciaA: data.elaborarTransferenciaA || null,
              impuestosPagadosCliente: data.impuestosPagadosCliente ?? false,
              impuestosPagadosRC: data.impuestosPagadosRC || null,
              impuestosPagadosTB: data.impuestosPagadosTB || null,
              impuestosPagadosCheque: data.impuestosPagadosCheque || null,
              impuestosPendientesCliente: data.impuestosPendientesCliente ?? false,
              soporte: data.soporte ?? false,
              documentosAdjuntos: data.documentosAdjuntos ?? false,
              constanciasNoRetencion: data.constanciasNoRetencion ?? false,
              constanciasNoRetencion1: data.constanciasNoRetencion1 ?? false,
              constanciasNoRetencion2: data.constanciasNoRetencion2 ?? false,
              pagoServicios: data.pagoServicios ?? false,
              tipoServicio: data.tipoServicio || null,
              otrosTipoServicio: data.otrosTipoServicio || null,
              facturaServicio: data.facturaServicio || null,
              institucionServicio: data.institucionServicio || null,
              correo: data.correo || null,
              observation: data.observation || null,
              savedAt: savedAt,
              savedBy: data.savedBy || null,
              paymentStatus: data.paymentStatus || undefined,
              paymentStatusLastUpdatedAt: paymentStatusLastUpdatedAt,
              paymentStatusLastUpdatedBy: data.paymentStatusLastUpdatedBy || undefined,
            });
          } else {
            setError("Solicitud no encontrada.");
          }
        } catch (err) {
          console.error("Error fetching solicitud:", err);
          setError("Error al cargar la solicitud.");
        } finally {
          setLoading(false);
        }
      };
      fetchSolicitud();
    }
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (amount?: number | string | null, currency?: string) => {
    if (amount === undefined || amount === null || amount === '') return 'N/A';
    const num = Number(amount);
    if (isNaN(num)) return String(amount);
    let prefix = '';
    if (currency === 'cordoba') prefix = 'C$';
    else if (currency === 'dolar') prefix = 'US$';
    else if (currency === 'euro') prefix = '€';
    return `${prefix}${num.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getBancoDisplay = (s?: SolicitudRecord | null) => {
    if (!s) return 'N/A';
    if (s.banco === 'ACCION POR CHEQUE/NO APLICA BANCO') return 'Acción por Cheque / No Aplica Banco';
    if (s.banco === 'Otros') return s.bancoOtros || 'Otros (No especificado)';
    return s.banco || 'N/A';
  };

  const getMonedaCuentaDisplay = (s?: SolicitudRecord | null) => {
    if (!s) return 'N/A';
    if (s.monedaCuenta === 'Otros') return s.monedaCuentaOtros || 'Otros (No especificado)';
    return s.monedaCuenta || 'N/A';
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-[300px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Cargando detalle...</p></div>;
  }

  if (error) {
    return <div className="text-center text-destructive py-4">{error}</div>;
  }

  if (!solicitud) {
    return <div className="text-center text-muted-foreground py-4">No se encontró la solicitud.</div>;
  }
  
  const initialDataForDisplay: Partial<InitialDataContext> = {
    recipient: solicitud.examRecipient,
    manager: solicitud.examManager,
    date: solicitud.examDate, // Already a Date object due to fetching logic
    ne: solicitud.examNe,
    reference: solicitud.examReference || undefined,
  };

  return (
    <div className="solicitud-detail-print-area py-0">
      <Card className="w-full max-w-4xl mx-auto custom-shadow card-print-styles">
        <CardContent className="pt-4">
           <Image
                src={`${basePath}/imagenes/HEADERSOLICITUDDETAIL.svg`}
                alt="Header Solicitud Detail"
                width={800}
                height={100}
                className="w-full h-auto object-contain"
                data-ai-hint="company logo banner"
              />
          <div className="mb-3 p-4 border border-border rounded-md bg-secondary/5 card-print-styles">
            <div className="grid grid-cols-[auto,1fr] gap-x-3 items-center">
                <p className="text-xs font-medium text-muted-foreground flex items-center shrink-0">
                    <Info className="h-3.5 w-3.5 mr-1.5 text-primary/70" />ID de Solicitud:&nbsp;</p>
                <p className="text-sm text-foreground break-words">{solicitud.solicitudId}</p>
            </div>
          </div>
          <div className="mb-3 p-4 border border-border rounded-md bg-secondary/30 card-print-styles">
            <h3 className="text-lg font-semibold mb-2 text-primary">Solicitud de Cheque</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-0">
                <DetailItem label="A" value={initialDataForDisplay.recipient} icon={Send} />
                <DetailItem label="De (Usuario)" value={initialDataForDisplay.manager} icon={User} />
                <DetailItem label="Fecha de Solicitud" value={initialDataForDisplay.date} icon={CalendarDays} />
                <DetailItem label="NE (Tracking NX1)" value={initialDataForDisplay.ne} icon={Info} />
                <DetailItem label="Referencia" value={initialDataForDisplay.reference || 'N/A'} icon={FileText} className="md:col-span-2"/>
             </div>
          </div>
          
          <div className="mb-3 p-4 border border-border rounded-md bg-secondary/30 card-print-styles">
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Por este medio me dirijo a usted para solicitarle que elabore cheque por la cantidad de:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 items-start mb-3">
              <div className="flex items-baseline py-1">
                <Banknote className="h-4 w-4 mr-1.5 text-primary shrink-0" />
                <p className="text-sm text-foreground break-words">{formatCurrency(solicitud.monto, solicitud.montoMoneda || undefined)}</p>
              </div>
              <div className="flex items-baseline py-1">
                <FileText className="h-4 w-4 mr-1.5 text-primary shrink-0" />
                <p className="text-sm text-foreground break-words">{solicitud.cantidadEnLetras || 'N/A'}</p>
              </div>
            </div>
            <div className="space-y-3 divide-y divide-border">
                <div className="pt-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4">
                    <DetailItem label="Consignatario" value={solicitud.consignatario} icon={Users} />
                    <DetailItem label="Declaración Número" value={solicitud.declaracionNumero} icon={Hash} />
                    <DetailItem label="Unidad Recaudadora" value={solicitud.unidadRecaudadora} icon={Building} />
                    <DetailItem label="Código 1" value={solicitud.codigo1} icon={Code} />
                    <DetailItem label="Codigo MUR" value={solicitud.codigo2} icon={Code} />
                  </div>
                </div>

                <div className="pt-3">
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 items-start">
                      <DetailItem label="Banco" value={getBancoDisplay(solicitud)} icon={Landmark} />
                      {solicitud.banco !== 'ACCION POR CHEQUE/NO APLICA BANCO' && (
                          <>
                          <DetailItem label="Número de Cuenta" value={solicitud.numeroCuenta} icon={Hash} />
                          <DetailItem label="Moneda de la Cuenta" value={getMonedaCuentaDisplay(solicitud)} icon={Banknote} />
                          </>
                      )}
                   </div>
                </div>

                <div className="pt-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                    <DetailItem label="Elaborar Cheque A" value={solicitud.elaborarChequeA} icon={User} />
                    <DetailItem label="Elaborar Transferencia A" value={solicitud.elaborarTransferenciaA} icon={User} />
                  </div>
                </div>

                <div className="pt-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                        <div className="space-y-1">
                            <CheckboxDetailItem label="Impuestos pendientes de pago por el cliente" checked={solicitud.impuestosPendientesCliente} />
                            <CheckboxDetailItem label="Soporte" checked={solicitud.soporte} />
                            <CheckboxDetailItem label="Impuestos pagados por el cliente mediante:" checked={solicitud.impuestosPagadosCliente} />
                            {solicitud.impuestosPagadosCliente && (
                                <div className="ml-6 pl-2 border-l border-dashed">
                                <DetailItem label="R/C No." value={solicitud.impuestosPagadosRC} />
                                <DetailItem label="T/B No." value={solicitud.impuestosPagadosTB} />
                                <DetailItem label="Cheque No." value={solicitud.impuestosPagadosCheque} />
                                </div>
                            )}
                        </div>
                        <div className="space-y-1">
                            <CheckboxDetailItem label="Se añaden documentos adjuntos" checked={solicitud.documentosAdjuntos} />
                            <CheckboxDetailItem label="Constancias de no retención" checked={solicitud.constanciasNoRetencion} />
                            {solicitud.constanciasNoRetencion && (
                                <div className="ml-6 pl-2 border-l border-dashed">
                                <CheckboxDetailItem label="1%" checked={solicitud.constanciasNoRetencion1} />
                                <CheckboxDetailItem label="2%" checked={solicitud.constanciasNoRetencion2} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {solicitud.pagoServicios && (
                  <div className="pt-3">
                    <h4 className="text-md font-medium text-primary mb-1">Pago de Servicios</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                        <DetailItem label="Tipo de Servicio" value={solicitud.tipoServicio === 'OTROS' ? solicitud.otrosTipoServicio : solicitud.tipoServicio} icon={Settings2} />
                        <DetailItem label="Factura Servicio" value={solicitud.facturaServicio} icon={FileText} />
                        <DetailItem label="Institución Servicio" value={solicitud.institucionServicio} icon={Building} />
                    </div>
                  </div>
                )}

                <div className="pt-3">
                  <DetailItem label="Correos de Notificación" value={solicitud.correo} icon={Mail} />
                  <DetailItem label="Observación" value={solicitud.observation} icon={MessageSquare} />
                </div>
              </div>
          </div>

          <Image
              src={`${basePath}/imagenes/FOOTERSOLICITUDETAIL.svg`}
              alt="Footer Solicitud Detail"
              width={800}
              height={100}
              className="w-full h-auto object-contain mt-6"
              data-ai-hint="company seal official"
            />

          {isInlineView && onBackToList && (
            <div className="mt-8 flex justify-end space-x-3 no-print">
              <Button variant="outline" onClick={onBackToList}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver
              </Button>
              <Button onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" /> Imprimir
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

