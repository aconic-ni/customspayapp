
"use client";
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { FileText, LogOut, UserCircle, Database, Coins } from 'lucide-react'; // Changed Share2 to Coins
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";

export function AppHeader() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const isDatabaseAuthorized = user && (user.role === 'revisor' || user.role === 'calificador' || user.role === 'autorevisor');

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

  return (
    <header className="bg-card shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3 max-w-7xl">
        <div className="flex justify-between items-center">
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

          <div className="flex items-center gap-2 sm:gap-4">
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
