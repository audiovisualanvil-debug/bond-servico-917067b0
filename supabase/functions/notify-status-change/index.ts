import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const escapeHtml = (str: string): string =>
  str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

interface RequestBody {
  serviceOrderId: string;
  newStatus: string;
  previousStatus?: string;
}

const STATUS_LABELS: Record<string, string> = {
  aguardando_orcamento_prestador: 'Aguardando Orçamento do Prestador',
  aguardando_aprovacao_admin: 'Aguardando Aprovação do Admin',
  enviado_imobiliaria: 'Orçamento Enviado à Imobiliária',
  aprovado_aguardando: 'Aprovado — Aguardando Execução',
  em_execucao: 'Em Execução',
  concluido: 'Concluído',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { serviceOrderId, newStatus }: RequestBody = await req.json();
    console.log(`[notify-status-change] SO: ${serviceOrderId}, status: ${newStatus}`);

    if (!serviceOrderId || !newStatus) {
      return new Response(JSON.stringify({ error: 'Missing params' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) {
      console.log('[notify-status-change] RESEND_API_KEY not configured — skipping');
      return new Response(JSON.stringify({ success: true, emailSent: false, message: 'No RESEND_API_KEY' }), {
        status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Use correct FK constraint names
    const { data: order, error: orderError } = await supabase
      .from('service_orders')
      .select(`
        *,
        property:properties!service_orders_property_id_fkey(address),
        imobiliaria:profiles!service_orders_imobiliaria_id_fkey(name, email, company),
        tecnico:profiles!service_orders_tecnico_id_fkey(name, email)
      `)
      .eq('id', serviceOrderId)
      .single();

    if (orderError || !order) {
      console.error('[notify-status-change] Order not found:', orderError);
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Fetch admin emails
    const { data: adminRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    let adminEmails: string[] = [];
    if (adminRoles && adminRoles.length > 0) {
      const adminIds = adminRoles.map((r: any) => r.user_id);
      const { data: adminProfiles } = await supabase
        .from('profiles')
        .select('email')
        .in('id', adminIds);
      adminEmails = (adminProfiles || []).map((p: any) => p.email).filter(Boolean);
    }

    const osNumber = escapeHtml(order.os_number || '');
    const propertyAddr = escapeHtml(order.property?.address || 'N/A');
    const statusLabel = STATUS_LABELS[newStatus] || newStatus;

    interface EmailTarget {
      to: string[];
      subject: string;
      body: string;
    }

    const emails: EmailTarget[] = [];

    switch (newStatus) {
      case 'aguardando_orcamento_prestador': {
        // Notify technician: new OS assigned
        if (order.tecnico?.email) {
          const tecnicoName = escapeHtml(order.tecnico.name || '');
          const problem = escapeHtml(order.problem || '');
          emails.push({
            to: [order.tecnico.email],
            subject: `Nova OS atribuída - ${osNumber}`,
            body: `Olá ${tecnicoName},<br><br>Uma nova ordem de serviço (<strong>${osNumber}</strong>) foi atribuída a você.<br>Imóvel: ${propertyAddr}<br>Problema: ${problem}<br><br>Acesse a plataforma para enviar seu orçamento.`,
          });
        }
        break;
      }

      case 'aguardando_aprovacao_admin': {
        // Notify admin: quote received from technician
        if (adminEmails.length > 0) {
          const tecnicoName = escapeHtml(order.tecnico?.name || 'N/A');
          const cost = Number(order.technician_cost || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
          emails.push({
            to: adminEmails,
            subject: `Orçamento recebido - ${osNumber}`,
            body: `Um orçamento foi enviado para a OS <strong>${osNumber}</strong>.<br>Técnico: ${tecnicoName}<br>Valor do técnico: ${escapeHtml(cost)}<br>Imóvel: ${propertyAddr}<br><br>Acesse a plataforma para revisar e aprovar.`,
          });
        }
        break;
      }

      case 'enviado_imobiliaria': {
        // Notify imobiliaria: quote ready for approval
        if (order.imobiliaria?.email) {
          const imobName = escapeHtml(order.imobiliaria.company || order.imobiliaria.name || '');
          const price = Number(order.final_price || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
          emails.push({
            to: [order.imobiliaria.email],
            subject: `Orçamento disponível para aprovação - ${osNumber}`,
            body: `Olá ${imobName},<br><br>O orçamento da OS <strong>${osNumber}</strong> está pronto para sua aprovação.<br>Imóvel: ${propertyAddr}<br>Valor: <strong>${escapeHtml(price)}</strong><br><br>Acesse a plataforma para aprovar ou solicitar revisão.`,
          });
        }
        break;
      }

      case 'aprovado_aguardando': {
        // Notify technician + admin: client approved, ready for execution
        if (order.tecnico?.email) {
          const tecnicoName = escapeHtml(order.tecnico.name || '');
          emails.push({
            to: [order.tecnico.email],
            subject: `Serviço aprovado — Aguardando execução - ${osNumber}`,
            body: `Olá ${tecnicoName},<br><br>A imobiliária aprovou o serviço da OS <strong>${osNumber}</strong>.<br>Imóvel: ${propertyAddr}<br><br>Acesse a plataforma para iniciar a execução.`,
          });
        }
        if (adminEmails.length > 0) {
          emails.push({
            to: adminEmails,
            subject: `OS aprovada pela imobiliária - ${osNumber}`,
            body: `A imobiliária aprovou a OS <strong>${osNumber}</strong>.<br>Imóvel: ${propertyAddr}<br>O serviço está aguardando início da execução pelo técnico.`,
          });
        }
        break;
      }

      case 'em_execucao': {
        // Notify imobiliaria + admin: execution started
        if (order.imobiliaria?.email) {
          const imobName = escapeHtml(order.imobiliaria.company || order.imobiliaria.name || '');
          const tecnicoName = escapeHtml(order.tecnico?.name || 'N/A');
          emails.push({
            to: [order.imobiliaria.email],
            subject: `Execução iniciada - ${osNumber}`,
            body: `Olá ${imobName},<br><br>O técnico <strong>${tecnicoName}</strong> iniciou a execução da OS <strong>${osNumber}</strong>.<br>Imóvel: ${propertyAddr}<br><br>Você será notificado quando o serviço for concluído.`,
          });
        }
        if (adminEmails.length > 0) {
          emails.push({
            to: adminEmails,
            subject: `Execução iniciada - ${osNumber}`,
            body: `O técnico ${escapeHtml(order.tecnico?.name || 'N/A')} iniciou a execução da OS <strong>${osNumber}</strong>.<br>Imóvel: ${propertyAddr}`,
          });
        }
        break;
      }

      case 'concluido': {
        // Notify imobiliaria: service completed
        if (order.imobiliaria?.email) {
          const imobName = escapeHtml(order.imobiliaria.company || order.imobiliaria.name || '');
          emails.push({
            to: [order.imobiliaria.email],
            subject: `Serviço concluído - ${osNumber}`,
            body: `Olá ${imobName},<br><br>O serviço da OS <strong>${osNumber}</strong> foi concluído.<br>Imóvel: ${propertyAddr}<br><br>Acesse a plataforma para ver o relatório de conclusão.`,
          });
        }
        break;
      }

      default:
        break;
    }

    if (emails.length === 0) {
      return new Response(JSON.stringify({ success: true, emailSent: false, message: 'No recipients for this status' }), {
        status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const results: { to: string[]; sent: boolean; error?: any }[] = [];

    for (const email of emails) {
      const emailHtml = `
<!DOCTYPE html>
<html><head><meta charset="utf-8" /></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#f5f5f5;">
  <div style="max-width:600px;margin:0 auto;background:#fff;">
    <div style="background:linear-gradient(135deg,#1a2332 0%,#1a6b7a 100%);padding:24px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:20px;">${email.subject}</h1>
      <p style="color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:13px;">Faz-Tudo Imobiliário</p>
    </div>
    <div style="padding:24px;">
      <p style="color:#333;font-size:14px;line-height:1.6;">${email.body}</p>
      <div style="background:#f0fdf4;border-radius:8px;padding:12px 16px;margin:16px 0;">
        <p style="margin:0;font-size:13px;color:#166534;">
          <strong>Status atual:</strong> ${escapeHtml(statusLabel)}
        </p>
      </div>
      <div style="text-align:center;border-top:1px solid #e2e8f0;padding-top:16px;margin-top:20px;">
        <p style="font-size:11px;color:#aaa;">Notificação automática — ${osNumber}</p>
      </div>
    </div>
  </div>
</body></html>`;

      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Faz-Tudo <noreply@resend.dev>',
            to: email.to,
            subject: email.subject,
            html: emailHtml,
          }),
        });
        const resData = await res.json();
        console.log(`[notify-status-change] Email to ${email.to.join(',')} result:`, resData);
        results.push({ to: email.to, sent: res.ok });
      } catch (emailErr: any) {
        console.error('[notify-status-change] Email send error:', emailErr.message);
        results.push({ to: email.to, sent: false, error: emailErr.message });
      }
    }

    return new Response(JSON.stringify({ success: true, emailSent: results.some(r => r.sent), results }), {
      status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('[notify-status-change] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
