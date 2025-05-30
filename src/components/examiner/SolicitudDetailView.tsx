
"use client";
import React from 'react';
import type { SolicitudData, InitialDataContext } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Printer, CheckSquare, Square, Banknote, Landmark, Hash, User, FileText, Mail, MessageSquare, Building, Code, CalendarDays, Info, Send, Users, Settings2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Helper components (can be moved to a shared utils file if used elsewhere)
const DetailItem: React.FC<{ label: string; value?: string | number | null | boolean; icon?: React.ElementType; className?: string }> = ({ label, value, icon: Icon, className }) => {
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
// End Helper components

interface SolicitudDetailViewProps {
  solicitud: SolicitudData | null;
  initialData: InitialDataContext | null;
  onBackToList: () => void;
}

export default function SolicitudDetailView({ solicitud, initialData, onBackToList }: SolicitudDetailViewProps) {
  
  const handlePrint = () => {
    // This print will target the whole page. For specific section printing,
    // CSS @media print rules would need to target '.solicitud-detail-inline-view-area'
    // and hide other elements of the ProductListScreen.
    console.log("Attempting to print SolicitudDetailView content (window.print).");
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

  if (!solicitud || !initialData) {
    return (
      <Card className="w-full custom-shadow">
        <CardHeader>
          <CardTitle className="text-xl md:text-2xl font-semibold text-foreground">Detalle de Solicitud</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No se pudo cargar la información de la solicitud.</p>
          <Button onClick={onBackToList} variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Lista de Solicitudes
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    // Apply a class for potential print styling if needed
    <div className="solicitud-detail-inline-view-area py-2 md:py-0"> 
      <Card className="w-full max-w-4xl mx-auto custom-shadow card-print-styles"> {/* Added card-print-styles for consistency if using global print styles */}
        <CardHeader className="no-print"> {/* Class to hide header during print via global CSS */}
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl md:text-2xl font-semibold text-foreground">Detalle de Solicitud</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onBackToList}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Lista de Solicitudes
              </Button>
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" /> Imprimir
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Header Image from solicitud/[id]/page.tsx can be added here if desired for inline view */}
          {/* <Image src="/imagenes/HEADERSOLICITUDDETAIL.svg" ... /> */}

          <div className="mb-3 p-4 border border-border rounded-md bg-secondary/5 card-print-styles">
            <div className="grid grid-cols-[auto,1fr] gap-x-3 items-center">
                <Label htmlFor={`solicitudIdDisplay-${solicitud.id}-inline`} className="flex items-center text-sm text-muted-foreground">
                    <Info className="mr-2 h-4 w-4 text-primary/70" />
                    ID de Solicitud
                </Label>
                <Input
                    id={`solicitudIdDisplay-${solicitud.id}-inline`}
                    value={solicitud.id}
                    readOnly
                    disabled
                    className="bg-muted/50 cursor-not-allowed text-sm text-foreground"
                />
            </div>
          </div>

          <div className="mb-3 p-4 border border-border rounded-md bg-secondary/30 card-print-styles">
              <h3 className="text-lg font-semibold mb-2 text-primary">Solicitud de Cheque</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-0">
                <DetailItem label="A" value={initialData.recipient} icon={Send} />
                <DetailItem label="De (Usuario)" value={initialData.manager} icon={User} />
                <DetailItem label="Fecha de Solicitud" value={initialData.date ? format(new Date(initialData.date), "PPP", { locale: es }) : 'N/A'} icon={CalendarDays} />
                <DetailItem label="NE (Tracking NX1)" value={initialData.ne} icon={Info} />
                <DetailItem label="Referencia" value={initialData.reference || 'N/A'} icon={FileText} className="md:col-span-2"/>
              </div>
            </div>

          <div className="mb-3 p-4 border border-border rounded-md bg-secondary/30 card-print-styles">
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Por este medio me dirijo a usted para solicitarle que elabore cheque por la cantidad de:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 items-start mb-3">
              <div className="flex items-baseline py-1">
                <Banknote className="h-4 w-4 mr-1.5 text-primary shrink-0" />
                <p className="text-sm text-foreground break-words">{formatCurrency(solicitud.monto, solicitud.montoMoneda)}</p>
              </div>
              <div className="flex items-baseline py-1">
                <FileText className="h-4 w-4 mr-1.5 text-primary shrink-0" />
                <p className="text-sm text-foreground break-words">{solicitud.cantidadEnLetras || 'N/A'}</p>
              </div>
            </div>

            <div className="space-y-3 divide-y divide-border">
              <div className="pt-3"> {/* Información Adicional */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4">
                  <DetailItem label="Consignatario" value={solicitud.consignatario} icon={Users} />
                  <DetailItem label="Declaración Número" value={solicitud.declaracionNumero} icon={Hash} />
                  <DetailItem label="Unidad Recaudadora" value={solicitud.unidadRecaudadora} icon={Building} />
                  <DetailItem label="Código 1" value={solicitud.codigo1} icon={Code} />
                  <DetailItem label="Codigo MUR" value={solicitud.codigo2} icon={Code} />
                </div>
              </div>

              <div className="pt-3"> {/* Cuenta Bancaria */}
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

              <div className="pt-3"> {/* Beneficiario del Pago */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                  <DetailItem label="Elaborar Cheque A" value={solicitud.elaborarChequeA} icon={User} />
                  <DetailItem label="Elaborar Transferencia A" value={solicitud.elaborarTransferenciaA} icon={User} />
                </div>
              </div>

              <div className="pt-3"> {/* Documentación y Estados */}
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
                <div className="pt-3"> {/* Pago de Servicios */}
                  <h4 className="text-md font-medium text-primary mb-1">Pago de Servicios</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                      <DetailItem label="Tipo de Servicio" value={solicitud.tipoServicio === 'OTROS' ? solicitud.otrosTipoServicio : solicitud.tipoServicio} icon={Settings2} />
                      <DetailItem label="Factura Servicio" value={solicitud.facturaServicio} icon={FileText} />
                      <DetailItem label="Institución Servicio" value={solicitud.institucionServicio} icon={Building} />
                  </div>
                </div>
              )}

              <div className="pt-3"> {/* Comunicación */}
                <DetailItem label="Correos de Notificación" value={solicitud.correo} icon={Mail} />
                <DetailItem label="Observación" value={solicitud.observation} icon={MessageSquare} />
              </div>
            </div>
          </div>

          {/* Footer Image from solicitud/[id]/page.tsx can be added here if desired for inline view */}
          {/* <Image src="/imagenes/FOOTERSOLICITUDETAIL.svg" ... /> */}

          <div className="mt-8 flex justify-end space-x-3 no-print"> {/* Class to hide footer during print via global CSS */}
              <Button variant="outline" onClick={onBackToList}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Lista de Solicitudes
              </Button>
              <Button onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" /> Imprimir
              </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
