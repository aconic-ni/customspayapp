
"use client";
import { useState, useEffect, type FormEvent, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Search, Download, Eye, Calendar as CalendarIcon, MessageSquare, Info as InfoIcon, AlertCircle, CheckCircle2, User, FileText as FileTextIcon, ListCollapse, ArrowLeft } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp as FirestoreTimestamp, doc, getDoc, orderBy, updateDoc, serverTimestamp, or } from 'firebase/firestore';
import type { SolicitudRecord } from '@/types';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import DatabaseSolicitudDetailView from '@/components/database/DatabaseSolicitudDetailView';

type SearchType = "ne" | "solicitudId" | "manager" | "dateToday" | "dateSpecific" | "dateRange" | "dateCurrentMonth";

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

interface SearchResultsTableProps {
  solicitudes: SolicitudRecord[];
  searchType: SearchType;
  searchTerm?: string;
  currentUserRole?: string;
  onUpdatePaymentStatus: (solicitudId: string, status: string | null, message?: string) => Promise<void>;
  onOpenMessageDialog: (solicitudId: string) => void;
  onViewDetails: (solicitud: SolicitudRecord) => void;
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
  filterUsuarioDeInput: string;
  setFilterUsuarioDeInput: (value: string) => void;
  filterGuardadoPorInput: string;
  setFilterGuardadoPorInput: (value: string) => void;
}

const SearchResultsTable: React.FC<SearchResultsTableProps> = ({
  solicitudes,
  searchType,
  searchTerm,
  currentUserRole,
  onUpdatePaymentStatus,
  onOpenMessageDialog,
  onViewDetails,
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
  filterUsuarioDeInput,
  setFilterUsuarioDeInput,
  filterGuardadoPorInput,
  setFilterGuardadoPorInput,
}) => {
  const { toast } = useToast();
  const { user } = useAuth();

  if (!solicitudes || solicitudes.length === 0) {
    let message = "No se encontraron solicitudes para los criterios ingresados.";
    if (searchType === "ne" && searchTerm) message = `No se encontraron solicitudes para el NE: ${searchTerm}`;
    else if (searchType === "solicitudId" && searchTerm) message = `No se encontró la solicitud con ID: ${searchTerm}`;
    else if (searchType === "manager" && searchTerm) message = `No se encontraron solicitudes para el Usuario (Guardado Por): ${searchTerm}`;
    else if (searchType === "dateToday") message = "No se encontraron solicitudes para hoy."
    else if (searchType === "dateCurrentMonth") message = `No se encontraron solicitudes para ${searchTerm}.`
    return <p className="text-muted-foreground text-center py-4">{message}</p>;
  }

  const getTitle = () => {
    if (searchType === "ne" && searchTerm) return `Solicitudes para NE: ${searchTerm}`;
    if (searchType === "solicitudId" && solicitudes.length > 0) return `Detalle Solicitud ID: ${solicitudes[0].solicitudId}`;
    if (searchType === "manager" && searchTerm) return `Solicitudes del Usuario (Guardado Por): ${searchTerm}`;
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
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto table-container rounded-lg border">
          <Table>
            <TableHeader className="bg-secondary/50">
              <TableRow>
                <TableHead className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  Estado de Pago
                  <Input
                    type="text"
                    placeholder="Filtrar Estado..."
                    value={filterEstadoPagoInput}
                    onChange={(e) => setFilterEstadoPagoInput(e.target.value)}
                    className="mt-1 h-8 text-xs"
                  />
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
                  Usuario (De)
                  <Input
                    type="text"
                    placeholder="Filtrar Usuario (De)..."
                    value={filterUsuarioDeInput}
                    onChange={(e) => setFilterUsuarioDeInput(e.target.value)}
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
                    {currentUserRole === 'calificador' ? (
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={solicitud.paymentStatus === 'Pagado'}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              onUpdatePaymentStatus(solicitud.solicitudId, 'Pagado');
                            } else {
                              if (solicitud.paymentStatus === 'Pagado') {
                                 onUpdatePaymentStatus(solicitud.solicitudId, null);
                              }
                            }
                          }}
                          aria-label="Marcar como pagado"
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
                                <p>Última actualización:</p>
                                {solicitud.paymentStatusLastUpdatedBy && <p>Por: {solicitud.paymentStatusLastUpdatedBy}</p>}
                                {solicitud.paymentStatusLastUpdatedAt && solicitud.paymentStatusLastUpdatedAt instanceof Date && <p>Fecha: {format(solicitud.paymentStatusLastUpdatedAt, "Pp", { locale: es })}</p>}
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
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">{solicitud.examManager}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">{solicitud.savedBy || 'N/A'}</TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewDetails(solicitud)}
                    >
                      <Eye className="mr-2 h-4 w-4" /> Ver
                    </Button>
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

  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [currentSolicitudIdForMessage, setCurrentSolicitudIdForMessage] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');

  const [filterSolicitudIdInput, setFilterSolicitudIdInput] = useState('');
  const [filterNEInput, setFilterNEInput] = useState('');
  const [filterEstadoPagoInput, setFilterEstadoPagoInput] = useState('');
  const [filterFechaSolicitudInput, setFilterFechaSolicitudInput] = useState('');
  const [filterMontoInput, setFilterMontoInput] = useState('');
  const [filterConsignatarioInput, setFilterConsignatarioInput] = useState('');
  const [filterDeclaracionInput, setFilterDeclaracionInput] = useState('');
  const [filterUsuarioDeInput, setFilterUsuarioDeInput] = useState('');
  const [filterGuardadoPorInput, setFilterGuardadoPorInput] = useState('');

  const [solicitudToViewInline, setSolicitudToViewInline] = useState<SolicitudRecord | null>(null);
  const [isDetailViewVisible, setIsDetailViewVisible] = useState(false);

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
    let filtered = fetchedSolicitudes;
  
    if (filterSolicitudIdInput) {
      filtered = filtered.filter(s =>
        s.solicitudId.toLowerCase().includes(filterSolicitudIdInput.toLowerCase())
      );
    }
  
    if (filterNEInput) {
      filtered = filtered.filter(s =>
        s.examNe.toLowerCase().includes(filterNEInput.toLowerCase())
      );
    }
  
    if (filterEstadoPagoInput) {
      filtered = filtered.filter(s => {
        const statusText = s.paymentStatus ? s.paymentStatus.toLowerCase() : "pendiente";
        return statusText.includes(filterEstadoPagoInput.toLowerCase());
      });
    }
  
    if (filterFechaSolicitudInput) {
      filtered = filtered.filter(s => {
        const dateText = s.examDate && s.examDate instanceof Date
          ? format(s.examDate, "PPP", { locale: es })
          : 'N/A';
        return dateText.toLowerCase().includes(filterFechaSolicitudInput.toLowerCase());
      });
    }
  
    if (filterMontoInput) {
      filtered = filtered.filter(s => {
        const montoText = formatCurrencyFetched(s.monto ?? undefined, s.montoMoneda || undefined);
        return montoText.toLowerCase().includes(filterMontoInput.toLowerCase());
      });
    }
  
    if (filterConsignatarioInput) {
      filtered = filtered.filter(s =>
        (s.consignatario || '').toLowerCase().includes(filterConsignatarioInput.toLowerCase())
      );
    }
  
    if (filterDeclaracionInput) {
      filtered = filtered.filter(s =>
        (s.declaracionNumero || '').toLowerCase().includes(filterDeclaracionInput.toLowerCase())
      );
    }
  
    if (filterUsuarioDeInput) {
      filtered = filtered.filter(s =>
        (s.examManager || '').toLowerCase().includes(filterUsuarioDeInput.toLowerCase())
      );
    }
  
    if (filterGuardadoPorInput && user?.role !== 'autorevisor') {
      filtered = filtered.filter(s =>
        (s.savedBy || '').toLowerCase().includes(filterGuardadoPorInput.toLowerCase())
      );
    } else if (user?.role === 'autorevisor' && user?.email) {
        filtered = filtered.filter(s =>
        (s.savedBy || '').toLowerCase() === user.email!.toLowerCase()
      );
    }
  
    return filtered;
  }, [
    fetchedSolicitudes,
    filterSolicitudIdInput,
    filterNEInput,
    filterEstadoPagoInput,
    filterFechaSolicitudInput,
    filterMontoInput,
    filterConsignatarioInput,
    filterDeclaracionInput,
    filterUsuarioDeInput,
    filterGuardadoPorInput,
    user?.role,
    user?.email
  ]);
  


  const handleUpdatePaymentStatus = useCallback(async (solicitudId: string, status: string | null, message?: string) => {
    if (!user || !user.email) {
      toast({ title: "Error", description: "Usuario no autenticado.", variant: "destructive" });
      return;
    }
    const docRef = doc(db, "SolicitudCheques", solicitudId);
    try {
      let newStatus = status;
      if (message && message.trim() !== '') {
        newStatus = `Error: ${message.trim()}`;
      } else if (message === '' && status && status.startsWith('Error:')) {
      } else if (message === '' && !status) {
         const currentSolicitud = fetchedSolicitudes?.find(s => s.solicitudId === solicitudId);
         if(currentSolicitud?.paymentStatus?.startsWith('Error:')) {
            newStatus = null;
         } else if (status === null && currentSolicitud?.paymentStatus === 'Pagado') {
            newStatus = null;
         }
      }


      await updateDoc(docRef, {
        paymentStatus: newStatus,
        paymentStatusLastUpdatedAt: serverTimestamp(), 
        paymentStatusLastUpdatedBy: user.email,
      });
      toast({ title: "Éxito", description: `Estado de pago actualizado para ${solicitudId}.` });
      setFetchedSolicitudes(prev =>
        prev?.map(s =>
          s.solicitudId === solicitudId
            ? { ...s,
                paymentStatus: newStatus || undefined, 
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
  }, [user, toast, fetchedSolicitudes]);

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
      const currentSolicitud = fetchedSolicitudes?.find(s => s.solicitudId === currentSolicitudIdForMessage);
      if (messageText.trim() === '' && currentSolicitud?.paymentStatus?.startsWith('Error:')) {
        await handleUpdatePaymentStatus(currentSolicitudIdForMessage, null);
      } else if (messageText.trim() !== '') {
        await handleUpdatePaymentStatus(currentSolicitudIdForMessage, `Error: ${messageText.trim()}`, messageText.trim());
      }
    }
    setIsMessageDialogOpen(false);
    setMessageText('');
    setCurrentSolicitudIdForMessage(null);
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
    setCurrentSearchTermForDisplay('');
    setIsDetailViewVisible(false);
    setSolicitudToViewInline(null);

    setFilterSolicitudIdInput('');
    setFilterNEInput('');
    setFilterEstadoPagoInput('');
    setFilterFechaSolicitudInput('');
    setFilterMontoInput('');
    setFilterConsignatarioInput('');
    setFilterDeclaracionInput('');
    setFilterUsuarioDeInput('');
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
            
            let examDateValue: Date | undefined;
            if (docData.examDate instanceof FirestoreTimestamp) {
                examDateValue = docData.examDate.toDate();
            } else if (docData.examDate instanceof Date) { // Should not happen from Firestore directly
                examDateValue = docData.examDate;
            }

            let savedAtValue: Date | undefined;
            if (docData.savedAt instanceof FirestoreTimestamp) {
                savedAtValue = docData.savedAt.toDate();
            } else if (docData.savedAt instanceof Date) { // Should not happen
                savedAtValue = docData.savedAt;
            }
            
            const paymentStatusLastUpdatedAt = docData.paymentStatusLastUpdatedAt instanceof FirestoreTimestamp ? docData.paymentStatusLastUpdatedAt.toDate() : (docData.paymentStatusLastUpdatedAt instanceof Date ? docData.paymentStatusLastUpdatedAt : undefined);

            return {
              ...docData,
              solicitudId: docSnap.id,
              examDate: examDateValue,
              savedAt: savedAtValue,
              paymentStatusLastUpdatedAt: paymentStatusLastUpdatedAt,
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
              paymentStatus: docData.paymentStatus || undefined,
              paymentStatusLastUpdatedBy: docData.paymentStatusLastUpdatedBy || undefined,
            } as SolicitudRecord;
          });
          setFetchedSolicitudes(data);
        } else { setError("No se encontraron solicitudes para los criterios ingresados."); }
      }
    } catch (err: any) {
      console.error("Error fetching documents from Firestore: ", err);
      let userFriendlyError = "Error al buscar las solicitudes. Intente de nuevo.";
      if (err.code === 'permission-denied') { 
        userFriendlyError = "No tiene permisos para acceder a esta información."; 
      } else if (err.code === 'failed-precondition') {
        if (searchType === "manager") {
          if (datePickerStartDate || datePickerEndDate) {
             userFriendlyError = "Error de consulta: Para buscar 'Por Usuario (Guardado Por)' con filtro de fecha, necesita un índice compuesto en Firestore. Por favor, cree un índice en la colección 'SolicitudCheques' con los campos: 'savedBy' (ascendente), 'examDate' (descendente). Puede haber un enlace en la consola del navegador para ayudarle a crearlos.";
          } else {
             userFriendlyError = "Error de consulta: Para buscar 'Por Usuario (Guardado Por)', necesita un índice en Firestore en el campo 'savedBy' (ascendente) y 'examDate' (descendente). Puede haber un enlace en la consola del navegador para ayudarle a crearlos.";
          }
        } else if (searchType === "ne") {
            userFriendlyError = "Error de consulta: Para buscar 'Por NE', necesita un índice en Firestore en el campo 'examNe' (ascendente) y 'examDate' (descendente). Puede haber un enlace en la consola del navegador para ayudarle a crearlo.";
        }
         else {
            userFriendlyError = "Error de consulta: asegúrese de tener los índices necesarios creados en Firestore para los campos y orden seleccionados. La creación de índices puede tardar unos minutos. Por favor, cree este índice en la consola de Firestore (puede haber un enlace en la consola del navegador).";
        }
      }
      setError(userFriendlyError);
    } finally { setIsLoading(false); }
  };

  const handleExport = () => {
    const dataToUse = displayedSolicitudes || [];
    if (dataToUse.length > 0) {
      const headers = [
        "Estado de Pago", "ID Solicitud", "Fecha de Solicitud", "NE", "Monto", "Moneda Monto", "Consignatario", "Declaracion", "Usuario (De)", "Guardado Por",
        "Cantidad en Letras", "Referencia Solicitud", "Destinatario Solicitud",
        "Unidad Recaudadora", "Código 1", "Codigo MUR", "Banco", "Otro Banco", "Número de Cuenta", "Moneda de la Cuenta", "Otra Moneda Cuenta",
        "Elaborar Cheque A", "Elaborar Transferencia A",
        "Impuestos Pagados Cliente", "R/C (Imp. Pagados)", "T/B (Imp. Pagados)", "Cheque (Imp. Pagados)",
        "Impuestos Pendientes Cliente", "Soporte", "Documentos Adjuntos",
        "Constancias de No Retención", "Constancia 1%", "Constancia 2%",
        "Pago de Servicios", "Tipo de Servicio", "Otro Tipo de Servicio", "Factura Servicio", "Institución Servicio",
        "Correo Notificación", "Observación",
        "Fecha de Guardado", "Actualizado Por (Pago)", "Fecha Actualización (Pago)"
      ];
      const dataToExport = dataToUse.map(s => ({
        "Estado de Pago": s.paymentStatus || 'Pendiente',
        "ID Solicitud": s.solicitudId,
        "Fecha de Solicitud": s.examDate instanceof Date ? format(s.examDate, "yyyy-MM-dd HH:mm", { locale: es }) : 'N/A',
        "NE": s.examNe,
        "Monto": s.monto,
        "Moneda Monto": s.montoMoneda,
        "Consignatario": s.consignatario || 'N/A',
        "Declaracion": s.declaracionNumero || 'N/A',
        "Usuario (De)": s.examManager, 
        "Guardado Por": s.savedBy || 'N/A', 

        "Cantidad en Letras": s.cantidadEnLetras || 'N/A',
        "Referencia Solicitud": s.examReference || 'N/A',
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
        "Fecha de Guardado": s.savedAt instanceof Date ? format(s.savedAt, "yyyy-MM-dd HH:mm", { locale: es }) : 'N/A',
        "Actualizado Por (Pago)": s.paymentStatusLastUpdatedBy || 'N/A',
        "Fecha Actualización (Pago)": s.paymentStatusLastUpdatedAt && s.paymentStatusLastUpdatedAt instanceof Date ? format(s.paymentStatusLastUpdatedAt, "yyyy-MM-dd HH:mm", { locale: es }) : 'N/A',
      }));
      downloadExcelFileFromTable(dataToExport, headers, `Reporte_Solicitudes_${searchType}_${currentSearchTermForDisplay.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else { toast({ title: "Sin Datos", description: "No hay datos para exportar. Realice una búsqueda primero.", variant: "default"}); }
  };

  const renderSearchInputs = () => {
    switch (searchType) {
      case "ne":
      case "solicitudId":
        return <Input type="text" placeholder={searchType === "ne" ? "Ingrese NE (Ej: NX1-12345)" : "Ingrese ID Solicitud Completo"} value={searchTermText} onChange={(e) => setSearchTermText(e.target.value)} className="flex-grow" aria-label="Término de búsqueda" />;
      case "manager":
        return (
          <div className="flex-grow space-y-3">
            <Input 
              type="text" 
              placeholder="Ingrese Usuario (Guardado Por)" 
              value={searchTermText} 
              onChange={(e) => setSearchTermText(e.target.value)} 
              className="w-full" 
              aria-label="Término de búsqueda de usuario" 
            />
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Filtrar por rango de fechas (Opcional):</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !datePickerStartDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {datePickerStartDate ? format(datePickerStartDate, "PPP", { locale: es }) : <span>Fecha Inicio</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={datePickerStartDate} onSelect={setDatePickerStartDate} initialFocus locale={es} />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !datePickerEndDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {datePickerEndDate ? format(datePickerEndDate, "PPP", { locale: es }) : <span>Fecha Fin</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={datePickerEndDate} onSelect={setDatePickerEndDate} initialFocus locale={es} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        );
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
              <Select value={searchType} onValueChange={(value) => { setSearchType(value as SearchType); setSearchTermText(''); setSelectedDate(undefined); setDatePickerStartDate(undefined); setDatePickerEndDate(undefined); setFetchedSolicitudes(null); setError(null); setCurrentSearchTermForDisplay(''); }}>
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
                <Button type="button" onClick={handleExport} variant="outline" className="w-full sm:w-auto" disabled={!displayedSolicitudes || isLoading || (displayedSolicitudes && displayedSolicitudes.length === 0)}><Download className="mr-2 h-4 w-4" /> Exportar Tabla</Button>
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
                onOpenMessageDialog={openMessageDialog}
                onViewDetails={handleViewDetailsInline}
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
                filterUsuarioDeInput={filterUsuarioDeInput}
                setFilterUsuarioDeInput={setFilterUsuarioDeInput}
                filterGuardadoPorInput={filterGuardadoPorInput} 
                setFilterGuardadoPorInput={setFilterGuardadoPorInput}
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
              Si guarda un mensaje vacío y el estado actual es un error, se limpiará el estado de error.
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
    </AppShell>
  );
}
