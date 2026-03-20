import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ManageUserRequest {
  action: "update" | "ban" | "unban";
  user_id: string;
  name?: string;
  phone?: string;
  company?: string;
  cnpj?: string;
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

    throw new Error("Ação inválida. Use 'update', 'ban' ou 'unban'");
  } catch (error: any) {
    console.error("Error in manage-user:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
