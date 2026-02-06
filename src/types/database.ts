// Database types for Faz-Tudo Imobiliário

export type AppRole = 'imobiliaria' | 'tecnico' | 'admin';

export type OsStatus = 
  | 'aguardando_orcamento'
  | 'aguardando_aprovacao_admin'
  | 'enviado_imobiliaria'
  | 'aprovado_aguardando'
  | 'em_execucao'
  | 'concluido';

export type UrgencyLevel = 'baixa' | 'media' | 'alta' | 'critica';

export interface Profile {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  company: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Property {
  id: string;
  imobiliaria_id: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceOrder {
  id: string;
  os_number: string;
  property_id: string;
  imobiliaria_id: string;
  tecnico_id: string | null;
  problem: string;
  photos: string[];
  urgency: UrgencyLevel;
  requester_name: string;
  technician_description: string | null;
  technician_cost: number | null;
  estimated_deadline: number | null;
  quote_sent_at: string | null;
  final_price: number | null;
  admin_approved_at: string | null;
  client_approved_at: string | null;
  execution_started_at: string | null;
  completed_at: string | null;
  status: OsStatus;
  created_at: string;
  updated_at: string;
  // Joined data
  property?: Property;
  imobiliaria?: Profile;
  tecnico?: Profile;
}

export interface CompletionReport {
  id: string;
  service_order_id: string;
  description: string;
  checklist: ChecklistItem[];
  photos_before: string[];
  photos_after: string[];
  observations: string | null;
  technician_signature: string;
  completed_at: string;
  created_at: string;
}

export interface ChecklistItem {
  id: string;
  item: string;
  completed: boolean;
}

// Dashboard stats
export interface DashboardStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  thisMonth: number;
  revenue?: number;
}
