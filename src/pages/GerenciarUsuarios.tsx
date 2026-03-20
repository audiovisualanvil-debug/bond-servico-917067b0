import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useState } from 'react';
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
import { Loader2, UserPlus, Users, Building2, Wrench, Mail, Phone, Building, Eye, EyeOff, Pencil, Ban, CheckCircle2 } from 'lucide-react';

interface UserWithRole {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  role: string;
  created_at: string;
  is_banned: boolean;
}

const GerenciarUsuarios = () => {
  const { role, user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    company: '',
    role: '' as string,
  });

  // Edit dialog state
  const [editUser, setEditUser] = useState<UserWithRole | null>(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', company: '' });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Ban/unban confirm dialog
  const [toggleUser, setToggleUser] = useState<UserWithRole | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  // Fetch all users with roles (admin only)
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data: roles, error: rolesError } = await typedFrom('user_roles').select('user_id, role');
      if (rolesError) throw rolesError;

      const { data: profiles, error: profilesError } = await typedFrom('profiles').select('*');
      if (profilesError) throw profilesError;

      const userList: UserWithRole[] = (roles || []).map((r: any) => {
        const profile = (profiles || []).find((p: any) => p.id === r.user_id);
        return {
          id: r.user_id,
          name: profile?.name || 'Sem nome',
          email: profile?.email || '',
          phone: profile?.phone || null,
          company: profile?.company || null,
          role: r.role,
          created_at: profile?.created_at || '',
          is_banned: false, // Will be determined by UI state after actions
        };
      });

      return userList.sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: role === 'admin',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.name || !form.role) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    if (form.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setIsCreating(true);
    try {
      const response = await supabase.functions.invoke('create-user', {
        body: {
          email: form.email,
          password: form.password,
          name: form.name,
          phone: form.phone || undefined,
          company: form.company || undefined,
          role: form.role,
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      toast.success(`Usuário ${form.name} criado com sucesso!`);
      setForm({ email: '', password: '', name: '', phone: '', company: '', role: '' });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar usuário');
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenEdit = (u: UserWithRole) => {
    setEditForm({ name: u.name, phone: u.phone || '', company: u.company || '' });
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
      default: return r;
    }
  };

  const roleColor = (r: string) => {
    switch (r) {
      case 'admin': return 'destructive';
      case 'tecnico': return 'default';
      case 'imobiliaria': return 'secondary';
      default: return 'outline' as const;
    }
  };

  const tecnicos = users.filter(u => u.role === 'tecnico');
  const imobiliarias = users.filter(u => u.role === 'imobiliaria');
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
              <CardDescription>Crie uma conta para imobiliária ou técnico</CardDescription>
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
                      <SelectItem value="tecnico">
                        <span className="flex items-center gap-2"><Wrench className="h-4 w-4" /> Técnico</span>
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
                  <div className="space-y-2">
                    <Label>Empresa</Label>
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
                )}

                <Button type="submit" className="w-full" disabled={isCreating}>
                  {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                  Criar Usuário
                </Button>
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
                <div className="grid grid-cols-3 gap-3">
                  <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">{imobiliarias.length}</p>
                    <p className="text-xs text-muted-foreground">Imobiliárias</p>
                  </Card>
                  <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">{tecnicos.length}</p>
                    <p className="text-xs text-muted-foreground">Técnicos</p>
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
    </DashboardLayout>
  );
};

export default GerenciarUsuarios;
