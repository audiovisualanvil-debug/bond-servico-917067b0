import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { typedFrom } from '@/integrations/supabase/helpers';
import { toast } from 'sonner';
import { Loader2, UserPlus, Users, Building2, Wrench, Mail, Phone, Building, Eye, EyeOff, Pencil, Ban, CheckCircle2, KeyRound, User, AlertCircle, Clock, RotateCw, X } from 'lucide-react';
import { Sparkles, Copy } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  normalizeEmail,
  isValidEmail,
  normalizeCPF,
  isValidCPF,
  normalizeCNPJ,
  isValidCNPJ,
  maskCPF,
  maskCNPJ,
  maskPhoneBR,
} from '@/lib/validators';
import { useAuditLog } from '@/hooks/useAuditLog';
import { CreateUserHealthBanner } from '@/components/admin/CreateUserHealthBanner';
import { Link } from 'react-router-dom';

interface UserWithRole {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  cnpj: string | null;
  role: string;
  created_at: string;
  is_banned: boolean;
}

const GerenciarUsuarios = () => {
  const { role, user } = useAuth();
  const queryClient = useQueryClient();
  const { log: auditLog } = useAuditLog();
  const [isCreating, setIsCreating] = useState(false);
  type CreateStatus =
    | { phase: 'idle' }
    | { phase: 'processing'; startedAt: number; email: string; role: string }
    | { phase: 'success'; email: string; userId?: string; durationMs: number }
    | { phase: 'error'; email: string; reason: string; message: string; durationMs: number; retry?: () => void };
  const [createStatus, setCreateStatus] = useState<CreateStatus>({ phase: 'idle' });
  const [elapsedMs, setElapsedMs] = useState(0);

  // Tick elapsed time while processing
  useEffect(() => {
    if (createStatus.phase !== 'processing') return;
    const id = setInterval(() => {
      setElapsedMs(Date.now() - createStatus.startedAt);
    }, 250);
    return () => clearInterval(id);
  }, [createStatus]);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    company: '',
    cnpj: '',
    role: '' as string,
  });

  // Edit dialog state
  const [editUser, setEditUser] = useState<UserWithRole | null>(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', company: '', cnpj: '' });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Ban/unban confirm dialog
  const [toggleUser, setToggleUser] = useState<UserWithRole | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  // Reset password dialog state
  const [resetUser, setResetUser] = useState<UserWithRole | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [sendResetEmail, setSendResetEmail] = useState(true);

  // Fetch all users with roles (admin only)
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data: roles, error: rolesError } = await typedFrom('user_roles').select('user_id, role');
      if (rolesError) throw rolesError;

      const { data: profiles, error: profilesError } = await typedFrom('profiles').select('*');
      if (profilesError) throw profilesError;

      // Check banned status for each user via DB function
      const userIds = (roles || []).map((r: any) => r.user_id as string);
      const bannedMap: Record<string, boolean> = {};
      await Promise.all(
        userIds.map(async (uid: string) => {
          const { data } = await supabase.rpc('is_user_banned', { _user_id: uid });
          bannedMap[uid] = !!data;
        })
      );

      const userList: UserWithRole[] = (roles || []).map((r: any) => {
        const profile = (profiles || []).find((p: any) => p.id === r.user_id);
        return {
          id: r.user_id,
          name: profile?.name || 'Sem nome',
          email: profile?.email || '',
          phone: profile?.phone || null,
          company: profile?.company || null,
          cnpj: profile?.cnpj || null,
          role: r.role,
          created_at: profile?.created_at || '',
          is_banned: bannedMap[r.user_id] || false,
        };
      });

      return userList.sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: role === 'admin',
  });

  const performCreateUser = async (payload: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    company?: string;
    cnpj?: string;
    role: string;
  }) => {
    setIsCreating(true);
    const TIMEOUT_MS = 30000;
    const TIMEOUT_SENTINEL = Symbol('timeout');
    const startedAtMs = Date.now();
    const startedAt = new Date(startedAtMs).toISOString();
    setElapsedMs(0);
    setCreateStatus({
      phase: 'processing',
      startedAt: startedAtMs,
      email: payload.email,
      role: payload.role,
    });
    const retryFn = () => {
      void performCreateUser(payload);
    };
    const setError = (reason: string, message: string) => {
      setCreateStatus({
        phase: 'error',
        email: payload.email,
        reason,
        message,
        durationMs: Date.now() - startedAtMs,
        retry: reason === 'email_already_in_use' ? undefined : retryFn,
      });
    };

    // Sanitized payload (NEVER log password)
    const safePayload = {
      email: payload.email,
      name: payload.name,
      phone: payload.phone || null,
      company: payload.company || null,
      cnpj: payload.cnpj || null,
      role: payload.role,
    };

    // Log attempt start (fire-and-forget)
    void auditLog({
      action: 'create_user_attempt',
      entity_type: 'user',
      details: { started_at: startedAt, payload: safePayload },
    });

    const logOutcome = (status: 'success' | 'error', extra: Record<string, any> = {}) => {
      void auditLog({
        action: status === 'success' ? 'create_user_success' : 'create_user_error',
        entity_type: 'user',
        entity_id: extra.user_id,
        details: {
          started_at: startedAt,
          finished_at: new Date().toISOString(),
          duration_ms: Date.now() - new Date(startedAt).getTime(),
          payload: safePayload,
          status,
          ...extra,
        },
      });
    };

    const showRetryToast = (title: string, description: string) => {
      toast.error(title, {
        description,
        action: {
          label: 'Tentar novamente',
          onClick: () => {
            void performCreateUser(payload);
          },
        },
      });
    };

    try {
      console.log('[create-user] invoking with role=', payload.role, 'email=', payload.email);
      const invokePromise = supabase.functions.invoke('create-user', {
        body: {
          email: payload.email,
          password: payload.password,
          name: payload.name,
          phone: payload.phone || undefined,
          company: payload.company || undefined,
          cnpj: payload.cnpj || undefined,
          role: payload.role,
        },
      });

      const raceResult: any = await Promise.race([
        invokePromise,
        new Promise((resolve) => setTimeout(() => resolve(TIMEOUT_SENTINEL), TIMEOUT_MS)),
      ]);

      if (raceResult === TIMEOUT_SENTINEL) {
        logOutcome('error', { reason: 'timeout', timeout_ms: TIMEOUT_MS });
        setError('timeout', 'A solicitação demorou mais de 30s.');
        showRetryToast(
          'Tempo esgotado (30s)',
          'A solicitação demorou demais. Verifique sua conexão.'
        );
        return;
      }

      const response = raceResult as Awaited<typeof invokePromise>;
      console.log('[create-user] response', response);

      const dataErrorCode = response.data?.error;
      const dataMessage = response.data?.message;

      if (dataErrorCode === 'EMAIL_ALREADY_IN_USE') {
        logOutcome('error', { reason: 'email_already_in_use', message: dataMessage });
        setError('email_already_in_use', dataMessage || `O e-mail ${payload.email} já existe.`);
        // Não retentar — não vai mudar o resultado
        toast.error('E-mail já cadastrado', {
          description: dataMessage || `O e-mail ${payload.email} já existe no sistema.`,
        });
        return;
      }

      if (response.error) {
        const errMsg = String(response.error.message || response.error);
        const lower = errMsg.toLowerCase();
        if (
          lower.includes('failed to fetch') ||
          lower.includes('network') ||
          lower.includes('cors') ||
          lower.includes('load failed')
        ) {
          logOutcome('error', { reason: 'network', message: errMsg });
          setError('network', 'Falha de conexão com o servidor.');
          showRetryToast(
            'Falha de conexão',
            'Não foi possível alcançar o servidor. Verifique sua internet.'
          );
          return;
        }
        if (lower.includes('non-2xx') || lower.includes('functionshttperror')) {
          logOutcome('error', { reason: 'server_error', message: dataMessage || errMsg });
          setError('server_error', dataMessage || errMsg);
          showRetryToast('Erro do servidor', dataMessage || errMsg);
          return;
        }
        logOutcome('error', { reason: 'invoke_error', message: errMsg });
        setError('invoke_error', errMsg);
        showRetryToast('Erro ao criar usuário', errMsg);
        return;
      }

      if (dataErrorCode) {
        logOutcome('error', { reason: dataErrorCode, message: dataMessage });
        setError(dataErrorCode, dataMessage || dataErrorCode);
        showRetryToast('Erro ao criar usuário', dataMessage || dataErrorCode);
        return;
      }

      logOutcome('success', { user_id: response.data?.user_id });
      setCreateStatus({
        phase: 'success',
        email: payload.email,
        userId: response.data?.user_id,
        durationMs: Date.now() - startedAtMs,
      });
      toast.success(`Usuário ${payload.name} criado com sucesso!`);
      setForm({ email: '', password: '', name: '', phone: '', company: '', cnpj: '', role: '' });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (err: any) {
      console.error('[create-user] error', err);
      const msg = String(err?.message || err || '');
      const lower = msg.toLowerCase();
      if (lower.includes('failed to fetch') || lower.includes('network') || lower.includes('cors')) {
        logOutcome('error', { reason: 'network_exception', message: msg });
        setError('network_exception', msg || 'Falha de rede inesperada.');
        showRetryToast(
          'Falha de conexão',
          'Não foi possível alcançar o servidor. Verifique sua internet.'
        );
      } else {
        logOutcome('error', { reason: 'exception', message: msg });
        setError('exception', msg || 'Erro inesperado.');
        showRetryToast('Erro ao criar usuário', msg || 'Erro inesperado');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.name || !form.role) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    // E-mail: trim + lowercase + formato válido
    const email = normalizeEmail(form.email);
    if (!isValidEmail(email)) {
      toast.error('E-mail inválido', {
        description: 'Informe um e-mail no formato usuario@dominio.com',
      });
      return;
    }

    if (form.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    let normalizedCnpj: string | undefined;

    if (form.role === 'imobiliaria') {
      if (!form.company || !form.phone || !form.cnpj) {
        toast.error('Para imobiliária, empresa, telefone e CNPJ são obrigatórios');
        return;
      }
      normalizedCnpj = normalizeCNPJ(form.cnpj);
      if (!isValidCNPJ(normalizedCnpj)) {
        toast.error('CNPJ inválido', { description: 'O CNPJ deve ter 14 dígitos.' });
        return;
      }
    }

    if (form.role === 'pessoa_fisica') {
      if (!form.phone) {
        toast.error('Para pessoa física, o telefone é obrigatório');
        return;
      }
      // CPF é opcional no formulário, mas se preenchido deve ser válido
      if (form.cnpj && form.cnpj.trim()) {
        const normalizedCpf = normalizeCPF(form.cnpj);
        if (!isValidCPF(normalizedCpf)) {
          toast.error('CPF inválido', {
            description: 'Verifique se o CPF tem 11 dígitos e os dígitos verificadores estão corretos.',
          });
          return;
        }
        normalizedCnpj = normalizedCpf; // reaproveita o campo cnpj para guardar CPF (sem máscara)
      }
    }

    await performCreateUser({
      email,
      password: form.password,
      name: form.name.trim(),
      phone: form.phone,
      company: form.company,
      cnpj: normalizedCnpj,
      role: form.role,
    });
  };

  const handleOpenEdit = (u: UserWithRole) => {
    setEditForm({ name: u.name, phone: u.phone || '', company: u.company || '', cnpj: u.cnpj || '' });
    setEditUser(u);
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    if (!editForm.name.trim()) {
      toast.error('Nome não pode ser vazio');
      return;
    }

    setIsSavingEdit(true);
    try {
      const response = await supabase.functions.invoke('manage-user', {
        body: {
          action: 'update',
          user_id: editUser.id,
          name: editForm.name,
          phone: editForm.phone,
          company: editForm.company,
          cnpj: editForm.cnpj,
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      toast.success('Usuário atualizado com sucesso!');
      setEditUser(null);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar usuário');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!toggleUser) return;

    setIsToggling(true);
    try {
      const action = toggleUser.is_banned ? 'unban' : 'ban';
      const response = await supabase.functions.invoke('manage-user', {
        body: { action, user_id: toggleUser.id },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      toast.success(toggleUser.is_banned ? 'Usuário reativado!' : 'Usuário desativado!');
      setToggleUser(null);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao alterar status');
    } finally {
      setIsToggling(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetUser || !newPassword) return;
    if (newPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setIsResetting(true);
    try {
      const response = await supabase.functions.invoke('manage-user', {
        body: {
          action: 'reset_password',
          user_id: resetUser.id,
          password: newPassword,
          send_email: sendResetEmail,
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      const { emailSent, emailError } = response.data || {};
      if (sendResetEmail) {
        if (emailSent) {
          toast.success(`Senha resetada e enviada por e-mail para ${resetUser.email}`);
        } else {
          toast.warning(`Senha resetada, mas o e-mail não foi enviado${emailError ? `: ${emailError}` : ''}`);
        }
      } else {
        toast.success(`Senha de ${resetUser.name} resetada com sucesso!`);
      }
      setResetUser(null);
      setNewPassword('');
      setShowNewPassword(false);
      setSendResetEmail(true);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao resetar senha');
    } finally {
      setIsResetting(false);
    }
  };

  // Gera senha temporária forte (10 caracteres) fácil de digitar
  const generateTempPassword = () => {
    const lower = 'abcdefghijkmnpqrstuvwxyz';
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const digits = '23456789';
    const special = '@#!$%';
    const all = lower + upper + digits + special;
    const pick = (set: string) => set[Math.floor(Math.random() * set.length)];
    let pwd = pick(upper) + pick(lower) + pick(digits) + pick(special);
    for (let i = 0; i < 6; i++) pwd += pick(all);
    // embaralha
    pwd = pwd.split('').sort(() => Math.random() - 0.5).join('');
    setNewPassword(pwd);
    setShowNewPassword(true);
  };

  const copyPasswordToClipboard = async () => {
    if (!newPassword) return;
    try {
      await navigator.clipboard.writeText(newPassword);
      toast.success('Senha copiada!');
    } catch {
      toast.error('Não foi possível copiar');
    }
  };

  if (role !== 'admin') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Acesso restrito a administradores.</p>
        </div>
      </DashboardLayout>
    );
  }

  const roleLabel = (r: string) => {
    switch (r) {
      case 'admin': return 'Admin';
      case 'tecnico': return 'Profissional';
      case 'imobiliaria': return 'Imobiliária';
      case 'pessoa_fisica': return 'Pessoa Física';
      default: return r;
    }
  };

  const roleColor = (r: string) => {
    switch (r) {
      case 'admin': return 'destructive';
      case 'tecnico': return 'default';
      case 'imobiliaria': return 'secondary';
      case 'pessoa_fisica': return 'outline';
      default: return 'outline' as const;
    }
  };

  const tecnicos = users.filter(u => u.role === 'tecnico');
  const imobiliarias = users.filter(u => u.role === 'imobiliaria');
  const pessoasFisicas = users.filter(u => u.role === 'pessoa_fisica');
  const admins = users.filter(u => u.role === 'admin');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Gerenciar Usuários</h1>
          <p className="text-muted-foreground mt-1">Cadastre, edite e gerencie imobiliárias e profissionais.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create user form */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Novo Usuário
              </CardTitle>
              <CardDescription>Crie uma conta para imobiliária ou profissional</CardDescription>
            </CardHeader>
            <CardContent>
              {/* FIX: Erro #8 - noValidate para evitar mensagens nativas em inglês */}
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="space-y-2">
                  <Label>Tipo de Usuário *</Label>
                  <Select value={form.role} onValueChange={(v) => setForm(f => ({ ...f, role: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                     <SelectContent>
                      <SelectItem value="imobiliaria">
                        <span className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Imobiliária</span>
                      </SelectItem>
                      <SelectItem value="pessoa_fisica">
                        <span className="flex items-center gap-2"><User className="h-4 w-4" /> Pessoa Física</span>
                      </SelectItem>
                      <SelectItem value="tecnico">
                        <span className="flex items-center gap-2"><Wrench className="h-4 w-4" /> Profissional</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Nome Completo *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Nome do usuário"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="email@exemplo.com"
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* FIX: Erro #3 - Indicador de força de senha */}
                <div className="space-y-2">
                  <Label>Senha *</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="Mínimo 6 caracteres"
                      className={form.password.length > 0 && form.password.length < 6 ? 'border-destructive' : ''}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {form.password.length > 0 && (() => {
                    const len = form.password.length;
                    const hasUpper = /[A-Z]/.test(form.password);
                    const hasNumber = /[0-9]/.test(form.password);
                    const hasSpecial = /[^A-Za-z0-9]/.test(form.password);
                    const score = (len >= 6 ? 1 : 0) + (len >= 8 ? 1 : 0) + (hasUpper ? 1 : 0) + (hasNumber ? 1 : 0) + (hasSpecial ? 1 : 0);
                    const strength = score <= 1 ? { label: 'Fraca', color: 'bg-destructive', width: '33%' } 
                      : score <= 3 ? { label: 'Média', color: 'bg-status-pending', width: '66%' } 
                      : { label: 'Forte', color: 'bg-status-approved', width: '100%' };
                    return (
                      <div className="space-y-1">
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-300 ${strength.color}`} style={{ width: strength.width }} />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Força: <span className="font-medium">{strength.label}</span>
                          {len < 6 && <span className="text-destructive ml-1">— mínimo 6 caracteres</span>}
                        </p>
                      </div>
                    );
                  })()}
                </div>

                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={form.phone}
                      onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="(11) 99999-9999"
                      className="pl-10"
                    />
                  </div>
                </div>

                {form.role === 'imobiliaria' && (
                  <>
                    <div className="space-y-2">
                      <Label>Empresa *</Label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={form.company}
                          onChange={(e) => setForm(f => ({ ...f, company: e.target.value }))}
                          placeholder="Nome da imobiliária"
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>CNPJ *</Label>
                      <Input
                        value={form.cnpj}
                        onChange={(e) => setForm(f => ({ ...f, cnpj: e.target.value }))}
                        placeholder="00.000.000/0000-00"
                      />
                    </div>
                  </>
                )}

                <Button type="submit" className="w-full" disabled={isCreating}>
                  {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                  Criar Usuário
                </Button>

                {createStatus.phase !== 'idle' && (
                  <div
                    role="status"
                    aria-live="polite"
                    className={
                      'mt-3 rounded-md border p-3 text-sm flex items-start gap-3 ' +
                      (createStatus.phase === 'processing'
                        ? 'border-blue-200 bg-blue-500/10 text-blue-800'
                        : createStatus.phase === 'success'
                        ? 'border-green-200 bg-green-500/10 text-green-800'
                        : 'border-red-200 bg-red-500/10 text-red-800')
                    }
                  >
                    <div className="mt-0.5">
                      {createStatus.phase === 'processing' && <Loader2 className="h-4 w-4 animate-spin" />}
                      {createStatus.phase === 'success' && <CheckCircle2 className="h-4 w-4" />}
                      {createStatus.phase === 'error' && <AlertCircle className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      {createStatus.phase === 'processing' && (
                        <>
                          <div className="font-medium">Processando criação…</div>
                          <div className="text-xs opacity-80 truncate">
                            {createStatus.email} · {createStatus.role}
                          </div>
                          <div className="text-xs opacity-80 flex items-center gap-1 mt-1">
                            <Clock className="h-3 w-3" />
                            {(elapsedMs / 1000).toFixed(1)}s / 30s
                          </div>
                        </>
                      )}
                      {createStatus.phase === 'success' && (
                        <>
                          <div className="font-medium">Usuário confirmado</div>
                          <div className="text-xs opacity-80 truncate">
                            {createStatus.email}
                            {createStatus.userId && ` · ID ${createStatus.userId.slice(0, 8)}…`}
                          </div>
                          <div className="text-xs opacity-80 mt-1">
                            Concluído em {(createStatus.durationMs / 1000).toFixed(1)}s
                          </div>
                        </>
                      )}
                      {createStatus.phase === 'error' && (
                        <>
                          <div className="font-medium">Falha na criação</div>
                          <div className="text-xs opacity-90 break-words">
                            <span className="font-mono">{createStatus.reason}</span> — {createStatus.message}
                          </div>
                          <div className="text-xs opacity-80 mt-1">
                            Após {(createStatus.durationMs / 1000).toFixed(1)}s · {createStatus.email}
                          </div>
                          {createStatus.retry && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="mt-2 h-7"
                              onClick={createStatus.retry}
                            >
                              <RotateCw className="h-3 w-3 mr-1" /> Tentar novamente
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                    {createStatus.phase !== 'processing' && (
                      <button
                        type="button"
                        aria-label="Fechar status"
                        className="opacity-60 hover:opacity-100"
                        onClick={() => setCreateStatus({ phase: 'idle' })}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Users list */}
          <div className="lg:col-span-2 space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">{imobiliarias.length}</p>
                    <p className="text-xs text-muted-foreground">Imobiliárias</p>
                  </Card>
                  <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">{pessoasFisicas.length}</p>
                    <p className="text-xs text-muted-foreground">Pessoas Físicas</p>
                  </Card>
                  <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">{tecnicos.length}</p>
                    <p className="text-xs text-muted-foreground">Profissionais</p>
                  </Card>
                  <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">{admins.length}</p>
                    <p className="text-xs text-muted-foreground">Admins</p>
                  </Card>
                </div>

                {/* User cards */}
                <div className="space-y-3">
                  {users.map((u) => (
                    <Card key={u.id} className={`p-4 ${u.is_banned ? 'opacity-60' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${u.is_banned ? 'bg-muted' : 'bg-primary/10'}`}>
                            {u.role === 'tecnico' ? (
                              <Wrench className={`h-5 w-5 ${u.is_banned ? 'text-muted-foreground' : 'text-primary'}`} />
                            ) : u.role === 'imobiliaria' ? (
                              <Building2 className={`h-5 w-5 ${u.is_banned ? 'text-muted-foreground' : 'text-primary'}`} />
                            ) : u.role === 'pessoa_fisica' ? (
                              <User className={`h-5 w-5 ${u.is_banned ? 'text-muted-foreground' : 'text-primary'}`} />
                            ) : (
                              <Users className={`h-5 w-5 ${u.is_banned ? 'text-muted-foreground' : 'text-primary'}`} />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-foreground">{u.name}</p>
                              {u.is_banned && (
                                <Badge variant="outline" className="text-destructive border-destructive text-xs">Inativo</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{u.email}</p>
                            {u.company && (
                              <p className="text-xs text-muted-foreground">{u.company}</p>
                            )}
                            {u.cnpj && (
                              <p className="text-xs text-muted-foreground">CNPJ: {u.cnpj}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {u.phone && (
                            <span className="text-xs text-muted-foreground hidden sm:block">{u.phone}</span>
                          )}
                          <Badge variant={roleColor(u.role) as any}>{roleLabel(u.role)}</Badge>
                          {/* Action buttons - don't show for current admin user */}
                          {u.id !== user?.id && u.role !== 'admin' && (
                            <div className="flex items-center gap-1 ml-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleOpenEdit(u)}
                                title="Editar"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-amber-600 hover:text-amber-700"
                                onClick={() => { setResetUser(u); setNewPassword(''); setShowNewPassword(false); }}
                                title="Resetar Senha"
                              >
                                <KeyRound className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`h-8 w-8 ${u.is_banned ? 'text-green-600 hover:text-green-700' : 'text-destructive hover:text-destructive'}`}
                                onClick={() => setToggleUser(u)}
                                title={u.is_banned ? 'Reativar' : 'Desativar'}
                              >
                                {u.is_banned ? <CheckCircle2 className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                  {users.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">Nenhum usuário cadastrado.</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              {editUser?.email} — {roleLabel(editUser?.role || '')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome Completo *</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="(11) 99999-9999"
              />
            </div>
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Input
                value={editForm.company}
                onChange={(e) => setEditForm(f => ({ ...f, company: e.target.value }))}
                placeholder="Nome da empresa"
              />
            </div>
            {editUser?.role === 'imobiliaria' && (
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input
                  value={editForm.cnpj}
                  onChange={(e) => setEditForm(f => ({ ...f, cnpj: e.target.value }))}
                  placeholder="00.000.000/0000-00"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={isSavingEdit}>
              {isSavingEdit && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban/Unban Confirm Dialog */}
      <AlertDialog open={!!toggleUser} onOpenChange={(open) => !open && setToggleUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleUser?.is_banned ? 'Reativar Usuário' : 'Desativar Usuário'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleUser?.is_banned
                ? `Deseja reativar o acesso de ${toggleUser?.name}? O usuário poderá fazer login novamente.`
                : `Deseja desativar o acesso de ${toggleUser?.name}? O usuário não poderá mais fazer login no sistema.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isToggling}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleStatus}
              disabled={isToggling}
              className={toggleUser?.is_banned ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {isToggling && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {toggleUser?.is_banned ? 'Reativar' : 'Desativar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetUser} onOpenChange={(open) => { if (!open) { setResetUser(null); setNewPassword(''); setShowNewPassword(false); setSendResetEmail(true); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-amber-600" />
              Resetar Senha
            </DialogTitle>
            <DialogDescription>
              Defina uma nova senha para <strong>{resetUser?.name}</strong> ({resetUser?.email})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Nova Senha *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1 text-primary"
                  onClick={generateTempPassword}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Gerar senha temporária
                </Button>
              </div>
              <div className="relative">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className={`pr-20 ${newPassword.length > 0 && newPassword.length < 6 ? 'border-destructive' : ''}`}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {newPassword && (
                    <button
                      type="button"
                      onClick={copyPasswordToClipboard}
                      className="text-muted-foreground hover:text-foreground p-1"
                      title="Copiar"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="text-muted-foreground hover:text-foreground p-1"
                    title={showNewPassword ? 'Ocultar' : 'Mostrar'}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {newPassword.length > 0 && newPassword.length < 6 && (
                <p className="text-xs text-destructive">A senha deve ter pelo menos 6 caracteres</p>
              )}
            </div>

            <div className="flex items-start gap-2 p-3 rounded-md border border-border bg-muted/30">
              <Checkbox
                id="send-reset-email"
                checked={sendResetEmail}
                onCheckedChange={(c) => setSendResetEmail(!!c)}
                className="mt-0.5"
              />
              <div className="space-y-0.5">
                <label htmlFor="send-reset-email" className="text-sm font-medium cursor-pointer flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  Enviar nova senha por e-mail
                </label>
                <p className="text-xs text-muted-foreground">
                  O usuário receberá a senha em <strong className="break-all">{resetUser?.email}</strong>
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setResetUser(null); setNewPassword(''); }}>Cancelar</Button>
            <Button onClick={handleResetPassword} disabled={isResetting || newPassword.length < 6}>
              {isResetting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {sendResetEmail ? 'Resetar e Enviar' : 'Resetar Senha'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default GerenciarUsuarios;
