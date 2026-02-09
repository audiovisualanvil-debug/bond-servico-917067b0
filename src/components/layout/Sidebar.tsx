import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Plus, 
  History, 
  Settings, 
  LogOut,
  Wrench,
  DollarSign,
  Users,
  Building2,
  FileText,
  UserPlus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { AppRole } from '@/types/database';

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
  { label: 'Técnicos', href: '/tecnicos', icon: Users, roles: ['admin'] },
  { label: 'Gerenciar Usuários', href: '/usuarios', icon: UserPlus, roles: ['admin'] },
  { label: 'Relatórios', href: '/relatorios', icon: FileText, roles: ['admin'] },
];

export const Sidebar = () => {
  const location = useLocation();
  const { profile, role, signOut } = useAuth();

  if (!profile || !role) return null;

  const filteredItems = navItems.filter(item => item.roles.includes(role));

  const getRoleLabel = (r: AppRole) => {
    switch (r) {
      case 'imobiliaria': return 'Imobiliária';
      case 'tecnico': return 'Técnico';
      case 'admin': return 'Administrador';
    }
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar text-sidebar-foreground">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
            <Wrench className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display font-bold text-sidebar-accent-foreground">Faz-Tudo</h1>
            <p className="text-xs text-sidebar-foreground/60">Imobiliário</p>
          </div>
        </div>

        {/* User Info */}
        <div className="border-b border-sidebar-border px-6 py-4">
          <p className="text-sm font-medium text-sidebar-accent-foreground">{profile.name}</p>
          <p className="text-xs text-sidebar-foreground/60">{getRoleLabel(role)}</p>
          {profile.company && (
            <p className="mt-1 text-xs text-sidebar-primary">{profile.company}</p>
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
    </aside>
  );
};
