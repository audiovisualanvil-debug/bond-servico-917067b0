import { AlertTriangle, Database, Mail, Shield, Server, Cloud, HardDrive, Lock, Wifi, BarChart3 } from 'lucide-react';

const blockedTools = [
  { name: 'Banco de Dados Supabase', icon: Database, description: 'Armazenamento e consultas de dados' },
  { name: 'Serviço de E-mail (Resend)', icon: Mail, description: 'Envio de notificações e relatórios' },
  { name: 'Ferramenta de Segurança (RLS)', icon: Shield, description: 'Políticas de segurança e acesso' },
  { name: 'Edge Functions', icon: Server, description: 'Funções serverless e automações' },
  { name: 'Storage Cloud', icon: Cloud, description: 'Armazenamento de fotos e arquivos' },
  { name: 'Autenticação de Usuários', icon: Lock, description: 'Login, cadastro e sessões' },
  { name: 'Backup de Dados', icon: HardDrive, description: 'Cópias de segurança automáticas' },
  { name: 'API Gateway', icon: Wifi, description: 'Comunicação entre serviços' },
  { name: 'Painel de Relatórios', icon: BarChart3, description: 'Análises e dashboards' },
];

export const SystemBlockScreen = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-950 via-gray-950 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500 mb-4 animate-pulse">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">⚠️ Sistema Suspenso</h1>
          <p className="text-red-400 text-lg font-semibold">FALTA DE PAGAMENTO DETECTADA</p>
          <p className="text-gray-400 mt-2 text-sm">
            O acesso ao sistema foi bloqueado devido à inadimplência. Todos os serviços abaixo estão paralisados.
          </p>
        </div>

        {/* Blocked tools list */}
        <div className="bg-gray-900/80 border border-red-500/30 rounded-xl p-6 mb-6">
          <h2 className="text-white font-semibold mb-4 text-center text-sm uppercase tracking-wider">
            Ferramentas Paralisadas
          </h2>
          <div className="space-y-3">
            {blockedTools.map((tool, index) => (
              <div
                key={index}
                className="flex items-center gap-3 bg-red-950/40 border border-red-500/20 rounded-lg px-4 py-3"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                  <tool.icon className="w-4 h-4 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">{tool.name}</p>
                  <p className="text-gray-500 text-xs">{tool.description}</p>
                </div>
                <span className="flex-shrink-0 text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded font-medium">
                  PARADO
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment CTA */}
        <div className="bg-gray-900/80 border border-yellow-500/30 rounded-xl p-6 text-center">
          <p className="text-yellow-400 font-semibold text-lg mb-2">💳 Realize seu Pagamento</p>
          <p className="text-gray-400 text-sm mb-4">
            Para reativar todos os serviços, entre em contato com o suporte e regularize sua situação financeira.
          </p>
          <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-2">
            <Lock className="w-4 h-4 text-yellow-500" />
            <span className="text-yellow-400 text-sm font-medium">
              Aguardando confirmação de pagamento
            </span>
          </div>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          Faz-Tudo Imobiliário © {new Date().getFullYear()} — Sistema de gestão de ordens de serviço
        </p>
      </div>
    </div>
  );
};
