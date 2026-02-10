import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Phone, Building2, Lock, Loader2 } from 'lucide-react';

const Configuracoes = () => {
  const { profile, role } = useAuth();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const getRoleLabel = () => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'imobiliaria': return 'Imobiliária';
      case 'tecnico': return 'Técnico';
      default: return '';
    }
  };

  const handleUpdateProfile = async () => {
    if (!profile) return;
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name, phone: phone || null })
        .eq('id', profile.id);

      if (error) throw error;
      toast({ title: 'Perfil atualizado com sucesso!' });
    } catch (err: any) {
      toast({ title: 'Erro ao atualizar perfil', description: err.message, variant: 'destructive' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: 'As senhas não coincidem', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'A senha deve ter pelo menos 6 caracteres', variant: 'destructive' });
      return;
    }
    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: 'Senha alterada com sucesso!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast({ title: 'Erro ao alterar senha', description: err.message, variant: 'destructive' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!profile) return null;

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground mt-1">Gerencie seu perfil e preferências</p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {/* Profile Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações do Perfil
            </CardTitle>
            <CardDescription>Atualize seus dados pessoais</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{profile.email}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
            </div>
            <div className="space-y-2">
              <Label>Função</Label>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{getRoleLabel()}</span>
              </div>
            </div>
            {profile.company && (
              <div className="space-y-2">
                <Label>Empresa</Label>
                <span className="text-sm text-muted-foreground block">{profile.company}</span>
              </div>
            )}
            <Button onClick={handleUpdateProfile} disabled={isUpdating}>
              {isUpdating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar Alterações
            </Button>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Alterar Senha
            </CardTitle>
            <CardDescription>Defina uma nova senha para sua conta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
            <Button onClick={handleChangePassword} disabled={isChangingPassword} variant="outline">
              {isChangingPassword && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Alterar Senha
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Configuracoes;
