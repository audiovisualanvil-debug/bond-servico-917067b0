import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const escapeHtml = (str: string): string =>
  str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const escapeAttr = (str: string): string =>
  str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const isValidEmail = (email: string | null | undefined): email is string =>
  !!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

interface RequestBody {
  serviceOrderId: string;
  reportUrl: string;
  sendTo?: ('imobiliaria' | 'tecnico' | 'proprietario')[];
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[send-completion-report] ❌ Missing Authorization header');
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
      console.error('[send-completion-report] ❌ Auth failed:', authError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { serviceOrderId, reportUrl, sendTo }: RequestBody = await req.json();
    console.log(`[send-completion-report] 📨 SO: ${serviceOrderId}, sendTo: ${JSON.stringify(sendTo)}, user: ${user.id}`);

    if (!serviceOrderId) {
      console.error('[send-completion-report] ❌ Missing serviceOrderId');
      return new Response(JSON.stringify({ error: 'Missing serviceOrderId' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // ── Check required secrets ──
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) {
      console.warn('[send-completion-report] ⚠️ RESEND_API_KEY não configurada');
      return new Response(JSON.stringify({
        success: true, emailSent: false,
        message: 'RESEND_API_KEY não configurada. Configure nas secrets do Supabase.',
      }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL');
    if (!fromEmail) {
      console.warn('[send-completion-report] ⚠️ RESEND_FROM_EMAIL não configurada. Configure com: Faz-Tudo <noreply@seudominio.com.br>');
      return new Response(JSON.stringify({
        success: true, emailSent: false,
        message: 'RESEND_FROM_EMAIL não configurada. Configure nas secrets do Supabase.',
      }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    console.log(`[send-completion-report] ✅ Secrets OK. Remetente: ${fromEmail}`);

    // ── Fetch order + report ──
    const { data: order, error: orderError } = await supabase
      .from('service_orders')
      .select(`
        *,
        property:properties!service_orders_property_id_fkey(*),
        imobiliaria:profiles!service_orders_imobiliaria_id_fkey(*),
        tecnico:profiles!service_orders_tecnico_id_fkey(*),
        completion_report:completion_reports(*)
      `)
      .eq('id', serviceOrderId)
      .single();

    if (orderError || !order) {
      console.error('[send-completion-report] ❌ Order not found:', orderError?.message);
      return new Response(JSON.stringify({ error: 'Service order not found' }), {
        status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const report = Array.isArray(order.completion_report) && order.completion_report.length > 0
      ? order.completion_report[0] : null;

    if (!report) {
      console.error(`[send-completion-report] ❌ Relatório de conclusão não encontrado para OS ${order.os_number}`);
      return new Response(JSON.stringify({ error: 'Completion report not found' }), {
        status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // ── Build recipients ──
    const recipients = sendTo || ['imobiliaria'];
    const emailTargets: { email: string; name: string; type: string }[] = [];

    for (const target of recipients) {
      if (target === 'imobiliaria' && isValidEmail(order.imobiliaria?.email)) {
        emailTargets.push({ email: order.imobiliaria.email, name: order.imobiliaria.company || order.imobiliaria.name || 'Imobiliária', type: 'imobiliaria' });
      } else if (target === 'imobiliaria') {
        console.warn(`[send-completion-report] ⚠️ Imobiliária sem email válido: "${order.imobiliaria?.email}"`);
      }
      if (target === 'tecnico' && isValidEmail(order.tecnico?.email)) {
        emailTargets.push({ email: order.tecnico.email, name: order.tecnico.name || 'Técnico', type: 'tecnico' });
      } else if (target === 'tecnico') {
        console.warn(`[send-completion-report] ⚠️ Técnico sem email válido: "${order.tecnico?.email}"`);
      }
      if (target === 'proprietario' && isValidEmail(order.property?.owner_email)) {
        emailTargets.push({ email: order.property.owner_email, name: order.property.owner_name || 'Proprietário', type: 'proprietario' });
      } else if (target === 'proprietario') {
        console.warn(`[send-completion-report] ⚠️ Proprietário sem email válido: "${order.property?.owner_email}"`);
      }
    }

    if (emailTargets.length === 0) {
      console.warn(`[send-completion-report] ⚠️ Nenhum destinatário válido encontrado para OS ${order.os_number}`);
      return new Response(JSON.stringify({
        success: true, emailSent: false,
        message: 'Nenhum destinatário com e-mail válido encontrado.',
      }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    // ── Build email HTML ──
    const propertyAddress = escapeHtml(order.property?.address || 'Endereço não informado');
    const tecnicoName = escapeHtml(order.tecnico?.name || 'Técnico');
    const completedDate = new Date(report.completed_at).toLocaleDateString('pt-BR');
    const osNumber = escapeHtml(order.os_number || '');
    const reportDescription = escapeHtml(report.description || '');
    const reportObservations = report.observations ? escapeHtml(report.observations) : '';

    const checklist = Array.isArray(report.checklist) ? report.checklist : [];
    const checklistHtml = checklist
      .map((item: any) => `<li style="padding:4px 0;">${item.completed ? '✅' : '⬜'} ${escapeHtml(String(item.item || ''))}</li>`)
      .join('');

    const photosBeforeHtml = (report.photos_before || [])
      .map((url: string) => `<img src="${escapeAttr(url)}" alt="Antes" style="width:180px;height:135px;object-fit:cover;border-radius:8px;border:1px solid #e2e8f0;" />`)
      .join('');

    const photosAfterHtml = (report.photos_after || [])
      .map((url: string) => `<img src="${escapeAttr(url)}" alt="Depois" style="width:180px;height:135px;object-fit:cover;border-radius:8px;border:1px solid #e2e8f0;" />`)
      .join('');

    const safeReportUrl = reportUrl ? escapeAttr(reportUrl) : '';

    const buildEmailHtml = (recipientName: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#f5f5f5;">
  <div style="max-width:600px;margin:0 auto;background:#fff;">
    <div style="background:linear-gradient(135deg,#1a2332 0%,#1a6b7a 100%);padding:32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:22px;">RELATÓRIO DE SERVIÇO</h1>
      <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">Faz-Tudo Imobiliário</p>
    </div>
    <div style="padding:32px;">
      <p style="color:#333;font-size:14px;">Olá <strong>${escapeHtml(recipientName)}</strong>,</p>
      <p style="color:#666;font-size:14px;line-height:1.6;">
        O serviço referente à ordem <strong style="color:#1a6b7a;">${osNumber}</strong> foi concluído com sucesso.
        Segue o resumo do relatório de execução.
      </p>
      <div style="background:#f8fafc;border-radius:12px;padding:20px;margin:20px 0;">
        <table style="width:100%;font-size:13px;color:#333;" cellpadding="4">
          <tr><td style="color:#888;">Imóvel:</td><td><strong>${propertyAddress}</strong></td></tr>
          <tr><td style="color:#888;">Técnico:</td><td><strong>${tecnicoName}</strong></td></tr>
          <tr><td style="color:#888;">Concluído em:</td><td><strong>${escapeHtml(completedDate)}</strong></td></tr>
          ${order.final_price ? `<tr><td style="color:#888;">Valor:</td><td><strong style="color:#1a6b7a;">R$ ${escapeHtml(Number(order.final_price).toFixed(2))}</strong></td></tr>` : ''}
        </table>
      </div>
      <h3 style="font-size:15px;color:#333;margin:24px 0 8px;">Serviço Executado</h3>
      <p style="font-size:13px;color:#555;line-height:1.6;">${reportDescription}</p>
      ${checklist.length > 0 ? `
        <h3 style="font-size:15px;color:#333;margin:24px 0 8px;">Checklist</h3>
        <ul style="list-style:none;padding:0;font-size:13px;color:#555;">${checklistHtml}</ul>
      ` : ''}
      ${photosBeforeHtml || photosAfterHtml ? `
        <h3 style="font-size:15px;color:#333;margin:24px 0 8px;">Registro Fotográfico</h3>
        ${photosBeforeHtml ? `<p style="font-size:12px;color:#888;margin:8px 0 4px;">Antes:</p><div style="display:flex;gap:8px;flex-wrap:wrap;">${photosBeforeHtml}</div>` : ''}
        ${photosAfterHtml ? `<p style="font-size:12px;color:#888;margin:8px 0 4px;">Depois:</p><div style="display:flex;gap:8px;flex-wrap:wrap;">${photosAfterHtml}</div>` : ''}
      ` : ''}
      ${reportObservations ? `
        <h3 style="font-size:15px;color:#333;margin:24px 0 8px;">Observações</h3>
        <p style="font-size:13px;color:#555;line-height:1.6;">${reportObservations}</p>
      ` : ''}
      ${safeReportUrl ? `
        <div style="text-align:center;margin:32px 0;">
          <a href="${safeReportUrl}" style="background:#1a6b7a;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;display:inline-block;">
            Ver Relatório Completo
          </a>
        </div>
      ` : ''}
      <div style="text-align:center;border-top:1px solid #e2e8f0;padding-top:20px;margin-top:24px;">
        <p style="font-size:11px;color:#aaa;">
          Faz-Tudo Imobiliário — Relatório gerado automaticamente<br />
          ${osNumber} • ${escapeHtml(completedDate)}
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

    // ── Send emails ──
    const results: { target: string; email: string; sent: boolean; error?: string }[] = [];

    for (const target of emailTargets) {
      try {
        console.log(`[send-completion-report] 📤 Enviando relatório para ${target.type} (${target.email}) | OS: ${osNumber}`);
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [target.email],
            subject: `Relatório de Serviço - ${order.os_number} - Concluído`,
            html: buildEmailHtml(target.name),
          }),
        });

        const resendData = await resendResponse.json();
        if (resendResponse.ok) {
          console.log(`[send-completion-report] ✅ Email enviado para ${target.type} (${target.email}) | ID: ${resendData.id}`);
          results.push({ target: target.type, email: target.email, sent: true });
        } else {
          console.error(`[send-completion-report] ❌ Resend rejeitou envio para ${target.type} (${target.email}):`, JSON.stringify(resendData));
          results.push({ target: target.type, email: target.email, sent: false, error: resendData.message || JSON.stringify(resendData) });
        }
      } catch (e: any) {
        console.error(`[send-completion-report] ❌ Erro de rede ao enviar para ${target.type} (${target.email}):`, e.message);
        results.push({ target: target.type, email: target.email, sent: false, error: e.message });
      }
    }

    const allSent = results.every(r => r.sent);
    const someSent = results.some(r => r.sent);
    console.log(`[send-completion-report] 📊 Resultado: ${results.filter(r => r.sent).length}/${results.length} emails enviados para OS ${osNumber}`);

    return new Response(JSON.stringify({
      success: true,
      emailSent: someSent,
      results,
      message: allSent
        ? 'Relatório enviado com sucesso para todos os destinatários!'
        : someSent
          ? 'Relatório enviado parcialmente. Verifique os detalhes.'
          : 'Erro ao enviar e-mails. Verifique os logs e configuração.',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('[send-completion-report] ❌ Erro fatal:', error.message, error.stack);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
