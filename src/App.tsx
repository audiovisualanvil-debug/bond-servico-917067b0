// Vita FAZ TUDO - Gestão de Manutenção | publish refresh 2026-05-01 (lockfile cleanup)
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SystemBlockScreen } from "@/components/SystemBlockScreen";

// ⚠️ CONTROLE DE BLOQUEIO - Só alterar via conversa com o desenvolvedor
const SYSTEM_BLOCKED = false;
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import OrdensServico from "./pages/OrdensServico";
import OSDetail from "./pages/OSDetail";
import NovoChamado from "./pages/NovoChamado";
import AprovarOrcamentos from "./pages/AprovarOrcamentos";
import MeusServicos from "./pages/MeusServicos";
import HistoricoImoveis from "./pages/HistoricoImoveis";
import RelatorioOS from "./pages/RelatorioOS";
import OrcamentoPDF from "./pages/OrcamentoPDF";
import Imobiliarias from "./pages/Imobiliarias";
import Tecnicos from "./pages/Tecnicos";
import GerenciarUsuarios from "./pages/GerenciarUsuarios";
import Relatorios from "./pages/Relatorios";
import RelatoriosFinais from "./pages/RelatoriosFinais";
import Configuracoes from "./pages/Configuracoes";
import LogAuditoria from "./pages/LogAuditoria";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import { Loader2 } from "lucide-react";
import { isKnownRole, logUnknownRole } from "@/lib/roles";
import { toast } from "sonner";
import { useEffect } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

// Protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading, role, user, signOut } = useAuth();

  // Verificação de role desconhecido: se o usuário está autenticado, o carregamento
  // terminou, mas o role recebido não está na lista oficial (KNOWN_ROLES), faz signOut
  // e redireciona para a tela de seleção de perfil em vez de quebrar a UI.
  const hasUnknownRole = isAuthenticated && !isLoading && role !== null && !isKnownRole(role);

  useEffect(() => {
    if (hasUnknownRole) {
      logUnknownRole(role, { user_id: user?.id ?? null, page: 'ProtectedRoute' });
      toast.error('Perfil não reconhecido', {
        description: 'Seu perfil não está configurado corretamente. Entre em contato com o suporte.',
      });
      // Encerra a sessão para forçar novo login limpo.
      void signOut();
    }
  }, [hasUnknownRole, role, user?.id, signOut]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Role desconhecido: redireciona para a seleção de perfil enquanto o signOut
  // do useEffect resolve em background.
  if (hasUnknownRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Public route wrapper (redirects to dashboard if already logged in)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading, needsMFA } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // If user needs MFA, show the auth page (which handles the MFA screen)
  if (needsMFA) {
    return <>{children}</>;
  }
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<PublicRoute><AuthPage /></PublicRoute>} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/ordens" element={<ProtectedRoute><OrdensServico /></ProtectedRoute>} />
      <Route path="/ordens/:id" element={<ProtectedRoute><OSDetail /></ProtectedRoute>} />
      <Route path="/ordens/:id/relatorio" element={<ProtectedRoute><RelatorioOS /></ProtectedRoute>} />
      <Route path="/ordens/:id/orcamento" element={<ProtectedRoute><OrcamentoPDF /></ProtectedRoute>} />
      <Route path="/novo-chamado" element={<ProtectedRoute><NovoChamado /></ProtectedRoute>} />
      <Route path="/aprovar" element={<ProtectedRoute><AprovarOrcamentos /></ProtectedRoute>} />
      <Route path="/meus-servicos" element={<ProtectedRoute><MeusServicos /></ProtectedRoute>} />
      <Route path="/historico" element={<ProtectedRoute><HistoricoImoveis /></ProtectedRoute>} />
      <Route path="/imobiliarias" element={<ProtectedRoute><Imobiliarias /></ProtectedRoute>} />
      <Route path="/tecnicos" element={<ProtectedRoute><Tecnicos /></ProtectedRoute>} />
      <Route path="/usuarios" element={<ProtectedRoute><GerenciarUsuarios /></ProtectedRoute>} />
      <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
      <Route path="/relatorios-finais" element={<ProtectedRoute><RelatoriosFinais /></ProtectedRoute>} />
      <Route path="/auditoria" element={<ProtectedRoute><LogAuditoria /></ProtectedRoute>} />
      <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  if (SYSTEM_BLOCKED) {
    return <SystemBlockScreen />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
