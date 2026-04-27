import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AuthPage from './AuthPage';

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

const EXPECTED_ORDER = ['admin', 'tecnico', 'imobiliaria', 'pessoa_fisica'] as const;

const EXPECTED_LABELS: Record<(typeof EXPECTED_ORDER)[number], RegExp> = {
  admin: /Entrar como Administrador\. Aprova, controla e acompanha as OS\./,
  tecnico: /Entrar como Técnico\. Orça, executa e finaliza o serviço\./,
  imobiliaria: /Entrar como Imobiliária\. Abre chamados e acompanha tudo\./,
  pessoa_fisica: /Entrar como Pessoa Física\. Solicita serviços para meus imóveis\./,
};

function renderAuthPage() {
  return render(
    <MemoryRouter>
      <AuthPage />
    </MemoryRouter>,
  );
}

describe('AuthPage — acessibilidade dos cartões de perfil', () => {
  it('cada cartão expõe um aria-label descritivo (título + descrição)', () => {
    const { container } = renderAuthPage();
    const buttons = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-profile-key]'),
    );
    expect(buttons).toHaveLength(EXPECTED_ORDER.length);

    for (const btn of buttons) {
      const key = btn.getAttribute('data-profile-key') as keyof typeof EXPECTED_LABELS;
      const label = btn.getAttribute('aria-label');
      expect(label, `aria-label ausente no cartão "${key}"`).toBeTruthy();
      expect(label).toMatch(EXPECTED_LABELS[key]);
    }
  });

  it('cartões são botões nativos (type="button"), focáveis e habilitados', () => {
    const { container } = renderAuthPage();
    const buttons = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-profile-key]'),
    );
    for (const btn of buttons) {
      expect(btn.tagName).toBe('BUTTON');
      expect(btn.getAttribute('type')).toBe('button');
      expect(btn).not.toBeDisabled();
      // Botões nativos não devem ter tabindex negativo (saem da ordem natural).
      const tabindex = btn.getAttribute('tabindex');
      expect(tabindex === null || Number(tabindex) >= 0).toBe(true);
    }
  });

  it('Tab navega pelos cartões na ordem oficial: admin → tecnico → imobiliaria → pessoa_fisica', async () => {
    const user = userEvent.setup();
    const { container } = renderAuthPage();
    const buttons = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-profile-key]'),
    );

    // Foca o primeiro cartão diretamente para começar o percurso na grade.
    buttons[0].focus();
    expect(document.activeElement).toBe(buttons[0]);
    expect(buttons[0].getAttribute('data-profile-key')).toBe(EXPECTED_ORDER[0]);

    for (let i = 1; i < EXPECTED_ORDER.length; i++) {
      await user.tab();
      expect(
        (document.activeElement as HTMLElement | null)?.getAttribute('data-profile-key'),
        `Após ${i} Tab(s), o foco deveria estar em "${EXPECTED_ORDER[i]}"`,
      ).toBe(EXPECTED_ORDER[i]);
    }
  });

  it('Shift+Tab navega na ordem reversa pelos cartões', async () => {
    const user = userEvent.setup();
    const { container } = renderAuthPage();
    const buttons = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-profile-key]'),
    );

    const last = buttons[buttons.length - 1];
    last.focus();
    expect(document.activeElement).toBe(last);

    for (let i = EXPECTED_ORDER.length - 2; i >= 0; i--) {
      await user.tab({ shift: true });
      expect(
        (document.activeElement as HTMLElement | null)?.getAttribute('data-profile-key'),
      ).toBe(EXPECTED_ORDER[i]);
    }
  });
});