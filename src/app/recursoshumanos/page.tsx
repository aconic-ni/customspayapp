
"use client";
import { useState, useEffect, type FormEvent, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Search, Download, Eye, Calendar as CalendarIcon, MessageSquare, Info as InfoIcon, AlertCircle, CheckCircle2, FileText as FileTextIcon, ListCollapse, ArrowLeft, Briefcase, Trash2, MessageSquareText, User, ArrowUpDown } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp as FirestoreTimestamp, doc, getDoc, orderBy, updateDoc, serverTimestamp, writeBatch, addDoc, getCountFromServer } from 'firebase/firestore';
import type { SolicitudRecord, CommentRecord, Collaborator } from '@/types';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import DatabaseSolicitudDetailView from '@/components/database/DatabaseSolicitudDetailView';

type SearchType = "dateToday" | "dateSpecific" | "dateCurrentMonth";
type RHPaymentStatus = 'caso_no_iniciado' | 'pagado_efectivo' | 'proceso_deduccion' | 'otros';
type SortableColumns = 'collaborator' | 'date' | 'amount';
type SortDirection = 'asc' | 'desc';

const formatCurrencyFetched = (amount?: number | string | null, currency?: string) => {
    if (amount === undefined || amount === null || amount === '') return 'N/A';
    const num = Number(amount);
    if (isNaN(num)) return String(amount);

    let prefix = '';
    if (currency === 'cordoba') prefix = 'C$';
    else if (currency === 'dolar') prefix = 'US$';
    else if (currency === 'euro') prefix = '€';
    return `${prefix}${num.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

interface SearchResultsTableProps {
  solicitudes: SolicitudRecord[];
  onViewDetails: (solicitud: SolicitudRecord) => void;
  onOpenCommentsDialog: (solicitudId: string) => void;
  filterNEInput: string;
  setFilterNEInput: (value: string) => void;
  filterSolicitudIdInput: string;
  setFilterSolicitudIdInput: (value: string) => void;
  filterGuardadoPorInput: string;
  setFilterGuardadoPorInput: (value: string) => void;
  onUpdateRHStatus: (solicitudId: string, status: RHPaymentStatus, details?: { otherDetails?: string; paymentDate?: Date; startDate?: Date; endDate?: Date }) => void;
  onSort: (column: SortableColumns) => void;
  sortColumn: SortableColumns | null;
  sortDirection: SortDirection;
}

const SearchResultsTable: React.FC<SearchResultsTableProps> = ({
  solicitudes,
  onViewDetails,
  onOpenCommentsDialog,
  filterNEInput,
  setFilterNEInput,
  filterSolicitudIdInput,
  setFilterSolicitudIdInput,
  filterGuardadoPorInput,
  setFilterGuardadoPorInput,
  onUpdateRHStatus,
  onSort,
  sortColumn,
  sortDirection
}) => {
  const { toast } = useToast();
  
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<RHPaymentStatus | null>(null);
  const [otherDetails, setOtherDetails] = useState('');
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(undefined);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  
  const openEditDialog = (solicitud: SolicitudRecord) => {
    setEditingStatusId(solicitud.solicitudId);
    setCurrentStatus(solicitud.rhPaymentStatus as RHPaymentStatus || 'caso_no_iniciado');
    setOtherDetails(solicitud.rhPaymentOtherDetails || '');
    setPaymentDate(solicitud.rhPaymentDate);
    setStartDate(solicitud.rhPaymentStartDate);
    setEndDate(solicitud.rhPaymentEndDate);
  };
  
  const closeEditDialog = () => {
    setEditingStatusId(null);
  };

  const handleSaveStatus = () => {
    if (editingStatusId && currentStatus) {
      if(currentStatus === 'otros' && !otherDetails.trim()){
        toast({title: "Error", description: "Debe proveer detalles para el estado 'Otros'.", variant: "destructive"});
        return;
      }
      onUpdateRHStatus(editingStatusId, currentStatus, {
        otherDetails,
        paymentDate,
        startDate,
        endDate
      });
      closeEditDialog();
    }
  };

  if (!solicitudes || solicitudes.length === 0) {
    return <p className="text-muted-foreground text-center py-4">No se encontraron memorandums para los criterios ingresados.</p>;
  }

  const renderCollaborators = (collaborators: Collaborator[] | undefined) => {
    if (!collaborators || collaborators.length === 0) {
      return <Badge variant="secondary">N/A</Badge>;
    }
    const firstCollaborator = collaborators[0];
    const remainingCount = collaborators.length - 1;

    return (
      <div className="flex items-center space-x-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
                <div className="flex items-center space-x-1 cursor-pointer">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm truncate max-w-[120px]">{firstCollaborator.name}</span>
                </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{firstCollaborator.name} ({firstCollaborator.number})</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {remainingCount > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="cursor-pointer">+{remainingCount}</Badge>
              </TooltipTrigger>
              <TooltipContent>
                 <ul className="list-disc list-inside">
                    {collaborators.slice(1).map(c => <li key={c.id}>{c.name} ({c.number})</li>)}
                 </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  };

  return (
    <>
    <Card className="mt-6 w-full custom-shadow">
      <CardHeader>
        <CardTitle className="text-xl md:text-2xl font-semibold text-foreground">Memorandums Encontrados</CardTitle>
        <CardDescription className="text-muted-foreground">Se encontraron {solicitudes.length} memorandum(s).</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto table-container rounded-lg border">
          <Table>
            <TableHeader className="bg-secondary/50">
              <TableRow>
                <TableHead>Acciones</TableHead>
                <TableHead>Estado de Pago (RH)</TableHead>
                <TableHead>Fechas de Pago (RH)</TableHead>
                <TableHead>
                    <Button variant="ghost" onClick={() => onSort('collaborator')} className="px-1">
                        Colaborador(es)
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                </TableHead>
                <TableHead>
                    <Button variant="ghost" onClick={() => onSort('date')} className="px-1">
                        Fecha
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                </TableHead>
                <TableHead>
                    <Button variant="ghost" onClick={() => onSort('amount')} className="px-1">
                        Monto
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                </TableHead>
                <TableHead>Consignatario</TableHead>
                <TableHead>
                  Guardado Por
                   <Input
                    type="text"
                    placeholder="Filtrar Guardado Por..."
                    value={filterGuardadoPorInput}
                    onChange={(e) => setFilterGuardadoPorInput(e.target.value)}
                    className="mt-1 h-8 text-xs"
                  />
                </TableHead>
                <TableHead>
                  NE
                   <Input
                    type="text"
                    placeholder="Filtrar NE..."
                    value={filterNEInput}
                    onChange={(e) => setFilterNEInput(e.target.value)}
                    className="mt-1 h-8 text-xs"
                  />
                </TableHead>
                <TableHead>
                  ID Solicitud
                   <Input
                    type="text"
                    placeholder="Filtrar ID..."
                    value={filterSolicitudIdInput}
                    onChange={(e) => setFilterSolicitudIdInput(e.target.value)}
                    className="mt-1 h-8 text-xs"
                  />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-card divide-y divide-border">
              {solicitudes.map((solicitud) => (
                <TableRow key={solicitud.solicitudId} className="hover:bg-muted/50">
                  <TableCell className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => onViewDetails(solicitud)} className="px-2 py-1 h-auto"><Eye className="h-3.5 w-3.5" /></Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Ver Detalles</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => onOpenCommentsDialog(solicitud.solicitudId)} className="px-2 py-1 h-auto"><MessageSquareText className="h-3.5 w-3.5" /></Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Comentarios</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Badge variant="secondary">{solicitud.commentsCount ?? 0}</Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="link" onClick={() => openEditDialog(solicitud)} className="p-0 h-auto">
                        {solicitud.rhPaymentStatus === 'caso_no_iniciado' ? <Badge>Caso no iniciado</Badge> :
                         solicitud.rhPaymentStatus === 'pagado_efectivo' ? <Badge className="bg-green-100 text-green-700">Pagado Efectivo</Badge> :
                         solicitud.rhPaymentStatus === 'proceso_deduccion' ? <Badge className="bg-blue-100 text-blue-700">En Deducción</Badge> :
                         solicitud.rhPaymentStatus === 'otros' ? <Badge className="bg-yellow-100 text-yellow-700">Otros: {solicitud.rhPaymentOtherDetails}</Badge> :
                         <Badge>Caso no iniciado</Badge>}
                    </Button>
                  </TableCell>
                  <TableCell>
                    {solicitud.rhPaymentStatus === 'proceso_deduccion' ? 
                       `Inicio: ${solicitud.rhPaymentStartDate ? format(solicitud.rhPaymentStartDate, 'dd/MM/yy') : 'N/A'} - Fin: ${solicitud.rhPaymentEndDate ? format(solicitud.rhPaymentEndDate, 'dd/MM/yy') : 'N/A'}` :
                     solicitud.rhPaymentDate ? `Fecha: ${format(solicitud.rhPaymentDate, 'dd/MM/yy')}` : 'N/A'
                    }
                  </TableCell>
                  <TableCell>
                    {renderCollaborators(solicitud.memorandumCollaborators)}
                  </TableCell>
                  <TableCell>{solicitud.examDate instanceof Date ? format(solicitud.examDate, "dd/MM/yy", { locale: es }) : 'N/A'}</TableCell>
                  <TableCell>{formatCurrencyFetched(solicitud.monto ?? undefined, solicitud.montoMoneda || undefined)}</TableCell>
                  <TableCell>{solicitud.consignatario || 'N/A'}</TableCell>
                  <TableCell>{solicitud.savedBy || 'N/A'}</TableCell>
                  <TableCell>{solicitud.examNe}</TableCell>
                  <TableCell>{solicitud.solicitudId}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    <Dialog open={!!editingStatusId} onOpenChange={(isOpen) => !isOpen && closeEditDialog()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Estado de Pago (RH) para {editingStatusId}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Select value={currentStatus || ''} onValueChange={(v) => setCurrentStatus(v as RHPaymentStatus)}>
            <SelectTrigger><SelectValue/></SelectTrigger>
            <SelectContent>
              <SelectItem value="caso_no_iniciado">Caso no iniciado</SelectItem>
              <SelectItem value="pagado_efectivo">Pagado en efectivo</SelectItem>
              <SelectItem value="proceso_deduccion">En proceso de deducción</SelectItem>
              <SelectItem value="otros">Otros</SelectItem>
            </SelectContent>
          </Select>

          {currentStatus === 'otros' && (
            <Textarea placeholder="Detalles para 'Otros'" value={otherDetails} onChange={(e) => setOtherDetails(e.target.value)} />
          )}

          {(currentStatus === 'pagado_efectivo' || currentStatus === 'otros') && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline"><CalendarIcon className="mr-2 h-4 w-4" />{paymentDate ? format(paymentDate, "PPP", { locale: es }) : "Fecha de Pago"}</Button>
              </PopoverTrigger>
              <PopoverContent><Calendar mode="single" selected={paymentDate} onSelect={setPaymentDate} /></PopoverContent>
            </Popover>
          )}

          {currentStatus === 'proceso_deduccion' && (
            <div className="flex gap-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline"><CalendarIcon className="mr-2 h-4 w-4" />{startDate ? format(startDate, "PPP", { locale: es }) : "Fecha Inicio"}</Button>
                </PopoverTrigger>
                <PopoverContent><Calendar mode="single" selected={startDate} onSelect={setStartDate} /></PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline"><CalendarIcon className="mr-2 h-4 w-4" />{endDate ? format(endDate, "PPP", { locale: es }) : "Fecha Fin"}</Button>
                </PopoverTrigger>
                <PopoverContent><Calendar mode="single" selected={endDate} onSelect={setEndDate} /></PopoverContent>
              </Popover>
            </div>
          )}

        </div>
        <DialogFooter>
          <Button variant="outline" onClick={closeEditDialog}>Cancelar</Button>
          <Button onClick={handleSaveStatus}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};


export default function RecursosHumanosPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [searchType, setSearchType] = useState<SearchType>("dateToday");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isSpecificDatePopoverOpen, setIsSpecificDatePopoverOpen] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedSolicitudes, setFetchedSolicitudes] = useState<SolicitudRecord[] | null>(null);
  const [isClient, setIsClient] = useState(false);
  
  const [isCommentsDialogOpen, setIsCommentsDialogOpen] = useState(false);
  const [currentSolicitudIdForComments, setCurrentSolicitudIdForComments] = useState<string | null>(null);
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isPostingComment, setIsPostingComment] = useState(false);


  const [solicitudToViewInline, setSolicitudToViewInline] = useState<SolicitudRecord | null>(null);
  const [isDetailViewVisible, setIsDetailViewVisible] = useState(false);
  
  const [filterNEInput, setFilterNEInput] = useState('');
  const [filterSolicitudIdInput, setFilterSolicitudIdInput] = useState('');
  const [filterGuardadoPorInput, setFilterGuardadoPorInput] = useState('');

  const [sortColumn, setSortColumn] = useState<SortableColumns | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [isExporting, setIsExporting] = useState(false);


  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && !authLoading) {
      const isAuthorized = user && (user.role === 'recursosHumanos' || user.role === 'admin' || user.role === 'revisor' || user.role === 'calificador');
      if (!isAuthorized) {
        router.push('/');
      }
    }
  }, [user, authLoading, router, isClient]);

  const handleSearch = useCallback(async (event?: FormEvent) => {
    if (event) event.preventDefault();

    setIsLoading(true);
    setError(null);
    setFetchedSolicitudes(null);

    const memorandumsCollectionRef = collection(db, "Memorandum");
    let q = query(memorandumsCollectionRef, orderBy("examDate", "desc"));

    if (searchType === "dateSpecific" && selectedDate) {
      const specificDayStart = startOfDay(selectedDate);
      const specificDayEnd = endOfDay(selectedDate);
      q = query(q, where("examDate", ">=", FirestoreTimestamp.fromDate(specificDayStart)), where("examDate", "<=", FirestoreTimestamp.fromDate(specificDayEnd)));
    } else if (searchType === "dateToday") {
        const todayStart = startOfDay(new Date());
        const todayEnd = endOfDay(new Date());
        q = query(q, where("examDate", ">=", FirestoreTimestamp.fromDate(todayStart)), where("examDate", "<=", FirestoreTimestamp.fromDate(todayEnd)));
    } else if (searchType === "dateCurrentMonth") {
        const monthStart = startOfMonth(new Date());
        const monthEnd = endOfMonth(new Date());
        q = query(q, where("examDate", ">=", FirestoreTimestamp.fromDate(monthStart)), where("examDate", "<=", FirestoreTimestamp.fromDate(monthEnd)));
    }


    try {
      const querySnapshot = await getDocs(q);
      const dataPromises = querySnapshot.docs.map(async (docSnap) => {
        const docData = docSnap.data();
        let commentsCount = 0;
          try {
            const commentsColRef = collection(db, "Memorandum", docSnap.id, "comments");
            const commentsSnapshot = await getCountFromServer(commentsColRef);
            commentsCount = commentsSnapshot.data().count;
          } catch (countError) {
            console.error(`Error fetching comments count for ${docSnap.id}: `, countError);
          }
        return {
          ...docData,
          solicitudId: docSnap.id,
          examDate: docData.examDate instanceof FirestoreTimestamp ? docData.examDate.toDate() : undefined,
          savedAt: docData.savedAt instanceof FirestoreTimestamp ? docData.savedAt.toDate() : undefined,
          rhPaymentDate: docData.rhPaymentDate instanceof FirestoreTimestamp ? docData.rhPaymentDate.toDate() : undefined,
          rhPaymentStartDate: docData.rhPaymentStartDate instanceof FirestoreTimestamp ? docData.rhPaymentStartDate.toDate() : undefined,
          rhPaymentEndDate: docData.rhPaymentEndDate instanceof FirestoreTimestamp ? docData.rhPaymentEndDate.toDate() : undefined,
          commentsCount,
        } as SolicitudRecord;
      });
      const data = await Promise.all(dataPromises);
      setFetchedSolicitudes(data);
    } catch (err: any) {
      setError("Error al buscar los memorandums.");
    } finally {
      setIsLoading(false);
    }
  }, [searchType, selectedDate]);
  
  const handleSort = (column: SortableColumns) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const displayedSolicitudes = useMemo(() => {
    if (!fetchedSolicitudes) return null;
    let filteredData = [...fetchedSolicitudes];

    // Filtering
    filteredData = filteredData.filter(s => 
      (s.examNe || '').toLowerCase().includes(filterNEInput.toLowerCase()) &&
      s.solicitudId.toLowerCase().includes(filterSolicitudIdInput.toLowerCase()) &&
      (s.savedBy || '').toLowerCase().includes(filterGuardadoPorInput.toLowerCase())
    );

    // Sorting
    if (sortColumn) {
        filteredData.sort((a, b) => {
            let valA: any = null;
            let valB: any = null;

            switch(sortColumn) {
                case 'collaborator':
                    valA = a.memorandumCollaborators?.[0]?.name?.toLowerCase() || 'zzzzzz';
                    valB = b.memorandumCollaborators?.[0]?.name?.toLowerCase() || 'zzzzzz';
                    break;
                case 'date':
                    valA = a.examDate?.getTime() ?? 0;
                    valB = b.examDate?.getTime() ?? 0;
                    break;
                case 'amount':
                    valA = a.monto ?? 0;
                    valB = b.monto ?? 0;
                    break;
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }

    return filteredData;
  }, [fetchedSolicitudes, filterNEInput, filterSolicitudIdInput, filterGuardadoPorInput, sortColumn, sortDirection]);

  const handleViewDetailsInline = (solicitud: SolicitudRecord) => {
    setSolicitudToViewInline(solicitud);
    setIsDetailViewVisible(true);
  };
  
  const handleBackToTable = () => {
    setIsDetailViewVisible(false);
    setSolicitudToViewInline(null);
  };

  const openCommentsDialog = async (solicitudId: string) => {
    setCurrentSolicitudIdForComments(solicitudId);
    setComments([]);
    setIsLoadingComments(true);
    setIsCommentsDialogOpen(true);

    try {
      const commentsCollectionRef = collection(db, "Memorandum", solicitudId, "comments");
      const q = query(commentsCollectionRef, orderBy("createdAt", "asc"));
      const querySnapshot = await getDocs(q);
      const fetchedComments = querySnapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data(),
          createdAt: (docSnap.data().createdAt as FirestoreTimestamp).toDate(),
        }) as CommentRecord);
      setComments(fetchedComments);
    } catch (err) {
      console.error("Error fetching comments: ", err);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handlePostComment = async () => {
    if (!newCommentText.trim() || !currentSolicitudIdForComments || !user?.email) return;
    setIsPostingComment(true);
    try {
      const commentsRef = collection(db, "Memorandum", currentSolicitudIdForComments, "comments");
      await addDoc(commentsRef, {
        text: newCommentText,
        userEmail: user.email,
        createdAt: serverTimestamp(),
        userId: user.uid,
        solicitudId: currentSolicitudIdForComments
      });
      openCommentsDialog(currentSolicitudIdForComments);
      setNewCommentText('');
    } catch (error) {
      toast({title: "Error", description: "No se pudo publicar el comentario.", variant: "destructive"});
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleUpdateRHStatus = useCallback(async (solicitudId: string, status: RHPaymentStatus, details: any) => {
    if (!user || !user.email) {
      toast({ title: "Error", description: "Usuario no autenticado.", variant: "destructive" });
      return;
    }
    const docRef = doc(db, "Memorandum", solicitudId);
    const updates: Record<string, any> = {
      rhPaymentStatus: status,
      rhStatusLastUpdatedAt: serverTimestamp(),
      rhStatusLastUpdatedBy: user.email,
    };
    if (status === 'otros') updates.rhPaymentOtherDetails = details.otherDetails;
    if (status === 'pagado_efectivo' || status === 'otros') updates.rhPaymentDate = details.paymentDate;
    if (status === 'proceso_deduccion') {
      updates.rhPaymentStartDate = details.startDate;
      updates.rhPaymentEndDate = details.endDate;
    }

    try {
      await updateDoc(docRef, updates);
      toast({title: "Éxito", description: "Estado de pago de RH actualizado."});
      setFetchedSolicitudes(prev => prev?.map(s => s.solicitudId === solicitudId ? {...s, ...updates, rhStatusLastUpdatedAt: new Date()} : s) || null);
    } catch (error) {
      toast({ title: "Error", description: "No se pudo actualizar el estado.", variant: "destructive" });
    }

  }, [user, toast]);

  const handleExport = async () => {
    const dataToUse = displayedSolicitudes || [];
    if (dataToUse.length === 0) {
      toast({ title: "Sin Datos", description: "No hay datos para exportar.", variant: "default" });
      return;
    }
    setIsExporting(true);
    toast({ title: "Exportando...", description: "Preparando datos para Excel...", duration: 5000 });

    const headers = [
      "Estado Pago (RH)", "Detalle Otro (RH)", "Fecha Pago (RH)", "Fecha Inicio Pago (RH)", "Fecha Fin Pago (RH)",
      "Colaboradores", "Fecha", "Monto", "Moneda Monto", "Consignatario", "Guardado Por",
      "NE", "ID Solicitud", "Comentarios"
    ];

    const dataToExportPromises = dataToUse.map(async (s) => {
      let commentsString = 'N/A';
      if (s.commentsCount && s.commentsCount > 0) {
        try {
            const commentsColRef = collection(db, "Memorandum", s.solicitudId, "comments");
            const q = query(commentsColRef, orderBy("createdAt", "asc"));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                commentsString = querySnapshot.docs.map(docSnap => {
                    const data = docSnap.data();
                    const createdAt = data.createdAt instanceof FirestoreTimestamp ? data.createdAt.toDate() : new Date();
                    return `${data.userEmail} - ${format(createdAt, "dd/MM/yy HH:mm")}: ${data.text}`;
                }).join("\n");
            }
        } catch (err) {
            commentsString = 'Error al cargar comentarios';
        }
      }

      const rhStatusMap: { [key: string]: string } = {
        'caso_no_iniciado': 'Caso no iniciado',
        'pagado_efectivo': 'Pagado Efectivo',
        'proceso_deduccion': 'En proceso de deducción',
        'otros': 'Otros',
      };
      
      const collaboratorsString = s.memorandumCollaborators?.map(c => `${c.name} (${c.number})`).join('; ') || 'N/A';

      return {
        "Estado Pago (RH)": rhStatusMap[s.rhPaymentStatus || ''] || 'N/A',
        "Detalle Otro (RH)": s.rhPaymentStatus === 'otros' ? s.rhPaymentOtherDetails : 'N/A',
        "Fecha Pago (RH)": s.rhPaymentDate ? format(s.rhPaymentDate, "yyyy-MM-dd") : 'N/A',
        "Fecha Inicio Pago (RH)": s.rhPaymentStartDate ? format(s.rhPaymentStartDate, "yyyy-MM-dd") : 'N/A',
        "Fecha Fin Pago (RH)": s.rhPaymentEndDate ? format(s.rhPaymentEndDate, "yyyy-MM-dd") : 'N/A',
        "Colaboradores": collaboratorsString,
        "Fecha": s.examDate ? format(s.examDate, "yyyy-MM-dd") : 'N/A',
        "Monto": s.monto,
        "Moneda Monto": s.montoMoneda,
        "Consignatario": s.consignatario || 'N/A',
        "Guardado Por": s.savedBy || 'N/A',
        "NE": s.examNe,
        "ID Solicitud": s.solicitudId,
        "Comentarios": commentsString,
      };
    });

    try {
        const dataToExport = await Promise.all(dataToExportPromises);
        downloadExcelFileFromTable(dataToExport, headers, `Reporte_Memorandums_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast({ title: "Exportación Completa", description: "El archivo Excel se ha descargado." });
    } catch (err) {
        toast({ title: "Error de Exportación", description: "No se pudo preparar los datos para exportar.", variant: "destructive" });
    } finally {
        setIsExporting(false);
    }
  };


  if (!isClient || authLoading) {
    return <div className="min-h-screen flex items-center justify-center grid-bg"><Loader2 className="h-12 w-12 animate-spin text-white" /></div>;
  }
  
  if (isDetailViewVisible && solicitudToViewInline) {
    return (
      <AppShell>
        <div className="py-2 md:py-5">
           <Button onClick={handleBackToTable} className="mb-4">
             <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Búsqueda
           </Button>
          <DatabaseSolicitudDetailView id={solicitudToViewInline.solicitudId} onBackToList={handleBackToTable} isInlineView={true} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="py-2 md:py-5">
        <Card className="w-full custom-shadow">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-foreground flex items-center"><Briefcase className="mr-3 h-7 w-7 text-primary"/>Módulo de Recursos Humanos</CardTitle>
            <CardDescription className="text-muted-foreground">Búsqueda y consulta de memorandums.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4 mb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                 <Select value={searchType} onValueChange={(v) => setSearchType(v as SearchType)}>
                  <SelectTrigger className="w-full sm:w-[240px] shrink-0"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dateToday">Por Fecha (Hoy)</SelectItem>
                    <SelectItem value="dateSpecific">Por Fecha (Específica)</SelectItem>
                    <SelectItem value="dateCurrentMonth">Por Mes (Actual)</SelectItem>
                  </SelectContent>
                </Select>
                {searchType === 'dateSpecific' && (
                  <Popover open={isSpecificDatePopoverOpen} onOpenChange={setIsSpecificDatePopoverOpen}>
                    <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{selectedDate ? format(selectedDate, "PPP", { locale: es }) : <span>Seleccione fecha</span>}</Button></PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={selectedDate} onSelect={(d) => {setSelectedDate(d); setIsSpecificDatePopoverOpen(false);}} initialFocus locale={es} /></PopoverContent>
                  </Popover>
                )}
                 <Button type="submit" className="btn-primary" disabled={isLoading}><Search className="mr-2 h-4 w-4" /> {isLoading ? 'Buscando...' : 'Buscar Memorandums'}</Button>
                 <Button type="button" onClick={handleExport} variant="outline" className="w-full sm:w-auto" disabled={!displayedSolicitudes || isLoading || isExporting}>
                    {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    {isExporting ? 'Exportando...' : 'Exportar a Excel'}
                 </Button>
              </div>
            </form>

            {isLoading && <div className="flex justify-center items-center py-6"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
            {error && <div className="text-center text-destructive">{error}</div>}
            {displayedSolicitudes && !isLoading && (
              <SearchResultsTable
                solicitudes={displayedSolicitudes}
                onViewDetails={handleViewDetailsInline}
                onOpenCommentsDialog={openCommentsDialog}
                filterNEInput={filterNEInput}
                setFilterNEInput={setFilterNEInput}
                filterSolicitudIdInput={filterSolicitudIdInput}
                setFilterSolicitudIdInput={setFilterSolicitudIdInput}
                filterGuardadoPorInput={filterGuardadoPorInput}
                setFilterGuardadoPorInput={setFilterGuardadoPorInput}
                onUpdateRHStatus={handleUpdateRHStatus}
                onSort={handleSort}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
              />
            )}
          </CardContent>
        </Card>
      </div>

       <Dialog open={isCommentsDialogOpen} onOpenChange={setIsCommentsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>Comentarios para {currentSolicitudIdForComments}</DialogTitle></DialogHeader>
           <div className="py-4 space-y-4">
              <div className="h-60 overflow-y-auto border p-2 rounded-md bg-muted/20 space-y-2">
                {isLoadingComments ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> :
                comments.length === 0 ? <p>No hay comentarios.</p> :
                comments.map(comment => (
                    <div key={comment.id} className="p-2 my-1 border-b bg-card shadow-sm rounded">
                      <div className="flex justify-between items-center mb-1">
                          <p className="font-semibold text-primary text-xs">{comment.userEmail}</p>
                          <p className="text-muted-foreground text-xs">
                              {format(comment.createdAt, "dd/MM/yyyy HH:mm", { locale: es })}
                          </p>
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{comment.text}</p>
                    </div>
                ))
                }
              </div>
              <div>
                <Label htmlFor="newCommentTextarea" className="text-sm font-medium text-foreground">Nuevo Comentario:</Label>
                <Textarea id="newCommentTextarea" value={newCommentText} onChange={(e) => setNewCommentText(e.target.value)} placeholder="Escriba su comentario aquí..." rows={3} className="mt-1" disabled={isPostingComment} />
              </div>
          </div>
           <DialogFooter>
            <Button variant="outline" onClick={() => setIsCommentsDialogOpen(false)} disabled={isPostingComment}>Salir</Button>
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
