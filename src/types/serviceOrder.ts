// Service Order Types for Faz-Tudo Imobiliário

export type UserRole = 'imobiliaria' | 'tecnico' | 'admin';

export type OSStatus = 
  | 'aguardando_orcamento_prestador' // Waiting for technician quote
  | 'aguardando_aprovacao_admin'     // Waiting for admin approval
  | 'enviado_imobiliaria'       // Sent to real estate agency
  | 'aprovado_aguardando'       // Approved, waiting for execution
  | 'em_execucao'               // In progress
  | 'concluido';                // Completed

export type UrgencyLevel = 'baixa' | 'media' | 'alta' | 'critica';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  company?: string;
  phone?: string;
  avatar?: string;
}

export interface Property {
  id: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  imobiliariaId: string;
  code?: string;
  tenantName?: string;
  tenantPhone?: string;
  ownerName?: string;
  ownerPhone?: string;
}

export interface ServiceOrder {
  id: string;
  osNumber: string;
  propertyId: string;
  property: Property;
  imobiliariaId: string;
  imobiliaria: User;
  tecnicoId?: string;
  tecnico?: User;
  
  // Request details
  problem: string;
  photos: string[];
  urgency: UrgencyLevel;
  requesterName: string;
  createdAt: Date;
  
  // Technician quote (itemized)
  technicianDescription?: string;
  laborCost?: number;
  materialCost?: number;
  taxCost?: number;
  technicianCost?: number;
  estimatedDeadline?: number; // days
  quoteSentAt?: Date;
  
  // Admin pricing
  finalPrice?: number;
  adminApprovedAt?: Date;
  
  // Client approval
  clientApprovedAt?: Date;
  
  // Execution
  executionStartedAt?: Date;
  
  // Completion
  completionReport?: CompletionReport;
  completedAt?: Date;
  
  status: OSStatus;
}

export interface CompletionReport {
  description: string;
  checklist: ChecklistItem[];
  photosBefore: string[];
  photosAfter: string[];
  observations?: string;
  technicianSignature: string;
  completedAt: Date;
}

export interface ChecklistItem {
  id: string;
  item: string;
  completed: boolean;
}

export interface DashboardStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  thisMonth: number;
  revenue?: number;
}

// Status display helpers
export const STATUS_LABELS: Record<OSStatus, string> = {
  aguardando_orcamento_prestador: 'Aguardando Orçamento Prestador',
  aguardando_aprovacao_admin: 'Aguardando Aprovação Admin',
  enviado_imobiliaria: 'Enviado para Imobiliária',
  aprovado_aguardando: 'Aprovado - Aguardando Execução',
  em_execucao: 'Em Execução',
  concluido: 'Concluído',
};

export const STATUS_COLORS: Record<OSStatus, string> = {
  aguardando_orcamento_prestador: 'status-pending',
  aguardando_aprovacao_admin: 'status-waiting',
  enviado_imobiliaria: 'status-in-progress',
  aprovado_aguardando: 'status-approved',
  em_execucao: 'status-in-progress',
  concluido: 'status-completed',
};

export const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  critica: 'Crítica',
};

export const URGENCY_COLORS: Record<UrgencyLevel, string> = {
  baixa: 'urgency-low',
  media: 'urgency-medium',
  alta: 'urgency-high',
  critica: 'urgency-critical',
};
