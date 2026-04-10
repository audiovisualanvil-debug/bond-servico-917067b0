import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const escapeHtml = (str: string): string =>
  str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const isValidEmail = (email: string | null | undefined): email is string =>
  !!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[send-budget-approved] ❌ Missing Authorization header');
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
      console.error('[send-budget-approved] ❌ Auth failed:', authError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { serviceOrderId } = await req.json();
    console.log(`[send-budget-approved] 📨 Processing for SO: ${serviceOrderId}, user: ${user.id}`);

    if (!serviceOrderId) {
      console.error('[send-budget-approved] ❌ Missing serviceOrderId');
      return new Response(JSON.stringify({ error: 'Missing serviceOrderId' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // ── Check required secrets ──
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) {
      console.warn('[send-budget-approved] ⚠️ RESEND_API_KEY não configurada');
      return new Response(JSON.stringify({
        success: true, emailSent: false,
        message: 'RESEND_API_KEY não configurada. Configure nas secrets do Supabase.',
      }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL');
    if (!fromEmail) {
      console.warn('[send-budget-approved] ⚠️ RESEND_FROM_EMAIL não configurada. Configure com: Faz-Tudo <noreply@seudominio.com.br>');
      return new Response(JSON.stringify({
        success: true, emailSent: false,
        message: 'RESEND_FROM_EMAIL não configurada. Configure nas secrets do Supabase.',
      }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    console.log(`[send-budget-approved] ✅ Secrets OK. Remetente: ${fromEmail}`);

    // ── Fetch order ──
    const { data: order, error: orderError } = await supabase
      .from('service_orders')
      .select(`
        *,
        property:properties!service_orders_property_id_fkey(*),
        imobiliaria:profiles!service_orders_imobiliaria_id_fkey(*),
        tecnico:profiles!service_orders_tecnico_id_fkey(*)
      `)
      .eq('id', serviceOrderId)
      .single();

    if (orderError || !order) {
      console.error('[send-budget-approved] ❌ Order not found:', orderError?.message);
      return new Response(JSON.stringify({ error: 'Service order not found' }), {
        status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const imobiliariaEmail = order.imobiliaria?.email;
    if (!isValidEmail(imobiliariaEmail)) {
      console.warn(`[send-budget-approved] ⚠️ Imobiliária sem email válido: "${imobiliariaEmail}" para OS ${order.os_number}`);
      return new Response(JSON.stringify({
        success: true, emailSent: false,
        message: 'Imobiliária não possui email válido cadastrado.',
      }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    const os_number = escapeHtml(order.os_number || '');
    const property_name = escapeHtml(order.property?.address || 'Endereço não informado');
    const service_description = escapeHtml(order.technician_description || order.problem || 'Serviço não descrito');
    const imobiliariaName = escapeHtml(order.imobiliaria?.company || order.imobiliaria?.name || 'Cliente');
    const finalPrice = Number(order.final_price || 0).toFixed(2);
    const estimatedDeadline = order.estimated_deadline || '—';

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#f5f5f5;">
  <div style="max-width:600px;margin:0 auto;background:#fff;">
    <div style="background:linear-gradient(135deg,#1a2332 0%,#1a6b7a 100%);padding:32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:22px;">ORÇAMENTO APROVADO</h1>
      <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">Faz-Tudo Imobiliário</p>
    </div>
    <div style="padding:32px;">
      <p style="color:#333;font-size:14px;">Olá <strong>${imobiliariaName}</strong>,</p>
      <p style="color:#666;font-size:14px;line-height:1.6;">
        Um orçamento foi aprovado para a ordem de serviço <strong style="color:#1a6b7a;">${os_number}</strong>.
        Confira os detalhes abaixo e aprove para darmos início à execução.
      </p>

      <div style="background:#f8fafc;border-radius:12px;padding:20px;margin:20px 0;">
        <table style="width:100%;font-size:13px;color:#333;" cellpadding="4">
          <tr><td style="color:#888;width:140px;">Ordem de Serviço:</td><td><strong>${os_number}</strong></td></tr>
          <tr><td style="color:#888;">Imóvel:</td><td><strong>${property_name}</strong></td></tr>
          <tr><td style="color:#888;">Prazo estimado:</td><td><strong>${escapeHtml(String(estimatedDeadline))} ${estimatedDeadline === 1 ? 'dia' : 'dias'}</strong></td></tr>
        </table>
      </div>

      <h3 style="font-size:15px;color:#333;margin:24px 0 8px;">Descrição do Serviço</h3>
      <p style="font-size:13px;color:#555;line-height:1.6;">${service_description}</p>

      <div style="background:linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%);border-radius:12px;padding:24px;margin:24px 0;text-align:center;">
        <p style="font-size:12px;color:#888;margin:0 0 4px;">Valor do Serviço</p>
        <p style="font-size:32px;font-weight:800;color:#1a6b7a;margin:0;">R$ ${escapeHtml(finalPrice)}</p>
      </div>

      <div style="text-align:center;margin:32px 0;">
        <p style="font-size:13px;color:#666;margin-bottom:16px;">
          Acesse a plataforma para aprovar ou solicitar revisão deste orçamento.
        </p>
      </div>

      <div style="text-align:center;border-top:1px solid #e2e8f0;padding-top:20px;margin-top:24px;">
        <p style="font-size:11px;color:#aaa;">
          Faz-Tudo Imobiliário — Notificação automática<br />
          ${os_number}
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

    const subject = `Orçamento Aprovado - ${os_number}`;

    console.log(`[send-budget-approved] 📤 Enviando para: ${imobiliariaEmail} | Assunto: ${subject}`);

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [imobiliariaEmail],
        subject,
        html: emailHtml,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error(`[send-budget-approved] ❌ Resend rejeitou: ${JSON.stringify(resendData)}`);
      return new Response(JSON.stringify({
        success: true, emailSent: false,
        message: 'Orçamento aprovado, mas houve erro ao enviar o e-mail.',
        emailError: resendData,
      }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    console.log(`[send-budget-approved] ✅ Email enviado para ${imobiliariaEmail} | ID: ${resendData.id} | OS: ${os_number}`);

    return new Response(JSON.stringify({
      success: true, emailSent: true,
      message: 'Orçamento aprovado e e-mail enviado com sucesso!',
    }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } });

  } catch (error: any) {
    console.error('[send-budget-approved] ❌ Erro fatal:', error.message, error.stack);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
