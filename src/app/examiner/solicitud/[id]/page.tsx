
"use client";
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAppContext } from '@/context/AppContext';
import type { SolicitudData, InitialDataContext, SolicitudRecord } from '@/types';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Printer, CheckSquare, Square, Banknote, Landmark, Hash, User, FileText, Mail, MessageSquare, Building, Code, CalendarDays, Info, Send, Users, Loader2, Settings2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { doc, getDoc, Timestamp as FirestoreTimestamp } from 'firebase/firestore';

const DetailItem: React.FC<{ label: string; value?: string | number | null | boolean; icon?: React.ElementType; className?: string }> = ({ label, value, icon: Icon, className }) => {
  let displayValue: string;
  if (typeof value === 'boolean') {
    displayValue = value ? 'Sí' : 'No';
  } else if (value && value instanceof Date) { // Check if value is not null/undefined before instanceof
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


export default function SolicitudDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { initialContextData: contextInitialData, solicitudes: contextSolicitudes } = useAppContext();
  const [isClient, setIsClient] = useState(false);

  const [displayInitialData, setDisplayInitialData] = useState<InitialDataContext | null>(null);
  const [displaySolicitud, setDisplaySolicitud] = useState<SolicitudData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const solicitudId = typeof params.id === 'string' ? params.id : undefined;

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !solicitudId) {
      if (isClient && !solicitudId) {
         toast({ title: "Error", description: "ID de solicitud no válido.", variant: "destructive" });
         router.push('/examiner');
      }
      if (!solicitudId) setLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      let foundInContext = false;

      if (contextInitialData && contextInitialData.date && contextSolicitudes && contextSolicitudes.length > 0) {
        const found = contextSolicitudes.find(s => s.id === solicitudId);
        if (found) {
          setDisplaySolicitud(found);
          // Ensure contextInitialData.date is a Date object
          const ensuredDateInitialData: InitialDataContext = {
            ...contextInitialData,
            date: contextInitialData.date instanceof Date ? contextInitialData.date : new Date(contextInitialData.date),
          };
          setDisplayInitialData(ensuredDateInitialData);
          foundInContext = true;
        }
      }

      if (!foundInContext) {
        try {
          const docRef = doc(db, "SolicitudCheques", solicitudId);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const record = docSnap.data() as SolicitudRecord;
            
            const fetchedInitialData: InitialDataContext = {
              ne: record.examNe,
              reference: record.examReference || '',
              manager: record.examManager,
              date: record.examDate && typeof record.examDate === 'object' && 'toDate' in record.examDate ? (record.examDate as FirestoreTimestamp).toDate() : new Date(record.examDate as any),
              recipient: record.examRecipient,
            };
            setDisplayInitialData(fetchedInitialData);

            const fetchedSolicitudData: SolicitudData = {
              id: record.solicitudId,
              monto: record.monto ?? undefined,
              montoMoneda: record.montoMoneda ?? undefined,
              cantidadEnLetras: record.cantidadEnLetras ?? undefined,
              consignatario: record.consignatario ?? undefined,
              declaracionNumero: record.declaracionNumero ?? undefined,
              unidadRecaudadora: record.unidadRecaudadora ?? undefined,
              codigo1: record.codigo1 ?? undefined,
              codigo2: record.codigo2 ?? undefined,
              banco: record.banco ?? undefined,
              bancoOtros: record.bancoOtros ?? undefined,
              numeroCuenta: record.numeroCuenta ?? undefined,
              monedaCuenta: record.monedaCuenta ?? undefined,
              monedaCuentaOtros: record.monedaCuentaOtros ?? undefined,
              elaborarChequeA: record.elaborarChequeA ?? undefined,
              elaborarTransferenciaA: record.elaborarTransferenciaA ?? undefined,
              impuestosPagadosCliente: record.impuestosPagadosCliente,
              impuestosPagadosRC: record.impuestosPagadosRC ?? undefined,
              impuestosPagadosTB: record.impuestosPagadosTB ?? undefined,
              impuestosPagadosCheque: record.impuestosPagadosCheque ?? undefined,
              impuestosPendientesCliente: record.impuestosPendientesCliente,
              soporte: record.soporte,
              documentosAdjuntos: record.documentosAdjuntos,
              constanciasNoRetencion: record.constanciasNoRetencion,
              constanciasNoRetencion1: record.constanciasNoRetencion1,
              constanciasNoRetencion2: record.constanciasNoRetencion2,
              pagoServicios: record.pagoServicios,
              tipoServicio: record.tipoServicio ?? undefined,
              otrosTipoServicio: record.otrosTipoServicio ?? undefined,
              facturaServicio: record.facturaServicio ?? undefined,
              institucionServicio: record.institucionServicio ?? undefined,
              correo: record.correo ?? undefined,
              observation: record.observation ?? undefined,
            };
            setDisplaySolicitud(fetchedSolicitudData);

          } else {
            toast({ title: "Error", description: "Solicitud no encontrada en la base de datos.", variant: "destructive" });
            setDisplayInitialData(null);
            setDisplaySolicitud(null);
          }
        } catch (error) {
          console.error("Error fetching solicitud from Firestore:", error);
          toast({ title: "Error", description: "No se pudo cargar la solicitud.", variant: "destructive" });
        }
      }
      setLoading(false);
    };

    loadData();

  }, [solicitudId, contextInitialData, contextSolicitudes, router, toast, isClient]);


  const handlePrint = () => {
    console.log("Imprimir button clicked. Attempting to call window.print().");
    window.print();
  };

  const formatCurrency = (amount?: number | string, currency?: string) => {
    if (amount === undefined || amount === null || amount === '') return 'N/A';
    const num = Number(amount);
    if (isNaN(num)) return String(amount);
    let prefix = '';
    if (currency === 'cordoba') prefix = 'C$';
    else if (currency === 'dolar') prefix = 'US$';
    else if (currency === 'euro') prefix = '€';
    return `${prefix}${num.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getBancoDisplay = (s?: SolicitudData | null) => {
    if (!s) return 'N/A';
    if (s.banco === 'ACCION POR CHEQUE/NO APLICA BANCO') return 'Acción por Cheque / No Aplica Banco';
    if (s.banco === 'Otros') return s.bancoOtros || 'Otros (No especificado)';
    return s.banco;
  };

  const getMonedaCuentaDisplay = (s?: SolicitudData | null) => {
    if (!s) return 'N/A';
    if (s.monedaCuenta === 'Otros') return s.monedaCuentaOtros || 'Otros (No especificado)';
    return s.monedaCuenta;
  };


  if (loading || !isClient) {
    return (
      <AppShell>
        <div className="min-h-screen flex items-center justify-center grid-bg">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
           <p className="ml-3 text-white">Cargando detalle de la solicitud...</p>
        </div>
      </AppShell>
    );
  }

  if (!displaySolicitud || !displayInitialData || !(displayInitialData.date && displayInitialData.date instanceof Date)) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center h-screen text-center">
          <p className="text-xl mb-4">Solicitud no encontrada, datos no disponibles o fecha inválida.</p>
          <Button onClick={() => router.push('/examiner')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="solicitud-detail-print-area py-2 md:py-5">
        <Card className="w-full max-w-4xl mx-auto custom-shadow card-print-styles">
          <CardHeader className="no-print">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl md:text-2xl font-semibold text-foreground">Detalle de Solicitud</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => router.back()}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Volver
                </Button>
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="mr-2 h-4 w-4" /> Imprimir
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <Image
                src="/imagenes/HEADERSOLICITUDDETAIL.svg"
                alt="Header Solicitud Detail"
                width={800}
                height={100}
                className="w-full h-auto object-contain"
                data-ai-hint="company logo banner"
              />

            <div className="mb-3 p-4 border border-border rounded-md bg-secondary/5 card-print-styles">
                <div className="grid grid-cols-[auto,1fr] gap-x-3 items-center">
                    <Label htmlFor="solicitudIdDisplay" className="flex items-center text-sm text-muted-foreground">
                        <Info className="mr-2 h-4 w-4 text-primary/70" />
                        ID de Solicitud
                    </Label>
                    <Input
                        id="solicitudIdDisplay"
                        value={displaySolicitud.id}
                        readOnly
                        disabled
                        className="bg-muted/50 cursor-not-allowed text-sm text-foreground"
                    />
                </div>
            </div>

            <div className="mb-3 p-4 border border-border rounded-md bg-secondary/30 card-print-styles">
                <h3 className="text-lg font-semibold mb-2 text-primary">Solicitud de Cheque</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-0">
                  <DetailItem label="A" value={displayInitialData.recipient} icon={Send} />
                  <DetailItem label="De (Usuario)" value={displayInitialData.manager} icon={User} />
                  <DetailItem label="Fecha de Solicitud" value={displayInitialData.date ? format(new Date(displayInitialData.date), "PPP", { locale: es }) : 'N/A'} icon={CalendarDays} />
                  <DetailItem label="NE (Tracking NX1)" value={displayInitialData.ne} icon={Info} />
                  <DetailItem label="Referencia" value={displayInitialData.reference || 'N/A'} icon={FileText} className="md:col-span-2"/>
                </div>
              </div>

            <div className="mb-3 p-4 border border-border rounded-md bg-secondary/30 card-print-styles">
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Por este medio me dirijo a usted para solicitarle que elabore cheque por la cantidad de:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 items-start mb-3">
                <div className="flex items-baseline py-1">
                  <Banknote className="h-4 w-4 mr-1.5 text-primary shrink-0" />
                  <p className="text-sm text-foreground break-words">{formatCurrency(displaySolicitud.monto, displaySolicitud.montoMoneda)}</p>
                </div>
                <div className="flex items-baseline py-1">
                  <FileText className="h-4 w-4 mr-1.5 text-primary shrink-0" />
                  <p className="text-sm text-foreground break-words">{displaySolicitud.cantidadEnLetras || 'N/A'}</p>
                </div>
              </div>

              <div className="space-y-3 divide-y divide-border">
                <div className="pt-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4">
                    <DetailItem label="Consignatario" value={displaySolicitud.consignatario} icon={Users} />
                    <DetailItem label="Declaración Número" value={displaySolicitud.declaracionNumero} icon={Hash} />
                    <DetailItem label="Unidad Recaudadora" value={displaySolicitud.unidadRecaudadora} icon={Building} />
                    <DetailItem label="Código 1" value={displaySolicitud.codigo1} icon={Code} />
                    <DetailItem label="Codigo MUR" value={displaySolicitud.codigo2} icon={Code} />
                  </div>
                </div>

                <div className="pt-3">
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 items-start">
                      <DetailItem label="Banco" value={getBancoDisplay(displaySolicitud)} icon={Landmark} />
                      {displaySolicitud.banco !== 'ACCION POR CHEQUE/NO APLICA BANCO' && (
                          <>
                          <DetailItem label="Número de Cuenta" value={displaySolicitud.numeroCuenta} icon={Hash} />
                          <DetailItem label="Moneda de la Cuenta" value={getMonedaCuentaDisplay(displaySolicitud)} icon={Banknote} />
                          </>
                      )}
                   </div>
                </div>

                <div className="pt-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                    <DetailItem label="Elaborar Cheque A" value={displaySolicitud.elaborarChequeA} icon={User} />
                    <DetailItem label="Elaborar Transferencia A" value={displaySolicitud.elaborarTransferenciaA} icon={User} />
                  </div>
                </div>

                <div className="pt-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                        <div className="space-y-1">
                            <CheckboxDetailItem label="Impuestos pendientes de pago por el cliente" checked={displaySolicitud.impuestosPendientesCliente} />
                            <CheckboxDetailItem label="Soporte" checked={displaySolicitud.soporte} />
                            <CheckboxDetailItem label="Impuestos pagados por el cliente mediante:" checked={displaySolicitud.impuestosPagadosCliente} />
                            {displaySolicitud.impuestosPagadosCliente && (
                                <div className="ml-6 pl-2 border-l border-dashed">
                                <DetailItem label="R/C No." value={displaySolicitud.impuestosPagadosRC} />
                                <DetailItem label="T/B No." value={displaySolicitud.impuestosPagadosTB} />
                                <DetailItem label="Cheque No." value={displaySolicitud.impuestosPagadosCheque} />
                                </div>
                            )}
                        </div>
                        <div className="space-y-1">
                            <CheckboxDetailItem label="Se añaden documentos adjuntos" checked={displaySolicitud.documentosAdjuntos} />
                            <CheckboxDetailItem label="Constancias de no retención" checked={displaySolicitud.constanciasNoRetencion} />
                            {displaySolicitud.constanciasNoRetencion && (
                                <div className="ml-6 pl-2 border-l border-dashed">
                                <CheckboxDetailItem label="1%" checked={displaySolicitud.constanciasNoRetencion1} />
                                <CheckboxDetailItem label="2%" checked={displaySolicitud.constanciasNoRetencion2} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {displaySolicitud.pagoServicios && (
                  <div className="pt-3">
                    <h4 className="text-md font-medium text-primary mb-1">Pago de Servicios</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                        <DetailItem label="Tipo de Servicio" value={displaySolicitud.tipoServicio === 'OTROS' ? displaySolicitud.otrosTipoServicio : displaySolicitud.tipoServicio} icon={Settings2} />
                        <DetailItem label="Factura Servicio" value={displaySolicitud.facturaServicio} icon={FileText} />
                        <DetailItem label="Institución Servicio" value={displaySolicitud.institucionServicio} icon={Building} />
                    </div>
                  </div>
                )}

                <div className="pt-3">
                  <DetailItem label="Correos de Notificación" value={displaySolicitud.correo} icon={Mail} />
                  <DetailItem label="Observación" value={displaySolicitud.observation} icon={MessageSquare} />
                </div>
              </div>
            </div>


            <Image
                src="/imagenes/FOOTERSOLICITUDETAIL.svg"
                alt="Footer Solicitud Detail"
                width={800}
                height={100}
                className="w-full h-auto object-contain mt-6"
                data-ai-hint="company seal official"
              />

            <div className="mt-8 flex justify-end space-x-3 no-print">
                <Button variant="outline" onClick={() => router.back()}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Volver
                </Button>
                <Button onClick={handlePrint}>
                  <Printer className="mr-2 h-4 w-4" /> Imprimir
                </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
