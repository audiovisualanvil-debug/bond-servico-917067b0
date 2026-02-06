import { ServiceOrder, User, DashboardStats, OSStatus, Property } from '@/types/serviceOrder';

// Mock Users
export const mockUsers: User[] = [
  {
    id: 'imob-1',
    name: 'Morada Imóveis',
    email: 'contato@moradaimoveis.com.br',
    role: 'imobiliaria',
    company: 'Morada Imóveis',
    phone: '(11) 99999-1234',
  },
  {
    id: 'imob-2',
    name: 'João Silva',
    email: 'joao@imobiliariasilva.com.br',
    role: 'imobiliaria',
    company: 'Silva Imóveis',
    phone: '(11) 99999-5678',
  },
  {
    id: 'tech-1',
    name: 'Carlos Oliveira',
    email: 'carlos@faztudo.com.br',
    role: 'tecnico',
    phone: '(11) 98888-1234',
  },
  {
    id: 'tech-2',
    name: 'Roberto Lima',
    email: 'roberto@faztudo.com.br',
    role: 'tecnico',
    phone: '(11) 98888-5678',
  },
  {
    id: 'admin-1',
    name: 'Carlos Vita',
    email: 'carlos@faztudo.com.br',
    role: 'admin',
    company: 'Faz-Tudo Imobiliário',
    phone: '(11) 97777-1234',
  },
];

// Mock Properties
export const mockProperties: Property[] = [
  {
    id: 'prop-1',
    address: 'Rua das Flores, 123 - Apto 45',
    neighborhood: 'Jardim Paulista',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01401-000',
    imobiliariaId: 'imob-1',
  },
  {
    id: 'prop-2',
    address: 'Av. Brasil, 456 - Casa',
    neighborhood: 'Moema',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '04543-000',
    imobiliariaId: 'imob-1',
  },
  {
    id: 'prop-3',
    address: 'Rua Augusta, 789 - Sala 12',
    neighborhood: 'Consolação',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01305-100',
    imobiliariaId: 'imob-2',
  },
];

// Mock Service Orders
export const mockServiceOrders: ServiceOrder[] = [
  {
    id: 'os-1',
    osNumber: 'OS-2024-001',
    propertyId: 'prop-1',
    property: mockProperties[0],
    imobiliariaId: 'imob-1',
    imobiliaria: mockUsers[0],
    tecnicoId: 'tech-1',
    tecnico: mockUsers[2],
    problem: 'Tomadas da sala não estão funcionando. Já verifiquei o disjuntor e está ligado.',
    photos: [],
    urgency: 'alta',
    requesterName: 'Ana Paula (Inquilina)',
    createdAt: new Date('2024-01-15T10:30:00'),
    technicianDescription: 'Verificar circuito elétrico da sala. Provavelmente problema no fio ou tomada queimada.',
    technicianCost: 180,
    estimatedDeadline: 2,
    quoteSentAt: new Date('2024-01-15T14:00:00'),
    status: 'aguardando_aprovacao_admin',
  },
  {
    id: 'os-2',
    osNumber: 'OS-2024-002',
    propertyId: 'prop-2',
    property: mockProperties[1],
    imobiliariaId: 'imob-1',
    imobiliaria: mockUsers[0],
    problem: 'Vazamento no banheiro da suíte. Água escorrendo pelo teto do vizinho de baixo.',
    photos: [],
    urgency: 'critica',
    requesterName: 'Carlos Mendes (Proprietário)',
    createdAt: new Date('2024-01-16T08:15:00'),
    status: 'aguardando_orcamento',
  },
  {
    id: 'os-3',
    osNumber: 'OS-2024-003',
    propertyId: 'prop-1',
    property: mockProperties[0],
    imobiliariaId: 'imob-1',
    imobiliaria: mockUsers[0],
    tecnicoId: 'tech-2',
    tecnico: mockUsers[3],
    problem: 'Porta do quarto emperrada, não fecha direito.',
    photos: [],
    urgency: 'baixa',
    requesterName: 'Ana Paula (Inquilina)',
    createdAt: new Date('2024-01-10T11:00:00'),
    technicianDescription: 'Ajustar dobradiças e lixar porta.',
    technicianCost: 120,
    estimatedDeadline: 3,
    quoteSentAt: new Date('2024-01-10T16:00:00'),
    finalPrice: 250,
    adminApprovedAt: new Date('2024-01-11T09:00:00'),
    clientApprovedAt: new Date('2024-01-11T14:00:00'),
    executionStartedAt: new Date('2024-01-12T10:00:00'),
    completionReport: {
      description: 'Porta ajustada com sucesso. Dobradiças trocadas e porta lixada nas bordas.',
      checklist: [
        { id: '1', item: 'Dobradiças verificadas', completed: true },
        { id: '2', item: 'Porta lixada', completed: true },
        { id: '3', item: 'Fechadura testada', completed: true },
        { id: '4', item: 'Área limpa', completed: true },
      ],
      photosBefore: [],
      photosAfter: [],
      observations: 'Recomendo trocar a fechadura em 6 meses, está com desgaste.',
      technicianSignature: 'Roberto Lima',
      completedAt: new Date('2024-01-12T15:30:00'),
    },
    completedAt: new Date('2024-01-12T15:30:00'),
    status: 'concluido',
  },
  {
    id: 'os-4',
    osNumber: 'OS-2024-004',
    propertyId: 'prop-3',
    property: mockProperties[2],
    imobiliariaId: 'imob-2',
    imobiliaria: mockUsers[1],
    tecnicoId: 'tech-1',
    tecnico: mockUsers[2],
    problem: 'Ar condicionado não gela, só ventila.',
    photos: [],
    urgency: 'media',
    requesterName: 'Empresa ABC Ltda',
    createdAt: new Date('2024-01-14T09:00:00'),
    technicianDescription: 'Limpeza do ar condicionado e verificação de gás.',
    technicianCost: 280,
    estimatedDeadline: 1,
    quoteSentAt: new Date('2024-01-14T11:00:00'),
    finalPrice: 450,
    adminApprovedAt: new Date('2024-01-14T14:00:00'),
    status: 'enviado_imobiliaria',
  },
  {
    id: 'os-5',
    osNumber: 'OS-2024-005',
    propertyId: 'prop-2',
    property: mockProperties[1],
    imobiliariaId: 'imob-1',
    imobiliaria: mockUsers[0],
    tecnicoId: 'tech-2',
    tecnico: mockUsers[3],
    problem: 'Pintura descascando na varanda.',
    photos: [],
    urgency: 'baixa',
    requesterName: 'Carlos Mendes (Proprietário)',
    createdAt: new Date('2024-01-13T16:00:00'),
    technicianDescription: 'Raspar pintura antiga, aplicar massa e repintar.',
    technicianCost: 450,
    estimatedDeadline: 4,
    quoteSentAt: new Date('2024-01-13T18:00:00'),
    finalPrice: 780,
    adminApprovedAt: new Date('2024-01-14T08:00:00'),
    clientApprovedAt: new Date('2024-01-14T10:00:00'),
    executionStartedAt: new Date('2024-01-15T08:00:00'),
    status: 'em_execucao',
  },
];

// Dashboard Stats
export const getImobiliariaStats = (imobiliariaId: string): DashboardStats => {
  const orders = mockServiceOrders.filter(os => os.imobiliariaId === imobiliariaId);
  return {
    total: orders.length,
    pending: orders.filter(os => ['aguardando_orcamento', 'aguardando_aprovacao_admin', 'enviado_imobiliaria'].includes(os.status)).length,
    inProgress: orders.filter(os => ['aprovado_aguardando', 'em_execucao'].includes(os.status)).length,
    completed: orders.filter(os => os.status === 'concluido').length,
    thisMonth: orders.filter(os => {
      const now = new Date();
      return os.createdAt.getMonth() === now.getMonth() && os.createdAt.getFullYear() === now.getFullYear();
    }).length,
  };
};

export const getTecnicoStats = (tecnicoId: string): DashboardStats => {
  const orders = mockServiceOrders.filter(os => os.tecnicoId === tecnicoId);
  return {
    total: orders.length,
    pending: orders.filter(os => os.status === 'aguardando_orcamento').length + 
             mockServiceOrders.filter(os => os.status === 'aguardando_orcamento' && !os.tecnicoId).length,
    inProgress: orders.filter(os => ['aprovado_aguardando', 'em_execucao'].includes(os.status)).length,
    completed: orders.filter(os => os.status === 'concluido').length,
    thisMonth: orders.filter(os => {
      const now = new Date();
      return os.createdAt.getMonth() === now.getMonth() && os.createdAt.getFullYear() === now.getFullYear();
    }).length,
  };
};

export const getAdminStats = (): DashboardStats => {
  const completedOrders = mockServiceOrders.filter(os => os.status === 'concluido');
  const revenue = completedOrders.reduce((sum, os) => sum + (os.finalPrice || 0), 0);
  
  return {
    total: mockServiceOrders.length,
    pending: mockServiceOrders.filter(os => os.status === 'aguardando_aprovacao_admin').length,
    inProgress: mockServiceOrders.filter(os => ['aprovado_aguardando', 'em_execucao'].includes(os.status)).length,
    completed: completedOrders.length,
    thisMonth: mockServiceOrders.filter(os => {
      const now = new Date();
      return os.createdAt.getMonth() === now.getMonth() && os.createdAt.getFullYear() === now.getFullYear();
    }).length,
    revenue,
  };
};

// Helper to get orders by status for specific user role
export const getOrdersByRole = (role: string, userId?: string): ServiceOrder[] => {
  switch (role) {
    case 'imobiliaria':
      return mockServiceOrders.filter(os => os.imobiliariaId === userId);
    case 'tecnico':
      // Technician sees their assigned orders + unassigned pending orders
      return mockServiceOrders.filter(os => 
        os.tecnicoId === userId || 
        (os.status === 'aguardando_orcamento' && !os.tecnicoId)
      );
    case 'admin':
      return mockServiceOrders;
    default:
      return [];
  }
};

// Get property history
export const getPropertyHistory = (propertyId: string): ServiceOrder[] => {
  return mockServiceOrders
    .filter(os => os.propertyId === propertyId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
};
