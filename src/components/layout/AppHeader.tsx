
"use client";
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { FileText, LogOut, UserCircle, Database, Coins, CheckSquare } from 'lucide-react'; // Added CheckSquare
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";

export function AppHeader() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const isDatabaseAuthorized = user && (user.role === 'revisor' || user.role === 'calificador' || user.role === 'autorevisor' || user.role === 'admin' || user.role === 'autorevisor_plus');
  const isValidacionesAuthorized = user && (user.role === 'revisor' || user.role === 'calificador' || user.role === 'admin'); // autorevisor_plus typically shouldn't access this


  const renderAppIdentity = () => (
    <>
      <FileText className="h-8 w-8 text-primary" />
      <h1 className="text-xl md:text-2xl font-bold text-foreground">CustomsFA-L</h1>
    </>
  );

  const handleDatabaseNavigation = () => {
    if (isDatabaseAuthorized) {
      router.push('/database');
    } else {
      toast({
        title: "Acceso Denegado",
        description: "Usuario no autorizado para acceder a la base de datos.",
        variant: "destructive",
      });
    }
  };
  
  const handleValidacionesNavigation = () => {
    if (isValidacionesAuthorized) {
      router.push('/validaciones');
    } else {
      toast({
        title: "Acceso Denegado",
        description: "Usuario no autorizado para acceder a las validaciones.",
        variant: "destructive",
      });
    }
  };

  return (
    <header className="bg-card shadow-sm sticky top-0 z-40">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-3">
          <div className="flex flex-col items-start">
            {/* El nombre de la aplicación y el icono ya no son un enlace */}
            <div className="flex items-center gap-2">
              {renderAppIdentity()}
            </div>
            {user && !loading && (
              <div className="flex w-full items-center justify-center gap-2 text-sm text-muted-foreground mt-1 md:hidden">
                <UserCircle className="h-5 w-5" />
                <span>{user.email}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3"> {/* Adjusted gap for more buttons */}
            {loading ? (
              <div className="text-sm text-muted-foreground">Cargando...</div>
            ) : user ? (
              <>
                <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                  <UserCircle className="h-5 w-5" />
                  <span>{user.email}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push('/examiner')}
                  className="text-primary hover:bg-blue-500 hover:text-white"
                  aria-label="Ir a Solicitud de Cheque"
                >
                  <FileText className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDatabaseNavigation}
                  className="text-primary hover:bg-green-500 hover:text-white"
                  aria-label="Ir a Base de Datos"
                >
                  <Database className="h-5 w-5" />
                </Button>
                {isValidacionesAuthorized && (
                   <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleValidacionesNavigation}
                      className="text-primary hover:bg-teal-500 hover:text-white"
                      aria-label="Ir a Validaciones de Duplicados"
                    >
                      <CheckSquare className="h-5 w-5" />
                   </Button>
                )}
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className="text-primary hover:bg-purple-600 hover:text-white"
                  aria-label="Abrir SharePoint"
                >
                  <a
                    href="https://aconisani-my.sharepoint.com/:f:/g/personal/asuntos_juridicos_aconic_com_ni/EnOXe6bS-_pNklppJUJ5emoBmT24g9IJw7pBwci93bDUcw?e=ftBiBS"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Coins className="h-5 w-5" />
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={logout}
                  className="text-primary hover:bg-destructive hover:text-destructive-foreground"
                  aria-label="Salir"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </>
            ) : (
               <div className="text-sm text-muted-foreground">No autenticado</div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
