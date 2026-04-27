import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AuthPage from './AuthPage';

// Mocks mínimos para isolar a tela de seleção de perfil.
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    signIn: vi.fn(),
    needsMFA: false,
    completeMFA: vi.fn(),
    signOut: vi.fn(),
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: { resetPasswordForEmail: vi.fn() } },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/components/MFAVerify', () => ({
  default: () => null,
}));

function renderAuthPage() {
  return render(
    <MemoryRouter>
      <AuthPage />
    </MemoryRouter>,
  );
}

describe('AuthPage — cartão Pessoa Física', () => {
  it('exibe o cartão "Entrar como Pessoa Física" na seleção de perfil', () => {
    renderAuthPage();
    expect(
      screen.getByRole('heading', { name: /Entrar como Pessoa Física/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Solicita serviços para meus imóveis/i),
    ).toBeInTheDocument();
  });

  it('exibe os 4 cartões de papéis suportados (admin, técnico, imobiliária, pessoa física)', () => {
    renderAuthPage();
    expect(screen.getByRole('heading', { name: /Entrar como Administrador/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Entrar como Técnico/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Entrar como Imobiliária/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Entrar como Pessoa Física/i })).toBeInTheDocument();
  });

  it('cartão de Pessoa Física é clicável (botão acessível)', () => {
    renderAuthPage();
    const heading = screen.getByRole('heading', { name: /Entrar como Pessoa Física/i });
    const button = heading.closest('button');
    expect(button).not.toBeNull();
    expect(button).toBeEnabled();
  });
});