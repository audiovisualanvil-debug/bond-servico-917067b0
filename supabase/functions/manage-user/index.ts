import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ============ Validation helpers (BR) ============
const onlyDigits = (v: string): string => (v || "").replace(/\D+/g, "");

const isValidCPF = (cpf: string): boolean => {
  const d = onlyDigits(cpf);
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;
  const calc = (slice: string, factor: number): number => {
    let sum = 0;
    for (let i = 0; i < slice.length; i++) sum += parseInt(slice[i], 10) * (factor - i);
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };
  const d1 = calc(d.slice(0, 9), 10);
  if (d1 !== parseInt(d[9], 10)) return false;
  const d2 = calc(d.slice(0, 10), 11);
  return d2 === parseInt(d[10], 10);
};

const isValidCNPJ = (cnpj: string): boolean => {
  const d = onlyDigits(cnpj);
  if (d.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(d)) return false;
  const calc = (slice: string, factors: number[]): number => {
    let sum = 0;
    for (let i = 0; i < slice.length; i++) sum += parseInt(slice[i], 10) * factors[i];
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };
  const f1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const f2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d1 = calc(d.slice(0, 12), f1);
  if (d1 !== parseInt(d[12], 10)) return false;
  const d2 = calc(d.slice(0, 13), f2);
  return d2 === parseInt(d[13], 10);
};

const isValidPhoneBR = (phone: string): boolean => {
  const d = onlyDigits(phone);
  return d.length === 10 || d.length === 11;
};

const errorResponse = (message: string, status = 400, extra: Record<string, unknown> = {}) =>
  new Response(
    JSON.stringify({ error: message, ...extra }),
    { status, headers: { "Content-Type": "application/json", ...corsHeaders } }
  );

interface ManageUserRequest {
  action: "update" | "ban" | "unban" | "reset_password" | "change_role";
  user_id: string;
  name?: string;
  phone?: string;
  company?: string;
  cnpj?: string;
  password?: string;
  send_email?: boolean;
  role?: "admin" | "tecnico" | "imobiliaria" | "pessoa_fisica";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autorizado");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !caller) throw new Error("Não autorizado");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .single();

    if (!roleData) throw new Error("Apenas administradores podem gerenciar usuários");

    const body: ManageUserRequest = await req.json();
    const { action, user_id } = body;

    if (!action || !user_id) {
      throw new Error("Campos obrigatórios: action, user_id");
    }

    // Prevent admin from banning themselves
    if ((action === "ban") && user_id === caller.id) {
      throw new Error("Você não pode desativar sua própria conta");
    }

    if (action === "update") {
      const updates: Record<string, unknown> = {};
      if (body.name !== undefined) updates.name = body.name.trim();
      if (body.phone !== undefined) updates.phone = body.phone.trim() || null;
      if (body.company !== undefined) updates.company = body.company.trim() || null;
      if (body.cnpj !== undefined) updates.cnpj = body.cnpj.trim() || null;

      if (Object.keys(updates).length === 0) {
        throw new Error("Nenhum campo para atualizar");
      }

      // Validate name
      if (updates.name !== undefined && (updates.name as string).length === 0) {
        throw new Error("Nome não pode ser vazio");
      }

      // Validate name length
      if (updates.name !== undefined && (updates.name as string).length > 120) {
        return errorResponse("Nome muito longo (máximo 120 caracteres)", 400, { field: "name" });
      }

      // Validate phone format if provided (non-null)
      if (updates.phone && !isValidPhoneBR(updates.phone as string)) {
        return errorResponse(
          "Telefone inválido. Use formato (DDD) número, com 10 ou 11 dígitos.",
          400,
          { field: "phone" }
        );
      }

      // Validate CPF/CNPJ against the user's current role
      if (updates.cnpj) {
        const docDigits = onlyDigits(updates.cnpj as string);
        const { data: currentRoles } = await adminClient
          .from("user_roles")
          .select("role")
          .eq("user_id", user_id);
        const roles = (currentRoles || []).map((r) => r.role);
        const isImob = roles.includes("imobiliaria");
        const isPF = roles.includes("pessoa_fisica");

        if (isImob) {
          if (!isValidCNPJ(docDigits)) {
            return errorResponse(
              "CNPJ inválido. Verifique os 14 dígitos e os dígitos verificadores.",
              400,
              { field: "cnpj" }
            );
          }
          updates.cnpj = docDigits;
        } else if (isPF) {
          if (!isValidCPF(docDigits)) {
            return errorResponse(
              "CPF inválido. Verifique os 11 dígitos e os dígitos verificadores.",
              400,
              { field: "cnpj" }
            );
          }
          updates.cnpj = docDigits;
        }
        // admin/tecnico: aceita valor livre, mas grava só dígitos se houver
        else if (docDigits.length > 0) {
          updates.cnpj = docDigits;
        }
      }

      // Imobiliária: empresa obrigatória se vier vazia explicitamente
      if (updates.company !== undefined && updates.company === null) {
        const { data: currentRoles } = await adminClient
          .from("user_roles")
          .select("role")
          .eq("user_id", user_id);
        const roles = (currentRoles || []).map((r) => r.role);
        if (roles.includes("imobiliaria")) {
          return errorResponse(
            "Nome da empresa é obrigatório para Imobiliária.",
            400,
            { field: "company" }
          );
        }
      }

      const { error } = await adminClient
        .from("profiles")
        .update(updates)
        .eq("id", user_id);

      if (error) throw new Error(`Erro ao atualizar perfil: ${error.message}`);

      return new Response(
        JSON.stringify({ success: true, action: "updated" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (action === "change_role") {
      const newRole = body.role;
      const allowed = ["admin", "tecnico", "imobiliaria", "pessoa_fisica"];
      if (!newRole || !allowed.includes(newRole)) {
        return errorResponse(
          "Tipo de usuário inválido. Use admin, tecnico, imobiliaria ou pessoa_fisica.",
          400,
          { field: "role" }
        );
      }

      // Prevent admin from removing their own admin role (lockout protection)
      if (user_id === caller.id && newRole !== "admin") {
        return errorResponse(
          "Você não pode alterar seu próprio tipo de usuário.",
          400,
          { field: "role" }
        );
      }

      // Validate that profile document matches the new role
      const { data: profile } = await adminClient
        .from("profiles")
        .select("cnpj, company")
        .eq("id", user_id)
        .maybeSingle();

      const docDigits = onlyDigits(profile?.cnpj || "");

      if (newRole === "imobiliaria") {
        if (docDigits && !isValidCNPJ(docDigits)) {
          return errorResponse(
            "Para mudar para Imobiliária, o CNPJ cadastrado precisa ser válido (14 dígitos). Atualize o CNPJ antes de alterar o tipo.",
            400,
            { field: "cnpj" }
          );
        }
      } else if (newRole === "pessoa_fisica") {
        if (docDigits && !isValidCPF(docDigits)) {
          return errorResponse(
            "Para mudar para Pessoa Física, o CPF cadastrado precisa ser válido (11 dígitos). Atualize o CPF antes de alterar o tipo.",
            400,
            { field: "cnpj" }
          );
        }
      }

      // Replace user's role(s) atomically: delete existing, insert new
      const { error: delErr } = await adminClient
        .from("user_roles")
        .delete()
        .eq("user_id", user_id);
      if (delErr) throw new Error(`Erro ao remover role atual: ${delErr.message}`);

      const { error: insErr } = await adminClient
        .from("user_roles")
        .insert({ user_id, role: newRole });
      if (insErr) throw new Error(`Erro ao definir novo role: ${insErr.message}`);

      return new Response(
        JSON.stringify({ success: true, action: "role_changed", role: newRole }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (action === "ban") {
      const { error } = await adminClient.auth.admin.updateUserById(user_id, {
        ban_duration: "876600h", // ~100 years
      });
      if (error) throw new Error(`Erro ao desativar usuário: ${error.message}`);

      return new Response(
        JSON.stringify({ success: true, action: "banned" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (action === "unban") {
      const { error } = await adminClient.auth.admin.updateUserById(user_id, {
        ban_duration: "none",
      });
      if (error) throw new Error(`Erro ao reativar usuário: ${error.message}`);

      return new Response(
        JSON.stringify({ success: true, action: "unbanned" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (action === "reset_password") {
      if (!body.password || body.password.length < 6) {
        throw new Error("Senha deve ter no mínimo 6 caracteres");
      }
      const { error } = await adminClient.auth.admin.updateUserById(user_id, {
        password: body.password,
      });
      if (error) throw new Error(`Erro ao resetar senha: ${error.message}`);

      // Envio opcional da nova senha por e-mail
      let emailSent = false;
      let emailError: string | null = null;
      if (body.send_email) {
        try {
          const { data: profile } = await adminClient
            .from("profiles")
            .select("email, name")
            .eq("id", user_id)
            .single();

          const recipientEmail = profile?.email;
          const recipientName = profile?.name || "usuário";
          const resendKey = Deno.env.get("RESEND_API_KEY");
          const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");

          if (!recipientEmail) {
            emailError = "Usuário não possui e-mail cadastrado";
          } else if (!resendKey || !fromEmail) {
            emailError = "Servidor de e-mail não configurado";
          } else {
            const escapeHtml = (s: string) =>
              s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

            const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f5f7fa;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:24px auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e2e8f0;">
    <h2 style="margin:0 0 12px;color:#0f172a;">Sua senha foi redefinida</h2>
    <p style="color:#475569;font-size:14px;line-height:1.6;">
      Olá <strong>${escapeHtml(recipientName)}</strong>,<br/>
      O administrador da Vita FAZ TUDO definiu uma nova senha temporária para sua conta.
    </p>
    <div style="background:#f1f5f9;border-radius:8px;padding:16px;margin:20px 0;text-align:center;">
      <p style="margin:0 0 6px;font-size:12px;color:#64748b;">Sua nova senha:</p>
      <p style="margin:0;font-size:20px;font-weight:bold;color:#0f172a;letter-spacing:2px;font-family:monospace;">
        ${escapeHtml(body.password)}
      </p>
    </div>
    <p style="color:#475569;font-size:13px;line-height:1.6;">
      Por segurança, recomendamos que você acesse sua conta e altere essa senha por uma de sua preferência.
    </p>
    <div style="text-align:center;border-top:1px solid #e2e8f0;padding-top:16px;margin-top:20px;">
      <p style="font-size:11px;color:#aaa;margin:0;">Vita FAZ TUDO — Gestão de Manutenção</p>
    </div>
  </div>
</body></html>`;

            const res = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${resendKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: fromEmail,
                to: [recipientEmail],
                subject: "Sua senha foi redefinida — Vita FAZ TUDO",
                html,
              }),
            });
            const resData = await res.json();
            if (res.ok) {
              emailSent = true;
            } else {
              emailError = resData.message || JSON.stringify(resData);
              console.error("[manage-user] Resend rejeitou:", emailError);
            }
          }
        } catch (mailErr: any) {
          emailError = mailErr.message || "Erro ao enviar e-mail";
          console.error("[manage-user] Erro envio email:", mailErr);
        }
      }

      return new Response(
        JSON.stringify({ success: true, action: "password_reset", emailSent, emailError }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    throw new Error("Ação inválida. Use 'update', 'ban', 'unban' ou 'reset_password'");
  } catch (error: any) {
    console.error("Error in manage-user:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
