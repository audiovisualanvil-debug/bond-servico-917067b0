import { Database, Mail, Shield, Server, Cloud, HardDrive, Lock, Wifi, BarChart3 } from 'lucide-react';

const blockedTools = [
  { name: 'Database Service', icon: Database, id: 'supabase-db' },
  { name: 'Email Delivery', icon: Mail, id: 'resend-mail' },
  { name: 'Security Policies', icon: Shield, id: 'rls-engine' },
  { name: 'Serverless Functions', icon: Server, id: 'edge-functions' },
  { name: 'Cloud Storage', icon: Cloud, id: 'storage-cdn' },
  { name: 'Authentication', icon: Lock, id: 'auth-service' },
  { name: 'Data Backup', icon: HardDrive, id: 'backup-sys' },
  { name: 'API Gateway', icon: Wifi, id: 'api-gateway' },
  { name: 'Analytics Engine', icon: BarChart3, id: 'analytics' },
];

export const SystemBlockScreen = () => {
  return (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center p-6 selection:bg-white/10">
      <div className="max-w-lg w-full">
        
        {/* Icon */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] flex items-center justify-center border border-[#333]">
              <Lock className="w-7 h-7 text-[#999]" />
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-[28px] font-semibold text-white tracking-tight leading-tight mb-3"
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif' }}>
            Serviço Suspenso
          </h1>
          <p className="text-[#888] text-[15px] leading-relaxed max-w-sm mx-auto"
             style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif' }}>
            O acesso a esta plataforma foi temporariamente suspenso devido a uma pendência financeira.
          </p>
        </div>

        {/* Services grid */}
        <div className="rounded-2xl border border-[#222] bg-[#0a0a0a] overflow-hidden mb-8">
          <div className="px-5 py-3.5 border-b border-[#1a1a1a]">
            <p className="text-[11px] font-medium text-[#666] uppercase tracking-[0.08em]"
               style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}>
              Serviços afetados
            </p>
          </div>
          <div className="divide-y divide-[#151515]">
            {blockedTools.map((tool) => (
              <div key={tool.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#151515] flex items-center justify-center">
                    <tool.icon className="w-4 h-4 text-[#555]" />
                  </div>
                  <span className="text-[14px] text-[#ccc] font-medium"
                        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}>
                    {tool.name}
                  </span>
                </div>
                <span className="text-[11px] font-medium text-[#ff453a] bg-[#ff453a]/10 px-2.5 py-1 rounded-full">
                  Offline
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-2xl border border-[#222] bg-[#0a0a0a] p-6 text-center mb-6">
          <p className="text-white text-[16px] font-semibold mb-1.5"
             style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
            Regularize seu pagamento
          </p>
          <p className="text-[#666] text-[13px] mb-5"
             style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}>
            Entre em contato com o suporte para reativar sua conta.
          </p>
          <div className="inline-flex items-center gap-2 text-[13px] text-[#888] bg-[#151515] border border-[#222] rounded-full px-5 py-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#ff453a] animate-pulse" />
            Aguardando confirmação
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[#333] text-[11px] tracking-wide"
           style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}>
          Faz-Tudo Imobiliário © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};
