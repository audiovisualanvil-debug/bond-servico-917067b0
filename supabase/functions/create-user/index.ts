import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
  company?: string;
  cnpj?: string;
  role: "imobiliaria" | "tecnico";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autorizado");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the caller is an admin using anon client
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !caller) throw new Error("Não autorizado");

    // Check admin role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .single();

    if (!roleData) throw new Error("Apenas administradores podem criar usuários");

    const body: CreateUserRequest = await req.json();
    const { email, password, name, phone, company, cnpj, role } = body;

    if (!email || !password || !name || !role) {
      throw new Error("Campos obrigatórios: email, password, name, role");
    }
    if (!["imobiliaria", "tecnico"].includes(role)) {
      throw new Error("Role deve ser 'imobiliaria' ou 'tecnico'");
    }

    // Create user via admin API
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) throw new Error(`Erro ao criar usuário: ${createError.message}`);

    const userId = newUser.user.id;

    // Create profile
    const { error: profileError } = await adminClient.from("profiles").insert({
      id: userId,
      email,
      name,
      phone: phone || null,
      company: company || null,
    });

    if (profileError) {
      // Rollback: delete the auth user
      await adminClient.auth.admin.deleteUser(userId);
      throw new Error(`Erro ao criar perfil: ${profileError.message}`);
    }

    // Assign role
    const { error: roleError } = await adminClient.from("user_roles").insert({
      user_id: userId,
      role,
    });

    if (roleError) {
      await adminClient.auth.admin.deleteUser(userId);
      throw new Error(`Erro ao atribuir papel: ${roleError.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, user_id: userId, email, name, role }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in create-user:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
