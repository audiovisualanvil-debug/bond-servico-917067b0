import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface RequestBody {
  serviceOrderId: string;
  reportUrl: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the JWT
    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')!);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { serviceOrderId, reportUrl }: RequestBody = await req.json();
    console.log(`Processing completion report email for SO: ${serviceOrderId}`);

    if (!serviceOrderId) {
      return new Response(JSON.stringify({ error: 'Missing serviceOrderId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Fetch service order with related data using service role (bypass RLS)
    const { data: order, error: orderError } = await supabase
      .from('service_orders')
      .select(`
        *,
        property:properties!service_orders_property_id_fkey(*),
        imobiliaria:profiles!fk_so_imobiliaria_profile(*),
        tecnico:profiles!fk_so_tecnico_profile(*),
        completion_report:completion_reports(*)
      `)
      .eq('id', serviceOrderId)
      .single();

    if (orderError || !order) {
      console.error('Order fetch error:', orderError);
      return new Response(JSON.stringify({ error: 'Service order not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const report = Array.isArray(order.completion_report) && order.completion_report.length > 0
      ? order.completion_report[0]
      : null;

    if (!report) {
      return new Response(JSON.stringify({ error: 'Completion report not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const imobiliariaEmail = order.imobiliaria?.email;
    const imobiliariaName = order.imobiliaria?.company || order.imobiliaria?.name || 'Cliente';
    const propertyAddress = order.property?.address || 'Endereço não informado';
    const tecnicoName = order.tecnico?.name || 'Técnico';
    const completedDate = new Date(report.completed_at).toLocaleDateString('pt-BR');

    // Check if RESEND_API_KEY is available
    const resendKey = Deno.env.get('RESEND_API_KEY');

    if (!resendKey) {
      console.log('RESEND_API_KEY not configured — skipping email send');
      console.log('Report generated successfully for:', order.os_number);
      return new Response(JSON.stringify({ 
        success: true, 
        emailSent: false,
        message: 'Relatório salvo. E-mail não enviado (RESEND_API_KEY não configurada).',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Build email HTML
    const checklist = Array.isArray(report.checklist) ? report.checklist : [];
    const checklistHtml = checklist
      .map((item: any) => `<li style="padding:4px 0;">${item.completed ? '✅' : '⬜'} ${item.item}</li>`)
      .join('');

    const photosBeforeHtml = (report.photos_before || [])
      .map((url: string) => `<img src="${url}" alt="Antes" style="width:180px;height:135px;object-fit:cover;border-radius:8px;border:1px solid #e2e8f0;" />`)
      .join('');

    const photosAfterHtml = (report.photos_after || [])
      .map((url: string) => `<img src="${url}" alt="Depois" style="width:180px;height:135px;object-fit:cover;border-radius:8px;border:1px solid #e2e8f0;" />`)
      .join('');

    const emailHtml = `
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
      <p style="color:#333;font-size:14px;">Olá <strong>${imobiliariaName}</strong>,</p>
      <p style="color:#666;font-size:14px;line-height:1.6;">
        O serviço referente à ordem <strong style="color:#1a6b7a;">${order.os_number}</strong> foi concluído com sucesso.
        Segue o resumo do relatório de execução.
      </p>
      
      <div style="background:#f8fafc;border-radius:12px;padding:20px;margin:20px 0;">
        <table style="width:100%;font-size:13px;color:#333;" cellpadding="4">
          <tr><td style="color:#888;">Imóvel:</td><td><strong>${propertyAddress}</strong></td></tr>
          <tr><td style="color:#888;">Técnico:</td><td><strong>${tecnicoName}</strong></td></tr>
          <tr><td style="color:#888;">Concluído em:</td><td><strong>${completedDate}</strong></td></tr>
          ${order.final_price ? `<tr><td style="color:#888;">Valor:</td><td><strong style="color:#1a6b7a;">R$ ${Number(order.final_price).toFixed(2)}</strong></td></tr>` : ''}
        </table>
      </div>

      <h3 style="font-size:15px;color:#333;margin:24px 0 8px;">Serviço Executado</h3>
      <p style="font-size:13px;color:#555;line-height:1.6;">${report.description}</p>

      ${checklist.length > 0 ? `
        <h3 style="font-size:15px;color:#333;margin:24px 0 8px;">Checklist</h3>
        <ul style="list-style:none;padding:0;font-size:13px;color:#555;">${checklistHtml}</ul>
      ` : ''}

      ${photosBeforeHtml || photosAfterHtml ? `
        <h3 style="font-size:15px;color:#333;margin:24px 0 8px;">Registro Fotográfico</h3>
        ${photosBeforeHtml ? `<p style="font-size:12px;color:#888;margin:8px 0 4px;">Antes:</p><div style="display:flex;gap:8px;flex-wrap:wrap;">${photosBeforeHtml}</div>` : ''}
        ${photosAfterHtml ? `<p style="font-size:12px;color:#888;margin:8px 0 4px;">Depois:</p><div style="display:flex;gap:8px;flex-wrap:wrap;">${photosAfterHtml}</div>` : ''}
      ` : ''}

      ${report.observations ? `
        <h3 style="font-size:15px;color:#333;margin:24px 0 8px;">Observações</h3>
        <p style="font-size:13px;color:#555;line-height:1.6;">${report.observations}</p>
      ` : ''}

      ${reportUrl ? `
        <div style="text-align:center;margin:32px 0;">
          <a href="${reportUrl}" style="background:#1a6b7a;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;display:inline-block;">
            Ver Relatório Completo
          </a>
        </div>
      ` : ''}

      <div style="text-align:center;border-top:1px solid #e2e8f0;padding-top:20px;margin-top:24px;">
        <p style="font-size:11px;color:#aaa;">
          Faz-Tudo Imobiliário — Relatório gerado automaticamente<br />
          ${order.os_number} • ${completedDate}
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

    // Send email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Faz-Tudo <noreply@resend.dev>',
        to: [imobiliariaEmail],
        subject: `Relatório de Serviço - ${order.os_number} - Concluído`,
        html: emailHtml,
      }),
    });

    const resendData = await resendResponse.json();
    console.log('Resend response:', resendData);

    if (!resendResponse.ok) {
      console.error('Resend error:', resendData);
      return new Response(JSON.stringify({ 
        success: true, 
        emailSent: false,
        message: 'Relatório salvo, mas houve erro ao enviar o e-mail.',
        emailError: resendData,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    console.log(`Email sent successfully to ${imobiliariaEmail} for ${order.os_number}`);

    return new Response(JSON.stringify({ 
      success: true, 
      emailSent: true,
      message: 'Relatório salvo e e-mail enviado com sucesso!',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Error in send-completion-report:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
