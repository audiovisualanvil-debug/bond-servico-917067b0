import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
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
vi.mock('@/components/MFAVerify', () => ({ default: () => null }));

function renderAuthPage() {
  return render(
    <MemoryRouter>
      <AuthPage />
    </MemoryRouter>,
  );
}

/**
 * Snapshot estável (chave + título + descrição) da grade de cartões.
 * Qualquer reordenação ou alteração de copy nos cartões fará este teste falhar,
 * forçando revisão consciente.
 */
describe('AuthPage — snapshot dos cartões de perfil', () => {
  it('mantém a sequência e os rótulos exatos dos cartões de login', () => {
    const { container } = renderAuthPage();
    const buttons = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-profile-key]'),
    );
    const snapshot = buttons.map((btn) => ({
      key: btn.getAttribute('data-profile-key'),
      title: btn.querySelector('h3')?.textContent?.trim() ?? null,
      description: btn.querySelector('p')?.textContent?.trim() ?? null,
    }));

    expect(snapshot).toMatchInlineSnapshot(`
      [
        {
          "description": "Aprova, controla e acompanha as OS.",
          "key": "admin",
          "title": "Entrar como Administrador",
        },
        {
          "description": "Orça, executa e finaliza o serviço.",
          "key": "tecnico",
          "title": "Entrar como Técnico",
        },
        {
          "description": "Abre chamados e acompanha tudo.",
          "key": "imobiliaria",
          "title": "Entrar como Imobiliária",
        },
        {
          "description": "Solicita serviços para meus imóveis.",
          "key": "pessoa_fisica",
          "title": "Entrar como Pessoa Física",
        },
      ]
    `);
  });

  it('snapshot do HTML da grade de cartões (detecta mudanças de markup)', () => {
    const { container } = renderAuthPage();
    const grid = container.querySelector('.grid.gap-4');
    expect(grid).not.toBeNull();
    // Snapshot do markup completo do grid (classes, ordem, conteúdo).
    expect(grid?.outerHTML).toMatchSnapshot();
  });
});