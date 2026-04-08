import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  useRealtimeNotifications();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="lg:pl-64 pt-14 lg:pt-0">
        <div className="container py-6 lg:py-8 px-4 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
};
