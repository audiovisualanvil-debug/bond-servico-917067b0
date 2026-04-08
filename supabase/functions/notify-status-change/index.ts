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

    const { data: order, error: orderError } = await supabase
      .from('service_orders')
      .select(`
        *,
        property:properties!service_orders_property_id_fkey(address),
        imobiliaria:profiles!fk_so_imobiliaria_profile(name, email, company),
        tecnico:profiles!fk_so_tecnico_profile(name, email)
      `)
      .eq('id', serviceOrderId)
      .single();

    if (orderError || !order) {
      console.error('[notify-status-change] Order not found:', orderError);
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

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

    let to: string[] = [];
    let subject = '';
    let body = '';
    const osNumber = escapeHtml(order.os_number || '');
    const propertyAddr = escapeHtml(order.property?.address || 'N/A');

    switch (newStatus) {
      case 'aguardando_orcamento_prestador': {
        if (order.tecnico?.email) {
          to = [order.tecnico.email];
          const tecnicoName = escapeHtml(order.tecnico.name || '');
          const problem = escapeHtml(order.problem || '');
          subject = `Nova OS atribuída - ${osNumber}`;
          body = `Olá ${tecnicoName},<br><br>Uma nova ordem de serviço (<strong>${osNumber}</strong>) foi atribuída a você.<br>Imóvel: ${propertyAddr}<br>Problema: ${problem}<br><br>Acesse a plataforma para enviar seu orçamento.`;
        }
        break;
      }
      case 'aguardando_aprovacao_admin': {
        if (adminEmails.length > 0) {
          to = adminEmails;
          const tecnicoName = escapeHtml(order.tecnico?.name || 'N/A');
          const cost = Number(order.technician_cost || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
          subject = `Orçamento recebido - ${osNumber}`;
          body = `Um orçamento foi enviado para a OS <strong>${osNumber}</strong>.<br>Técnico: ${tecnicoName}<br>Valor do técnico: ${escapeHtml(cost)}<br>Imóvel: ${propertyAddr}<br><br>Acesse a plataforma para revisar e aprovar.`;
        }
        break;
      }
      case 'enviado_imobiliaria': {
        break;
      }
      case 'concluido': {
        if (order.imobiliaria?.email) {
          to = [order.imobiliaria.email];
          const imobName = escapeHtml(order.imobiliaria.company || order.imobiliaria.name || '');
          subject = `Serviço concluído - ${osNumber}`;
          body = `Olá ${imobName},<br><br>O serviço da OS <strong>${osNumber}</strong> foi concluído.<br>Imóvel: ${propertyAddr}<br><br>Acesse a plataforma para ver o relatório de conclusão.`;
        }
        break;
      }
      default:
        break;
    }

    if (to.length === 0) {
      return new Response(JSON.stringify({ success: true, emailSent: false, message: 'No recipients for this status' }), {
        status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const emailHtml = `
<!DOCTYPE html>
<html><head><meta charset="utf-8" /></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#f5f5f5;">
  <div style="max-width:600px;margin:0 auto;background:#fff;">
    <div style="background:linear-gradient(135deg,#1a2332 0%,#1a6b7a 100%);padding:24px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:20px;">${escapeHtml(subject)}</h1>
      <p style="color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:13px;">Faz-Tudo Imobiliário</p>
    </div>
    <div style="padding:24px;">
      <p style="color:#333;font-size:14px;line-height:1.6;">${body}</p>
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
          to,
          subject,
          html: emailHtml,
        }),
      });
      const resData = await res.json();
      console.log(`[notify-status-change] Email result:`, resData);
      return new Response(JSON.stringify({ success: true, emailSent: res.ok }), {
        status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    } catch (emailErr: any) {
      console.error('[notify-status-change] Email send error:', emailErr.message);
      return new Response(JSON.stringify({ success: true, emailSent: false, error: emailErr.message }), {
        status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

  } catch (error: any) {
    console.error('[notify-status-change] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
