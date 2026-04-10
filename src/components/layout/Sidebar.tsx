import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, ClipboardList, Plus, History, Settings, LogOut,
  Wrench, DollarSign, Users, Building2, FileText, UserPlus, Shield, Menu, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { AppRole } from '@/types/database';
import { useState, useEffect } from 'react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: AppRole[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['imobiliaria', 'tecnico', 'admin'] },
  { label: 'Ordens de Serviço', href: '/ordens', icon: ClipboardList, roles: ['imobiliaria', 'tecnico', 'admin'] },
  { label: 'Novo Chamado', href: '/novo-chamado', icon: Plus, roles: ['imobiliaria', 'admin'] },
  { label: 'Aprovar Orçamentos', href: '/aprovar', icon: DollarSign, roles: ['admin'] },
  { label: 'Meus Serviços', href: '/meus-servicos', icon: Wrench, roles: ['tecnico'] },
  { label: 'Histórico Imóveis', href: '/historico', icon: History, roles: ['imobiliaria', 'admin'] },
  { label: 'Imobiliárias', href: '/imobiliarias', icon: Building2, roles: ['admin'] },
  { label: 'Profissionais', href: '/tecnicos', icon: Users, roles: ['admin'] },
  { label: 'Gerenciar Usuários', href: '/usuarios', icon: UserPlus, roles: ['admin'] },
  { label: 'Relatórios', href: '/relatorios', icon: FileText, roles: ['admin'] },
  { label: 'Relatórios Finais', href: '/relatorios-finais', icon: ClipboardList, roles: ['admin'] },
  { label: 'Log de Auditoria', href: '/auditoria', icon: Shield, roles: ['admin'] },
];

export const Sidebar = () => {
  const location = useLocation();
  const { profile, role, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  if (!profile || !role) return null;

  const filteredItems = navItems.filter(item => item.roles.includes(role));

  const getRoleLabel = (r: AppRole) => {
    switch (r) {
      case 'imobiliaria': return 'Imobiliária';
      case 'tecnico': return 'Profissional';
      case 'admin': return 'Administrador';
    }
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
            <Wrench className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display font-bold text-sidebar-accent-foreground">Vita FAZ TUDO</h1>
            <p className="text-xs text-sidebar-foreground/60">Gestão de Manutenção</p>
          </div>
        </div>
        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 rounded-md text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* User Info */}
      <div className="border-b border-sidebar-border px-6 py-4">
        <p className="text-sm font-medium text-sidebar-accent-foreground truncate">{profile.name}</p>
        <p className="text-xs text-sidebar-foreground/60">{getRoleLabel(role)}</p>
        {profile.company && (
          <p className="mt-1 text-xs text-sidebar-primary truncate">{profile.company}</p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {filteredItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'sidebar-item-active'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3">
        <Link
          to="/configuracoes"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <Settings className="h-5 w-5" />
          Configurações
        </Link>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-destructive/20 hover:text-destructive"
        >
          <LogOut className="h-5 w-5" />
          Sair
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile header bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-sidebar flex items-center px-4 border-b border-sidebar-border">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="flex items-center gap-2 ml-3">
          <Wrench className="h-5 w-5 text-sidebar-primary" />
          <span className="font-display font-bold text-sidebar-accent-foreground">Vita FAZ TUDO</span>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - desktop fixed, mobile slide-in */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-screen w-64 bg-sidebar text-sidebar-foreground transition-transform duration-300 ease-in-out',
          'lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
};
