"use client";
import { useState, useEffect, type FormEvent, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Search, Download, Eye, Calendar as CalendarIcon, MessageSquare, Info as InfoIcon, AlertCircle, CheckCircle2, FileText as FileTextIcon, ListCollapse, ArrowLeft, CheckSquare as CheckSquareIcon, MessageSquareText } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp as FirestoreTimestamp, doc, getDoc, orderBy, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import type { SolicitudRecord, CommentRecord } from '@/types';
import { downloadExcelFileFromTable } from '@/lib/fileExporter';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import DatabaseSolicitudDetailView from '@/components/database/DatabaseSolicitudDetailView';

type SearchType = "dateToday" | "dateSpecific" | "dateRange" | "dateCurrentMonth";

const formatCurrencyFetched = (amount?: number | string | null, currency?: string) => {
    if (amount === undefined || amount === null || amount === '') return 'N/A';
    const num = Number(amount);
    if (isNaN(num) && typeof amount === 'string' && amount.trim() === '') return 'N/A';
    if (isNaN(num)) return String(amount);

    let prefix = '';
    if (currency === 'cordoba') prefix = 'C$';
    else if (currency === 'dolar') prefix = 'US$';
    else if (currency === 'euro') prefix = '€';
    return `${prefix}${num.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const renderSolicitudStatusBadges = (solicitud: SolicitudRecord) => {
  const badges = [];
  if (solicitud.documentosAdjuntos) badges.push(<Badge key="docs" variant="outline" className="bg-blue-100 text-blue-700 whitespace-nowrap text-xs">Docs Adjuntos</Badge>);
  if (solicitud.soporte) badges.push(<Badge key="soporte" variant="outline" className="bg-yellow-100 text-yellow-700 whitespace-nowrap text-xs">Soporte</Badge>);
  if (solicitud.impuestosPendientesCliente) badges.push(<Badge key="impuestos" variant="outline" className="bg-red-100 text-red-700 whitespace-nowrap text-xs">Imp. Pendientes</Badge>);
  if (solicitud.constanciasNoRetencion) badges.push(<Badge key="retencion" variant="outline" className="bg-purple-100 text-purple-700 whitespace-nowrap text-xs">Const. No Ret.</Badge>);
  if (solicitud.pagoServicios) badges.push(<Badge key="servicios" variant="outline" className="bg-teal-100 text-teal-700 whitespace-nowrap text-xs">Pago Serv.</Badge>);

  if (badges.length === 0) {
    return <Badge variant="secondary" className="text-xs">Sin Estados</Badge>;
  }
  return <div className="flex flex-wrap gap-1">{badges}</div>;
};


interface SearchResultsTableProps {
  solicitudes: SolicitudRecord[];
  searchType: SearchType;
  searchTerm?: string;
  currentUserRole?: string;
  onUpdatePaymentStatus: (solicitudId: string, newPaymentStatus: string | null) => Promise<void>;
  onUpdateRecepcionDCStatus: (solicitudId: string, status: boolean) => Promise<void>;
  onOpenMessageDialog: (solicitudId: string) => void;
  onViewDetails: (solicitud: SolicitudRecord) => void;
  onOpenCommentsDialog: (solicitudId: string) => void;
  filterSolicitudIdInput: string;
  setFilterSolicitudIdInput: (value: string) => void;
  filterNEInput: string;
  setFilterNEInput: (value: string) => void;
  filterEstadoPagoInput: string;
  setFilterEstadoPagoInput: (value: string) => void;
  filterFechaSolicitudInput: string;
  setFilterFechaSolicitudInput: (value: string) => void;
  filterMontoInput: string;
  setFilterMontoInput: (value: string) => void;
  filterConsignatarioInput: string;
  setFilterConsignatarioInput: (value: string) => void;
  filterDeclaracionInput: string;
  setFilterDeclaracionInput: (value: string) => void;
  filterReferenciaInput: string;
  setFilterReferenciaInput: (value: string) => void;
  filterGuardadoPorInput: string;
  setFilterGuardadoPorInput: (value: string) => void;
  filterEstadoSolicitudInput: string;
  setFilterEstadoSolicitudInput: (value: string) => void;
  duplicateWarning?: string | null;
}

const SearchResultsTable: React.FC<SearchResultsTableProps> = ({
  solicitudes,
  searchType,
  searchTerm,
  currentUserRole,
  onUpdatePaymentStatus,
  onUpdateRecepcionDCStatus,
  onOpenMessageDialog,
  onViewDetails,
  onOpenCommentsDialog,
  filterSolicitudIdInput,
  setFilterSolicitudIdInput,
  filterNEInput,
  setFilterNEInput,
  filterEstadoPagoInput,
  setFilterEstadoPagoInput,
  filterFechaSolicitudInput,
  setFilterFechaSolicitudInput,
  filterMontoInput,
  setFilterMontoInput,
  filterConsignatarioInput,
  setFilterConsignatarioInput,
  filterDeclaracionInput,
  setFilterDeclaracionInput,
  filterReferenciaInput,
  setFilterReferenciaInput,
  filterGuardadoPorInput,
  setFilterGuardadoPorInput,
  filterEstadoSolicitudInput,
  setFilterEstadoSolicitudInput,
  duplicateWarning,
}) => {
  const { toast } = useToast();
  const { user } = useAuth(); 

  if (!solicitudes || solicitudes.length === 0) {
    let message = "No se encontraron solicitudes para los criterios ingresados.";
    if (searchType === "dateToday") message = "No se encontraron solicitudes para hoy."
    else if (searchType === "dateCurrentMonth") message = `No se encontraron solicitudes para ${searchTerm}.`
    return <p className="text-muted-foreground text-center py-4">{message}</p>;
  }

  const getTitle = () => {
    if (searchType === "dateToday") return `Solicitudes de Hoy (${format(new Date(), "PPP", { locale: es })})`;
    if (searchType === "dateCurrentMonth") return `Solicitudes de ${searchTerm}`;
    if (searchType === "dateSpecific" && searchTerm) return `Solicitudes del ${searchTerm}`;
    if (searchType === "dateRange" && searchTerm) return `Solicitudes para el rango: ${searchTerm}`;
    return "Solicitudes Encontradas";
  };

  return (
    <Card className="mt-6 w-full custom-shadow">
      <CardHeader>
        <CardTitle className="text-xl md:text-2xl font-semibold text-foreground">{getTitle()}</CardTitle>
        <CardDescription className="text-muted-foreground">Se encontraron {solicitudes.length} solicitud(es) asociadas.</CardDescription>
        {duplicateWarning && (
          <div className="mt-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md" role="alert">
            {duplicateWarning}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto table-container rounded-lg border">
          <Table>
            <TableHeader className="bg-secondary/50">
              <TableRow>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  Estado Solicitud
                  <Input
                    type="text"
                    placeholder="Filtrar Estado Sol..."
                    value={filterEstadoSolicitudInput}
                    onChange={(e) => setFilterEstadoSolicitudInput(e.target.value)}
                    className="mt-1 h-8 text-xs"
                  />
                </TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  Estado de Pago
                  <Input
                    type="text"
                    placeholder="Filtrar Estado Pago..."
                    value={filterEstadoPagoInput}
                    onChange={(e) => setFilterEstadoPagoInput(e.target.value)}
                    className="mt-1 h-8 text-xs"
                  />
                </TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  Recepción Doc.
                </TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  ID Solicitud
                  <Input
                    type="text"
                    placeholder="Filtrar ID..."
                    value={filterSolicitudIdInput}
                    onChange={(e) => setFilterSolicitudIdInput(e.target.value)}
                    className="mt-1 h-8 text-xs"
                  />
                </TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  Fecha de Solicitud
                  <Input
                    type="text"
                    placeholder="Filtrar Fecha..."
                    value={filterFechaSolicitudInput}
                    onChange={(e) => setFilterFechaSolicitudInput(e.target.value)}
                    className="mt-1 h-8 text-xs"
                  />
                </TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  NE
                  <Input
                    type="text"
                    placeholder="Filtrar NE..."
                    value={filterNEInput}
                    onChange={(e) => setFilterNEInput(e.target.value)}
                    className="mt-1 h-8 text-xs"
                  />
                </TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Monto
                  <Input
                    type="text"
                    placeholder="Filtrar Monto..."
                    value={filterMontoInput}
                    onChange={(e) => setFilterMontoInput(e.target.value)}
                    className="mt-1 h-8 text-xs"
                  />
                </TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Consignatario
                  <Input
                    type="text"
                    placeholder="Filtrar Consignatario..."
                    value={filterConsignatarioInput}
                    onChange={(e) => setFilterConsignatarioInput(e.target.value)}
                    className="mt-1 h-8 text-xs"
                  />
                </TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Declaracion
                  <Input
                    type="text"
                    placeholder="Filtrar Declaracion..."
                    value={filterDeclaracionInput}
                    onChange={(e) => setFilterDeclaracionInput(e.target.value)}
                    className="mt-1 h-8 text-xs"
                  />
                </TableHead>
                 <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Referencia
                  <Input
                    type="text"
                    placeholder="Filtrar Referencia..."
                    value={filterReferenciaInput}
                    onChange={(e) => setFilterReferenciaInput(e.target.value)}
                    className="mt-1 h-8 text-xs"
                  />
                </TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Guardado Por
                  <Input
                    type="text"
                    placeholder="Filtrar Guardado Por..."
                    value={filterGuardadoPorInput}
                    onChange={(e) => setFilterGuardadoPorInput(e.target.value)}
                    className="mt-1 h-8 text-xs"
                    disabled={currentUserRole === 'autorevisor'}
                    readOnly={currentUserRole === 'autorevisor'}
                  />
                </TableHead>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-card divide-y divide-border">
              {solicitudes.map((solicitud) => (
                <TableRow key={solicitud.solicitudId} className="hover:bg-muted/50">
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm">
                    {renderSolicitudStatusBadges(solicitud)}
                  </TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm">
                    {currentUserRole === 'calificador' ? (
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={solicitud.paymentStatus === 'Pagado'}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              onUpdatePaymentStatus(solicitud.solicitudId, 'Pagado');
                            } else {
                                if (solicitud.paymentStatus === 'Pagado' || (solicitud.paymentStatus && !solicitud.paymentStatus.startsWith('Error:'))) {
                                    onUpdatePaymentStatus(solicitud.solicitudId, null);
                                }
                            }
                          }}
                          aria-label="Marcar como pagado / pendiente"
                        />
                        <Button variant="ghost" size="icon" onClick={() => onOpenMessageDialog(solicitud.solicitudId)} aria-label="Añadir mensaje de error">
                          <MessageSquare className="h-5 w-5 text-muted-foreground hover:text-primary" />
                        </Button>
                        {solicitud.paymentStatus === 'Pagado' && (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-200">Pagado</Badge>
                        )}
                        {solicitud.paymentStatus && solicitud.paymentStatus.startsWith('Error:') && (
                            <Badge variant="destructive">{solicitud.paymentStatus}</Badge>
                        )}
                        {(!solicitud.paymentStatus || (solicitud.paymentStatus && !solicitud.paymentStatus.startsWith('Error:') && solicitud.paymentStatus !== 'Pagado')) && (
                             <Badge variant="outline">Pendiente</Badge>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1">
                        {solicitud.paymentStatus === 'Pagado' ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-200 flex items-center">
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1"/> Pagado
                          </Badge>
                        ) : solicitud.paymentStatus && solicitud.paymentStatus.startsWith('Error:') ? (
                          <Badge variant="destructive" className="flex items-center">
                            <AlertCircle className="h-3.5 w-3.5 mr-1"/> {solicitud.paymentStatus}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Pendiente</Badge>
                        )}
                        {(solicitud.paymentStatusLastUpdatedAt || solicitud.paymentStatusLastUpdatedBy) && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                                  <InfoIcon className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs">
                                <p>Última actualización (Pago):</p>
                                {solicitud.paymentStatusLastUpdatedBy && <p>Por: {solicitud.paymentStatusLastUpdatedBy}</p>}
                                {solicitud.paymentStatusLastUpdatedAt && solicitud.paymentStatusLastUpdatedAt instanceof Date && <p>Fecha: {format(solicitud.paymentStatusLastUpdatedAt, "Pp", { locale: es })}</p>}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm">
                     {currentUserRole === 'calificador' ? (
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                checked={!!solicitud.recepcionDCStatus}
                                onCheckedChange={(checked) => {
                                    onUpdateRecepcionDCStatus(solicitud.solicitudId, !!checked);
                                }}
                                aria-label="Marcar como recibido / pendiente"
                            />
                            {solicitud.recepcionDCStatus ? (
                                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 flex items-center">
                                    <CheckSquareIcon className="h-3.5 w-3.5 mr-1"/> Recibido
                                </Badge>
                            ) : (
                                <Badge variant="outline">Pendiente</Badge>
                            )}
                        </div>
                     ) : (
                        <div className="flex items-center space-x-1">
                        {solicitud.recepcionDCStatus ? (
                            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 flex items-center">
                                <CheckSquareIcon className="h-3.5 w-3.5 mr-1"/> Recibido
                            </Badge>
                        ) : (
                            <Badge variant="outline">Pendiente</Badge>
                        )}
                        {(solicitud.recepcionDCLastUpdatedAt || solicitud.recepcionDCLastUpdatedBy) && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                                  <InfoIcon className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs">
                                <p>Última actualización (Recep. Doc.):</p>
                                {solicitud.recepcionDCLastUpdatedBy && <p>Por: {solicitud.recepcionDCLastUpdatedBy}</p>}
                                {solicitud.recepcionDCLastUpdatedAt && solicitud.recepcionDCLastUpdatedAt instanceof Date && <p>Fecha: {format(solicitud.recepcionDCLastUpdatedAt, "Pp", { locale: es })}</p>}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        </div>
                     )}
                  </TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm font-medium text-foreground">{solicitud.solicitudId}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                    {solicitud.examDate instanceof Date
                      ? format(solicitud.examDate, "PPP", { locale: es })
                      : 'N/A'}
                  </TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">{solicitud.examNe}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">{formatCurrencyFetched(solicitud.monto ?? undefined, solicitud.montoMoneda || undefined)}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">{solicitud.consignatario || 'N/A'}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">{solicitud.declaracionNumero || 'N/A'}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">{solicitud.examReference || 'N/A'}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">{solicitud.savedBy || 'N/A'}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onViewDetails(solicitud)}
                          className="px-2 py-1 h-auto"
                        >
                          <Eye className="mr-1 h-3.5 w-3.5" /> Ver
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onOpenCommentsDialog(solicitud.solicitudId)}
                          className="px-2 py-1 h-auto"
                        >
                          <MessageSquareText className="mr-1 h-3.5 w-3.5" /> Comentarios
                        </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default function DatabasePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [searchType, setSearchType] = useState<SearchType>("dateToday");
  const [searchTermText, setSearchTermText] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [datePickerStartDate, setDatePickerStartDate] = useState<Date | undefined>(undefined);
  const [datePickerEndDate, setDatePickerEndDate] = useState<Date | undefined>(undefined);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedSolicitudes, setFetchedSolicitudes] = useState<SolicitudRecord[] | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [currentSearchTermForDisplay, setCurrentSearchTermForDisplay] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [currentSolicitudIdForMessage, setCurrentSolicitudIdForMessage] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');

  // State for comments dialog
  const [isCommentsDialogOpen, setIsCommentsDialogOpen] = useState(false);
  const [currentSolicitudIdForComments, setCurrentSolicitudIdForComments] = useState<string | null>(null);
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isPostingComment, setIsPostingComment] = useState(false);


  const [filterSolicitudIdInput, setFilterSolicitudIdInput] = useState('');
  const [filterNEInput, setFilterNEInput] = useState('');
  const [filterEstadoPagoInput, setFilterEstadoPagoInput] = useState('');
  const [filterFechaSolicitudInput, setFilterFechaSolicitudInput] = useState('');
  const [filterMontoInput, setFilterMontoInput] = useState('');
  const [filterConsignatarioInput, setFilterConsignatarioInput] = useState('');
  const [filterDeclaracionInput, setFilterDeclaracionInput] = useState('');
  const [filterReferenciaInput, setFilterReferenciaInput] = useState('');
  const [filterGuardadoPorInput, setFilterGuardadoPorInput] = useState('');
  const [filterEstadoSolicitudInput, setFilterEstadoSolicitudInput] = useState('');

  const [solicitudToViewInline, setSolicitudToViewInline] = useState<SolicitudRecord | null>(null);
  const [isDetailViewVisible, setIsDetailViewVisible] = useState(false);

  const [isExporting, setIsExporting] = useState(false);


  const handleViewDetailsInline = (solicitud: SolicitudRecord) => {
    setSolicitudToViewInline(solicitud);
    setIsDetailViewVisible(true);
  };

  const handleBackToTable = () => {
    setIsDetailViewVisible(false);
    setSolicitudToViewInline(null);
  };


  const displayedSolicitudes = useMemo(() => {
    if (!fetchedSolicitudes) return null;
    let accumulatedData = [...fetchedSolicitudes];

    const applyFilter = (
        data: SolicitudRecord[],
        filterValue: string,
        filterFn: (item: SolicitudRecord, searchTerm: string) => boolean
    ): SolicitudRecord[] => {
        if (!filterValue.trim()) return data;
        const searchTerm = filterValue.toLowerCase().trim();
        const filtered = data.filter(item => filterFn(item, searchTerm));
        // If filter results in empty but original data was not, it means filter was too restrictive.
        // However, if original data was already empty, or if filter finds results, return filtered.
        return filtered.length > 0 || data.length === 0 ? filtered : data; // Corrected logic here for empty filter results
    };

    accumulatedData = applyFilter(accumulatedData, filterEstadoSolicitudInput, (s, term) => {
        const badgeTexts: string[] = [];
        if (s.documentosAdjuntos) badgeTexts.push("Docs Adjuntos");
        if (s.soporte) badgeTexts.push("Soporte");
        if (s.impuestosPendientesCliente) badgeTexts.push("Imp. Pendientes");
        if (s.constanciasNoRetencion) badgeTexts.push("Const. No Ret.");
        if (s.pagoServicios) badgeTexts.push("Pago Serv.");
        if (badgeTexts.length === 0) badgeTexts.push("Sin Estados");
        return badgeTexts.some(badgeText => badgeText.toLowerCase().includes(term));
    });

    accumulatedData = applyFilter(accumulatedData, filterEstadoPagoInput, (s, term) =>
        (s.paymentStatus ? s.paymentStatus.toLowerCase() : "pendiente").includes(term)
    );
    accumulatedData = applyFilter(accumulatedData, filterSolicitudIdInput, (s, term) =>
        s.solicitudId.toLowerCase().includes(term)
    );
    accumulatedData = applyFilter(accumulatedData, filterFechaSolicitudInput, (s, term) => {
        const dateText = s.examDate && s.examDate instanceof Date ? format(s.examDate, "PPP", { locale: es }) : 'N/A';
        return dateText.toLowerCase().includes(term);
    });
    accumulatedData = applyFilter(accumulatedData, filterNEInput, (s, term) =>
        s.examNe.toLowerCase().includes(term)
    );
    accumulatedData = applyFilter(accumulatedData, filterMontoInput, (s, term) => {
        const montoText = formatCurrencyFetched(s.monto ?? undefined, s.montoMoneda || undefined);
        return montoText.toLowerCase().includes(term);
    });
    accumulatedData = applyFilter(accumulatedData, filterConsignatarioInput, (s, term) =>
        (s.consignatario || '').toLowerCase().includes(term)
    );
    accumulatedData = applyFilter(accumulatedData, filterDeclaracionInput, (s, term) =>
        (s.declaracionNumero || '').toLowerCase().includes(term)
    );
    accumulatedData = applyFilter(accumulatedData, filterReferenciaInput, (s, term) =>
        (s.examReference || '').toLowerCase().includes(term)
    );

    if (user?.role === 'autorevisor' && user?.email) {
      accumulatedData = accumulatedData.filter(s =>
        (s.savedBy || '').toLowerCase() === user.email!.toLowerCase()
      );
    } else {
      accumulatedData = applyFilter(accumulatedData, filterGuardadoPorInput, (s, term) =>
        (s.savedBy || '').toLowerCase().includes(term)
      );
    }
    return accumulatedData;
  }, [
    fetchedSolicitudes,
    filterEstadoSolicitudInput,
    filterEstadoPagoInput,
    filterSolicitudIdInput,
    filterFechaSolicitudInput,
    filterNEInput,
    filterMontoInput,
    filterConsignatarioInput,
    filterDeclaracionInput,
    filterReferenciaInput,
    filterGuardadoPorInput,
    user?.role,
    user?.email
  ]);


  const handleUpdatePaymentStatus = useCallback(async (solicitudId: string, newPaymentStatus: string | null) => {
    if (!user || !user.email) {
      toast({ title: "Error", description: "Usuario no autenticado.", variant: "destructive" });
      return;
    }
    const docRef = doc(db, "SolicitudCheques", solicitudId);
    try {
      await updateDoc(docRef, {
        paymentStatus: newPaymentStatus,
        paymentStatusLastUpdatedAt: serverTimestamp(),
        paymentStatusLastUpdatedBy: user.email,
      });
      toast({ title: "Éxito", description: `Estado de pago actualizado para ${solicitudId}.` });
      setFetchedSolicitudes(prev =>
        prev?.map(s =>
          s.solicitudId === solicitudId
            ? { ...s,
                paymentStatus: newPaymentStatus === null ? null : newPaymentStatus, 
                paymentStatusLastUpdatedAt: new Date(), 
                paymentStatusLastUpdatedBy: user.email!
              }
            : s
        ) || null
      );
    } catch (err) {
      console.error("Error updating payment status: ", err);
      toast({ title: "Error", description: "No se pudo actualizar el estado de pago.", variant: "destructive" });
    }
  }, [user, toast]);


  const handleUpdateRecepcionDCStatus = useCallback(async (solicitudId: string, status: boolean) => {
    if (!user || !user.email) {
      toast({ title: "Error", description: "Usuario no autenticado.", variant: "destructive" });
      return;
    }
    const docRef = doc(db, "SolicitudCheques", solicitudId);
    try {
      await updateDoc(docRef, {
        recepcionDCStatus: status,
        recepcionDCLastUpdatedAt: serverTimestamp(),
        recepcionDCLastUpdatedBy: user.email,
      });
      toast({ title: "Éxito", description: `Estado de recepción de documento actualizado para ${solicitudId}.` });
      setFetchedSolicitudes(prev =>
        prev?.map(s =>
          s.solicitudId === solicitudId
            ? { ...s,
                recepcionDCStatus: status,
                recepcionDCLastUpdatedAt: new Date(),
                recepcionDCLastUpdatedBy: user.email!
              }
            : s
        ) || null
      );
    } catch (err) {
      console.error("Error updating recepcion DC status: ", err);
      toast({ title: "Error", description: "No se pudo actualizar el estado de recepción de documento.", variant: "destructive" });
    }
  }, [user, toast]);


  const openMessageDialog = (solicitudId: string) => {
    setCurrentSolicitudIdForMessage(solicitudId);
    const currentSolicitud = fetchedSolicitudes?.find(s => s.solicitudId === solicitudId);
    if (currentSolicitud?.paymentStatus && currentSolicitud.paymentStatus.startsWith("Error: ")) {
      setMessageText(currentSolicitud.paymentStatus.substring("Error: ".length));
    } else {
      setMessageText('');
    }
    setIsMessageDialogOpen(true);
  };

  const handleSaveMessage = async () => {
    if (currentSolicitudIdForMessage) {
      let finalPaymentStatus: string | null = null;
      if (messageText.trim() !== '') {
        finalPaymentStatus = `Error: ${messageText.trim()}`;
      }
      await handleUpdatePaymentStatus(currentSolicitudIdForMessage, finalPaymentStatus);
    }
    setIsMessageDialogOpen(false);
    setMessageText('');
    setCurrentSolicitudIdForMessage(null);
  };

  // Comments Dialog functions
  const openCommentsDialog = async (solicitudId: string) => {
    setCurrentSolicitudIdForComments(solicitudId);
    setComments([]); // Clear previous comments
    setIsLoadingComments(true);
    setIsCommentsDialogOpen(true);

    try {
      const commentsCollectionRef = collection(db, "SolicitudCheques", solicitudId, "comments");
      const q = query(commentsCollectionRef, orderBy("createdAt", "asc"));
      const querySnapshot = await getDocs(q);
      const fetchedComments = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt instanceof FirestoreTimestamp ? data.createdAt.toDate() : new Date(),
        } as CommentRecord;
      });
      setComments(fetchedComments);
    } catch (err) {
      console.error("Error fetching comments: ", err);
      toast({ title: "Error", description: "No se pudieron cargar los comentarios.", variant: "destructive" });
      setComments([]);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const closeCommentsDialog = () => {
    setIsCommentsDialogOpen(false);
    setCurrentSolicitudIdForComments(null);
    setNewCommentText('');
    setComments([]);
  };

  const handlePostComment = async () => {
    if (!newCommentText.trim() || !currentSolicitudIdForComments || !user || !user.email) {
      toast({
        title: "Error",
        description: "El comentario no puede estar vacío o falta información del usuario/solicitud.",
        variant: "destructive",
      });
      return;
    }
    setIsPostingComment(true);
    try {
      const commentsCollectionRef = collection(db, "SolicitudCheques", currentSolicitudIdForComments, "comments");
      const newComment: Omit<CommentRecord, 'id' | 'createdAt'> & { createdAt: any } = { // Use 'any' for serverTimestamp() initially
        solicitudId: currentSolicitudIdForComments,
        text: newCommentText.trim(),
        userId: user.uid,
        userEmail: user.email,
        createdAt: serverTimestamp(),
      };
      const docRef = await addDoc(commentsCollectionRef, newComment);
      
      setComments(prev => [...prev, { ...newComment, id: docRef.id, createdAt: new Date() } as CommentRecord]);
      setNewCommentText('');
      toast({ title: "Éxito", description: "Comentario publicado." });
    } catch (err) {
      console.error("Error posting comment: ", err);
      toast({ title: "Error", description: "No se pudo publicar el comentario.", variant: "destructive" });
    } finally {
      setIsPostingComment(false);
    }
  };


  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && !authLoading) {
      const isAuthorized = user && (user.role === 'revisor' || user.role === 'calificador' || user.role === 'autorevisor');
      if (!isAuthorized && !isDetailViewVisible) { 
        if (!fetchedSolicitudes) { 
          router.push('/');
        }
      }
    }
  }, [user, authLoading, router, isClient, fetchedSolicitudes, isDetailViewVisible]);

  useEffect(() => {
    if (isClient && !authLoading && user?.role === 'autorevisor' && user?.email) {
      setFilterGuardadoPorInput(user.email);
    }
  }, [isClient, authLoading, user?.role, user?.email]);

  const handleSearch = async (e?: FormEvent) => {
    e?.preventDefault();
    setIsLoading(true);
    setError(null);
    setFetchedSolicitudes(null);
    setDuplicateWarning(null);
    setCurrentSearchTermForDisplay('');
    setIsDetailViewVisible(false);
    setSolicitudToViewInline(null);

    setFilterEstadoSolicitudInput('');
    setFilterEstadoPagoInput('');
    setFilterSolicitudIdInput('');
    setFilterFechaSolicitudInput('');
    setFilterNEInput('');
    setFilterMontoInput('');
    setFilterConsignatarioInput('');
    setFilterDeclaracionInput('');
    setFilterReferenciaInput('');
    if (user?.role !== 'autorevisor') {
      setFilterGuardadoPorInput('');
    }


    const solicitudsCollectionRef = collection(db, "SolicitudCheques");
    let q;
    let termForDisplay = searchTermText.trim();

    try {
      switch (searchType) {
        case "dateToday":
          const todayStart = startOfDay(new Date());
          const todayEnd = endOfDay(new Date());
          q = query(solicitudsCollectionRef,
            where("examDate", ">=", FirestoreTimestamp.fromDate(todayStart)),
            where("examDate", "<=", FirestoreTimestamp.fromDate(todayEnd)),
            orderBy("examDate", "desc")
          );
          termForDisplay = format(new Date(), "PPP", { locale: es });
          break;
        case "dateCurrentMonth":
          const currentMonthStart = startOfMonth(new Date());
          const currentMonthEnd = endOfMonth(new Date());
          q = query(solicitudsCollectionRef,
            where("examDate", ">=", FirestoreTimestamp.fromDate(currentMonthStart)),
            where("examDate", "<=", FirestoreTimestamp.fromDate(currentMonthEnd)),
            orderBy("examDate", "desc")
          );
          termForDisplay = format(new Date(), "MMMM yyyy", { locale: es });
          break;
        case "dateSpecific":
          if (!selectedDate) { setError("Por favor, seleccione una fecha específica."); setIsLoading(false); return; }
          const specificDayStart = startOfDay(selectedDate);
          const specificDayEnd = endOfDay(selectedDate);
          q = query(solicitudsCollectionRef,
            where("examDate", ">=", FirestoreTimestamp.fromDate(specificDayStart)),
            where("examDate", "<=", FirestoreTimestamp.fromDate(specificDayEnd)),
            orderBy("examDate", "desc")
          );
          termForDisplay = format(selectedDate, "PPP", { locale: es });
          break;
        case "dateRange":
          if (!datePickerStartDate || !datePickerEndDate) { setError("Por favor, seleccione una fecha de inicio y fin para el rango."); setIsLoading(false); return; }
          if (datePickerEndDate < datePickerStartDate) { setError("La fecha de fin no puede ser anterior a la fecha de inicio."); setIsLoading(false); return; }
          const rangeStart = startOfDay(datePickerStartDate);
          const rangeEnd = endOfDay(datePickerEndDate);
          q = query(solicitudsCollectionRef,
            where("examDate", ">=", FirestoreTimestamp.fromDate(rangeStart)),
            where("examDate", "<=", FirestoreTimestamp.fromDate(rangeEnd)),
            orderBy("examDate", "desc")
          );
          termForDisplay = `${format(datePickerStartDate, "P", { locale: es })} - ${format(datePickerEndDate, "P", { locale: es })}`;
          break;
        default:
          setError("Tipo de búsqueda no válido."); setIsLoading(false); return;
      }

      setCurrentSearchTermForDisplay(termForDisplay);

      if (q) {
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          let data = querySnapshot.docs.map(docSnap => {
            const docData = docSnap.data();
            const examDateValue = docData.examDate instanceof FirestoreTimestamp ? docData.examDate.toDate() : (docData.examDate instanceof Date ? docData.examDate : undefined);
            const savedAtValue = docData.savedAt instanceof FirestoreTimestamp ? docData.savedAt.toDate() : (docData.savedAt instanceof Date ? docData.savedAt : undefined);
            const paymentStatusLastUpdatedAt = docData.paymentStatusLastUpdatedAt instanceof FirestoreTimestamp ? docData.paymentStatusLastUpdatedAt.toDate() : (docData.paymentStatusLastUpdatedAt instanceof Date ? docData.paymentStatusLastUpdatedAt : undefined);
            const recepcionDCLastUpdatedAt = docData.recepcionDCLastUpdatedAt instanceof FirestoreTimestamp ? docData.recepcionDCLastUpdatedAt.toDate() : (docData.recepcionDCLastUpdatedAt instanceof Date ? docData.recepcionDCLastUpdatedAt : undefined);
            return {
              ...docData,
              solicitudId: docSnap.id,
              examDate: examDateValue,
              savedAt: savedAtValue,
              paymentStatus: docData.paymentStatus || null,
              paymentStatusLastUpdatedAt: paymentStatusLastUpdatedAt,
              paymentStatusLastUpdatedBy: docData.paymentStatusLastUpdatedBy || null,
              recepcionDCStatus: docData.recepcionDCStatus ?? false,
              recepcionDCLastUpdatedAt: recepcionDCLastUpdatedAt,
              recepcionDCLastUpdatedBy: docData.recepcionDCLastUpdatedBy || null,
              examNe: docData.examNe || '', 
              examReference: docData.examReference || null,
              examManager: docData.examManager || '',
              examRecipient: docData.examRecipient || '',
              monto: docData.monto ?? null,
              montoMoneda: docData.montoMoneda || null,
              cantidadEnLetras: docData.cantidadEnLetras || null,
              consignatario: docData.consignatario || null,
              declaracionNumero: docData.declaracionNumero || null,
              unidadRecaudadora: docData.unidadRecaudadora || null,
              codigo1: docData.codigo1 || null,
              codigo2: docData.codigo2 || null,
              banco: docData.banco || null,
              bancoOtros: docData.bancoOtros || null,
              numeroCuenta: docData.numeroCuenta || null,
              monedaCuenta: docData.monedaCuenta || null,
              monedaCuentaOtros: docData.monedaCuentaOtros || null,
              elaborarChequeA: docData.elaborarChequeA || null,
              elaborarTransferenciaA: docData.elaborarTransferenciaA || null,
              impuestosPagadosCliente: docData.impuestosPagadosCliente ?? false,
              impuestosPagadosRC: docData.impuestosPagadosRC || null,
              impuestosPagadosTB: docData.impuestosPagadosTB || null,
              impuestosPagadosCheque: docData.impuestosPagadosCheque || null,
              impuestosPendientesCliente: docData.impuestosPendientesCliente ?? false,
              soporte: docData.soporte ?? false,
              documentosAdjuntos: docData.documentosAdjuntos ?? false,
              constanciasNoRetencion: docData.constanciasNoRetencion ?? false,
              constanciasNoRetencion1: docData.constanciasNoRetencion1 ?? false,
              constanciasNoRetencion2: docData.constanciasNoRetencion2 ?? false,
              pagoServicios: docData.pagoServicios ?? false,
              tipoServicio: docData.tipoServicio || null,
              otrosTipoServicio: docData.otrosTipoServicio || null,
              facturaServicio: docData.facturaServicio || null,
              institucionServicio: docData.institucionServicio || null,
              correo: docData.correo || null,
              observation: docData.observation || null,
              savedBy: docData.savedBy || null,
            } as SolicitudRecord;
          });
          setFetchedSolicitudes(data);

          if (data && data.length > 1) {
            const potentialDuplicatesMap = new Map<string, string[]>();
            data.forEach(solicitud => {
              if (solicitud.examNe && solicitud.examNe.trim() !== '' &&
                  solicitud.monto !== null && 
                  solicitud.montoMoneda && solicitud.montoMoneda.trim() !== '') {
                const key = `${solicitud.examNe.trim()}-${solicitud.monto}-${solicitud.montoMoneda.trim()}`;
                if (!potentialDuplicatesMap.has(key)) {
                  potentialDuplicatesMap.set(key, []);
                }
                potentialDuplicatesMap.get(key)!.push(solicitud.solicitudId);
              }
            });

            const duplicateGroups: string[][] = [];
            potentialDuplicatesMap.forEach(ids => {
              if (ids.length > 1) {
                duplicateGroups.push(ids);
              }
            });

            if (duplicateGroups.length > 0) {
              const duplicateIdsText = duplicateGroups.map(group => `(${group.join(', ')})`).join('; ');
              setDuplicateWarning(`Posible acción duplicada. Revise los siguientes Documentos ID con NE, Monto y Moneda idénticos: ${duplicateIdsText}.`);
            }
          }

        } else { setError("No se encontraron solicitudes para los criterios ingresados."); }
      }
    } catch (err: any) {
      console.error("Error fetching documents from Firestore: ", err);
      let userFriendlyError = "Error al buscar las solicitudes. Intente de nuevo.";
      if (err.code === 'permission-denied') {
        userFriendlyError = "No tiene permisos para acceder a esta información.";
      } else if (err.code === 'failed-precondition') {
            userFriendlyError = "Error de consulta: asegúrese de tener los índices necesarios creados en Firestore para los campos y orden seleccionados. La creación de índices puede tardar unos minutos. Por favor, cree este índice en la consola de Firestore (puede haber un enlace en la consola del navegador).";
      }
      setError(userFriendlyError);
    } finally { setIsLoading(false); }
  };

  const handleExport = async () => {
    const dataToUse = displayedSolicitudes || [];
    if (dataToUse.length === 0) {
      toast({ title: "Sin Datos", description: "No hay datos para exportar. Realice una búsqueda primero.", variant: "default" });
      return;
    }
    setIsExporting(true);
    toast({ title: "Exportando...", description: "Preparando datos para Excel, esto puede tardar unos segundos...", duration: 10000 });

    const headers = [
      "Estado de Pago", "Recepción Doc.", "Recepción Doc. Por", "Recepción Doc. Fecha", "ID Solicitud", "Fecha de Solicitud", "NE", "Monto", "Moneda Monto", "Consignatario", "Declaracion", "Referencia", "Guardado Por",
      "Cantidad en Letras", "Destinatario Solicitud",
      "Unidad Recaudadora", "Código 1", "Codigo MUR", "Banco", "Otro Banco", "Número de Cuenta", "Moneda de la Cuenta", "Otra Moneda Cuenta",
      "Elaborar Cheque A", "Elaborar Transferencia A",
      "Impuestos Pagados Cliente", "R/C (Imp. Pagados)", "T/B (Imp. Pagados)", "Cheque (Imp. Pagados)",
      "Impuestos Pendientes Cliente", "Soporte", "Documentos Adjuntos",
      "Constancias de No Retención", "Constancia 1%", "Constancia 2%",
      "Pago de Servicios", "Tipo de Servicio", "Otro Tipo de Servicio", "Factura Servicio", "Institución Servicio",
      "Correo Notificación", "Observación", "Usuario (De)", 
      "Fecha de Guardado", "Actualizado Por (Pago)", "Fecha Actualización (Pago)", "Comentarios"
    ];

    const dataToExportPromises = dataToUse.map(async (s) => {
      let commentsString = 'N/A';
      try {
        const commentsCollectionRef = collection(db, "SolicitudCheques", s.solicitudId, "comments");
        const q = query(commentsCollectionRef, orderBy("createdAt", "asc"));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          commentsString = querySnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            const createdAt = data.createdAt instanceof FirestoreTimestamp ? data.createdAt.toDate() : new Date();
            return `${data.userEmail} - ${format(createdAt, "dd/MM/yy HH:mm", { locale: es })}: ${data.text}`;
          }).join("\n"); // Join with newline for Excel cell display
        }
      } catch (err) {
        console.error(`Error fetching comments for ${s.solicitudId}: `, err);
        commentsString = 'Error al cargar comentarios';
      }

      return {
        "Estado de Pago": s.paymentStatus || 'Pendiente',
        "Recepción Doc.": s.recepcionDCStatus ? 'Recibido' : 'Pendiente',
        "Recepción Doc. Por": s.recepcionDCLastUpdatedBy || 'N/A',
        "Recepción Doc. Fecha": s.recepcionDCLastUpdatedAt && s.recepcionDCLastUpdatedAt instanceof Date ? format(s.recepcionDCLastUpdatedAt, "yyyy-MM-dd HH:mm", { locale: es }) : 'N/A',
        "ID Solicitud": s.solicitudId,
        "Fecha de Solicitud": s.examDate instanceof Date ? format(s.examDate, "yyyy-MM-dd HH:mm", { locale: es }) : 'N/A',
        "NE": s.examNe,
        "Monto": s.monto,
        "Moneda Monto": s.montoMoneda,
        "Consignatario": s.consignatario || 'N/A',
        "Declaracion": s.declaracionNumero || 'N/A',
        "Referencia": s.examReference || 'N/A',
        "Guardado Por": s.savedBy || 'N/A',

        "Cantidad en Letras": s.cantidadEnLetras || 'N/A',
        "Destinatario Solicitud": s.examRecipient,
        "Unidad Recaudadora": s.unidadRecaudadora || 'N/A',
        "Código 1": s.codigo1 || 'N/A',
        "Codigo MUR": s.codigo2 || 'N/A',
        "Banco": s.banco === 'ACCION POR CHEQUE/NO APLICA BANCO' ? 'Acción por Cheque / No Aplica Banco' : s.banco || 'N/A',
        "Otro Banco": s.banco === 'Otros' ? (s.bancoOtros || 'N/A') : 'N/A',
        "Número de Cuenta": s.banco === 'ACCION POR CHEQUE/NO APLICA BANCO' ? 'N/A' : s.numeroCuenta || 'N/A',
        "Moneda de la Cuenta": s.banco === 'ACCION POR CHEQUE/NO APLICA BANCO' ? 'N/A' : (s.monedaCuenta === 'Otros' ? (s.monedaCuentaOtros || 'N/A') : s.monedaCuenta || 'N/A'),
        "Otra Moneda Cuenta": s.monedaCuenta === 'Otros' ? (s.monedaCuentaOtros || 'N/A') : 'N/A',
        "Elaborar Cheque A": s.elaborarChequeA || 'N/A',
        "Elaborar Transferencia A": s.elaborarTransferenciaA || 'N/A',
        "Impuestos Pagados Cliente": s.impuestosPagadosCliente ? 'Sí' : 'No',
        "R/C (Imp. Pagados)": s.impuestosPagadosCliente ? (s.impuestosPagadosRC || 'N/A') : 'N/A',
        "T/B (Imp. Pagados)": s.impuestosPagadosCliente ? (s.impuestosPagadosTB || 'N/A') : 'N/A',
        "Cheque (Imp. Pagados)": s.impuestosPagadosCliente ? (s.impuestosPagadosCheque || 'N/A') : 'N/A',
        "Impuestos Pendientes Cliente": s.impuestosPendientesCliente ? 'Sí' : 'No',
        "Soporte": s.soporte ? 'Sí' : 'No',
        "Documentos Adjuntos": s.documentosAdjuntos ? 'Sí' : 'No',
        "Constancias de No Retención": s.constanciasNoRetencion ? 'Sí' : 'No',
        "Constancia 1%": s.constanciasNoRetencion ? (s.constanciasNoRetencion1 ? 'Sí' : 'No') : 'N/A',
        "Constancia 2%": s.constanciasNoRetencion ? (s.constanciasNoRetencion2 ? 'Sí' : 'No') : 'N/A',
        "Pago de Servicios": s.pagoServicios ? 'Sí' : 'No',
        "Tipo de Servicio": s.pagoServicios ? (s.tipoServicio === 'OTROS' ? s.otrosTipoServicio : s.tipoServicio) || 'N/A' : 'N/A',
        "Otro Tipo de Servicio": s.pagoServicios && s.tipoServicio === 'OTROS' ? s.otrosTipoServicio || 'N/A' : 'N/A', 
        "Factura Servicio": s.pagoServicios ? s.facturaServicio || 'N/A' : 'N/A',
        "Institución Servicio": s.pagoServicios ? s.institucionServicio || 'N/A' : 'N/A',
        "Correo Notificación": s.correo || 'N/A',
        "Observación": s.observation || 'N/A',
        "Usuario (De)": s.examManager,
        "Fecha de Guardado": s.savedAt instanceof Date ? format(s.savedAt, "yyyy-MM-dd HH:mm", { locale: es }) : 'N/A',
        "Actualizado Por (Pago)": s.paymentStatusLastUpdatedBy || 'N/A',
        "Fecha Actualización (Pago)": s.paymentStatusLastUpdatedAt && s.paymentStatusLastUpdatedAt instanceof Date ? format(s.paymentStatusLastUpdatedAt, "yyyy-MM-dd HH:mm", { locale: es }) : 'N/A',
        "Comentarios": commentsString,
      };
    });

    try {
      const dataToExport = await Promise.all(dataToExportPromises);
      downloadExcelFileFromTable(dataToExport, headers, `Reporte_Solicitudes_${searchType}_${currentSearchTermForDisplay.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast({ title: "Exportación Completa", description: "El archivo Excel se ha descargado." });
    } catch (err) {
      console.error("Error during data export preparation: ", err);
      toast({ title: "Error de Exportación", description: "No se pudo preparar los datos para exportar.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const renderSearchInputs = () => {
    switch (searchType) {
      case "dateToday": return <p className="text-sm text-muted-foreground flex-grow items-center flex h-10">Se buscarán las solicitudes de hoy.</p>;
      case "dateCurrentMonth": return <p className="text-sm text-muted-foreground flex-grow items-center flex h-10">Se buscarán las solicitudes del mes actual.</p>;
      case "dateSpecific":
        return (
          <Popover>
            <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal flex-grow", !selectedDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{selectedDate ? format(selectedDate, "PPP", { locale: es }) : <span>Seleccione una fecha</span>}</Button></PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus locale={es} /></PopoverContent>
          </Popover>
        );
      case "dateRange":
        return (
          <div className="flex flex-col sm:flex-row gap-2 flex-grow">
            <Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full sm:w-1/2 justify-start text-left font-normal", !datePickerStartDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{datePickerStartDate ? format(datePickerStartDate, "PPP", { locale: es }) : <span>Fecha Inicio</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={datePickerStartDate} onSelect={setDatePickerStartDate} initialFocus locale={es} /></PopoverContent></Popover>
            <Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full sm:w-1/2 justify-start text-left font-normal", !datePickerEndDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{datePickerEndDate ? format(datePickerEndDate, "PPP", { locale: es }) : <span>Fecha Fin</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={datePickerEndDate} onSelect={setDatePickerEndDate} initialFocus locale={es} /></PopoverContent></Popover>
          </div>
        );
      default: return null;
    }
  };

  if (!isClient || (authLoading && !fetchedSolicitudes && !isDetailViewVisible)) {
    return <div className="min-h-screen flex items-center justify-center grid-bg"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>;
  }

  if (isDetailViewVisible && solicitudToViewInline) {
    return (
      <AppShell>
        <div className="py-2 md:py-5">
          <div className="mb-4">
             <Button
                onClick={handleBackToTable}
                className="bg-green-600 text-white hover:bg-green-600 hover:text-white"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Búsqueda
             </Button>
          </div>
          <DatabaseSolicitudDetailView id={solicitudToViewInline.solicitudId} onBackToList={handleBackToTable} isInlineView={true} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="py-2 md:py-5">
        <Card className="w-full max-w-7xl mx-auto custom-shadow">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-foreground">Base de Datos de Solicitudes de Cheque</CardTitle>
            <CardDescription className="text-muted-foreground">Seleccione un tipo de búsqueda e ingrese los criterios.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4 mb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Select value={searchType} onValueChange={(value) => { setSearchType(value as SearchType); setSearchTermText(''); setSelectedDate(undefined); setDatePickerStartDate(undefined); setDatePickerEndDate(undefined); setFetchedSolicitudes(null); setError(null); setDuplicateWarning(null); setCurrentSearchTermForDisplay(''); }}>
                  <SelectTrigger className="w-full sm:w-[200px] shrink-0"><SelectValue placeholder="Tipo de búsqueda" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dateToday">Por Fecha (Hoy)</SelectItem>
                    <SelectItem value="dateCurrentMonth">Por Fecha (Mes Actual)</SelectItem>
                    <SelectItem value="dateSpecific">Por Fecha (Específica)</SelectItem>
                    <SelectItem value="dateRange">Por Fecha (Rango)</SelectItem>
                  </SelectContent>
                </Select>
                {renderSearchInputs()}
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <Button type="submit" className="btn-primary w-full sm:w-auto" disabled={isLoading}><Search className="mr-2 h-4 w-4" /> {isLoading ? 'Buscando...' : 'Ejecutar Búsqueda'}</Button>
                <Button type="button" onClick={handleExport} variant="outline" className="w-full sm:w-auto" disabled={!displayedSolicitudes || isLoading || (displayedSolicitudes && displayedSolicitudes.length === 0) || isExporting}>
                    {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    {isExporting ? 'Exportando...' : 'Exportar Tabla'}
                </Button>
              </div>
            </form>

            {isLoading && <div className="flex justify-center items-center py-6"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-3 text-muted-foreground">Cargando solicitudes...</p></div>}
            {error && <div className="mt-4 p-4 bg-destructive/10 text-destructive border border-destructive/30 rounded-md text-center">{error}</div>}
            {displayedSolicitudes && !isLoading &&
              <SearchResultsTable
                solicitudes={displayedSolicitudes}
                searchType={searchType}
                searchTerm={currentSearchTermForDisplay}
                currentUserRole={user?.role}
                onUpdatePaymentStatus={handleUpdatePaymentStatus}
                onUpdateRecepcionDCStatus={handleUpdateRecepcionDCStatus}
                onOpenMessageDialog={openMessageDialog}
                onViewDetails={handleViewDetailsInline}
                onOpenCommentsDialog={openCommentsDialog}
                filterSolicitudIdInput={filterSolicitudIdInput}
                setFilterSolicitudIdInput={setFilterSolicitudIdInput}
                filterNEInput={filterNEInput}
                setFilterNEInput={setFilterNEInput}
                filterEstadoPagoInput={filterEstadoPagoInput}
                setFilterEstadoPagoInput={setFilterEstadoPagoInput}
                filterFechaSolicitudInput={filterFechaSolicitudInput}
                setFilterFechaSolicitudInput={setFilterFechaSolicitudInput}
                filterMontoInput={filterMontoInput}
                setFilterMontoInput={setFilterMontoInput}
                filterConsignatarioInput={filterConsignatarioInput}
                setFilterConsignatarioInput={setFilterConsignatarioInput}
                filterDeclaracionInput={filterDeclaracionInput}
                setFilterDeclaracionInput={setFilterDeclaracionInput}
                filterReferenciaInput={filterReferenciaInput}
                setFilterReferenciaInput={setFilterReferenciaInput}
                filterGuardadoPorInput={filterGuardadoPorInput}
                setFilterGuardadoPorInput={setFilterGuardadoPorInput}
                filterEstadoSolicitudInput={filterEstadoSolicitudInput}
                setFilterEstadoSolicitudInput={setFilterEstadoSolicitudInput}
                duplicateWarning={duplicateWarning}
              />
            }
            {!fetchedSolicitudes && !isLoading && !error && !currentSearchTermForDisplay && <div className="mt-4 p-4 bg-blue-500/10 text-blue-700 border border-blue-500/30 rounded-md text-center">Seleccione un tipo de búsqueda e ingrese los criterios para ver resultados.</div>}
            {fetchedSolicitudes && fetchedSolicitudes.length === 0 && !isLoading && !error && currentSearchTermForDisplay && (
                <div className="mt-4 p-4 bg-yellow-500/10 text-yellow-700 border border-yellow-500/30 rounded-md text-center">
                    No se encontraron solicitudes para los criterios de búsqueda ingresados.
                </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir Mensaje de Error para Solicitud</DialogTitle>
            <DialogDescription>
              Solicitud ID: {currentSolicitudIdForMessage}. Si guarda un mensaje, el estado se marcará como &quot;Error&quot;.
              Si guarda un mensaje vacío y el estado actual es un error o pagado, se limpiará el estado de error/pago (pasará a pendiente).
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Escriba el mensaje de error aquí..."
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsMessageDialogOpen(false); setMessageText(''); setCurrentSolicitudIdForMessage(null);}}>Cancelar</Button>
            <Button onClick={handleSaveMessage}>Guardar Mensaje</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comments Dialog */}
      <Dialog open={isCommentsDialogOpen} onOpenChange={closeCommentsDialog}>
        <DialogContent className="sm:max-w-2xl"> {/* Increased width */}
          <DialogHeader>
            <DialogTitle>Comentarios para Solicitud ID: {currentSolicitudIdForComments}</DialogTitle>
            <DialogDescription>
              Ver y añadir comentarios para esta solicitud.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="h-60 overflow-y-auto border p-2 rounded-md bg-muted/20 space-y-2">
              {isLoadingComments ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="ml-2 text-sm text-muted-foreground">Cargando comentarios...</p>
                </div>
              ) : comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No hay comentarios aún.</p>
              ) : (
                comments.map(comment => (
                  <div key={comment.id} className="p-2 my-1 border-b bg-card shadow-sm rounded"> {/* Removed base text-xs */}
                    <div className="flex justify-between items-center mb-1">
                        <p className="font-semibold text-primary text-xs">{comment.userEmail}</p> {/* Added text-xs */}
                        <p className="text-muted-foreground text-xs"> {/* Added text-xs */}
                            {format(comment.createdAt, "dd/MM/yyyy HH:mm", { locale: es })}
                        </p>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{comment.text}</p> {/* Changed to text-sm */}
                  </div>
                ))
              )}
            </div>
            <div>
              <Label htmlFor="newCommentTextarea" className="text-sm font-medium text-foreground">Nuevo Comentario:</Label>
              <Textarea
                id="newCommentTextarea"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Escriba su comentario aquí..."
                rows={3}
                className="mt-1"
                disabled={isPostingComment}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeCommentsDialog} disabled={isPostingComment}>Cancelar</Button>
            <Button onClick={handlePostComment} disabled={isPostingComment || !newCommentText.trim()}>
                {isPostingComment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isPostingComment ? 'Publicando...' : 'Publicar Comentario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </AppShell>
  );
}
