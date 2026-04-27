import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
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

/**
 * Pares de classes esperadas por perfil. Definem o "tema" visual de cada
 * cartão (família de cor da borda + ícone + gradiente do badge). Qualquer
 * mudança acidental — por exemplo, trocar a borda do admin para azul ou o
 * ícone do técnico para verde — fará este teste falhar.
 *
 * Mantém também as classes neutras compartilhadas (fundo do cartão, cores
 * de texto), que asseguram contraste consistente entre título/descrição
 * e o fundo, conforme o design system.
 */
const EXPECTED_THEME = {
  admin: {
    family: 'amber',
    border: 'border-amber-500/40',
    borderHover: 'hover:border-amber-400',
    iconColor: 'text-amber-500',
    gradientFrom: 'from-amber-500/20',
    gradientTo: 'to-orange-500/20',
  },
  tecnico: {
    family: 'blue',
    border: 'border-blue-500/40',
    borderHover: 'hover:border-blue-400',
    iconColor: 'text-blue-500',
    gradientFrom: 'from-blue-500/20',
    gradientTo: 'to-cyan-500/20',
  },
  imobiliaria: {
    family: 'emerald',
    border: 'border-emerald-500/40',
    borderHover: 'hover:border-emerald-400',
    iconColor: 'text-emerald-500',
    gradientFrom: 'from-emerald-500/20',
    gradientTo: 'to-teal-500/20',
  },
  pessoa_fisica: {
    family: 'purple',
    border: 'border-purple-500/40',
    borderHover: 'hover:border-purple-400',
    iconColor: 'text-purple-500',
    gradientFrom: 'from-purple-500/20',
    gradientTo: 'to-fuchsia-500/20',
  },
} as const;

const NEUTRAL_BUTTON_CLASSES = ['bg-card/90', 'border-2', 'rounded-2xl'] as const;
const EXPECTED_TITLE_CLASS = 'text-foreground';
const EXPECTED_DESCRIPTION_CLASS = 'text-muted-foreground/80';

function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => {
      const maxMatch = query.match(/max-width:\s*(\d+)px/);
      const minMatch = query.match(/min-width:\s*(\d+)px/);
      let matches = false;
      if (maxMatch) matches = width <= Number(maxMatch[1]);
      else if (minMatch) matches = width >= Number(minMatch[1]);
      return {
        matches,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      };
    },
  });
  window.dispatchEvent(new Event('resize'));
}

function renderAuthPage() {
  return render(
    <MemoryRouter>
      <AuthPage />
    </MemoryRouter>,
  );
}

function assertContrastInvariants() {
  for (const [key, theme] of Object.entries(EXPECTED_THEME)) {
    const button = document.querySelector<HTMLButtonElement>(
      `[data-profile-key="${key}"]`,
    );
    expect(button, `cartão "${key}" não encontrado`).not.toBeNull();
    const cls = button!.className;

    // Fundo neutro do cartão e estrutura de borda
    for (const neutral of NEUTRAL_BUTTON_CLASSES) {
      expect(
        cls,
        `cartão "${key}" perdeu a classe neutra "${neutral}"`,
      ).toContain(neutral);
    }

    // Borda + hover na família correta (par texto/borda esperado)
    expect(
      cls,
      `cartão "${key}" deve usar borda da família ${theme.family}`,
    ).toContain(theme.border);
    expect(
      cls,
      `cartão "${key}" deve usar hover de borda da família ${theme.family}`,
    ).toContain(theme.borderHover);

    // Ícone com a mesma família da borda → garante contraste/coesão visual
    const icon = button!.querySelector('svg');
    expect(icon, `ícone do cartão "${key}" não encontrado`).not.toBeNull();
    expect(
      icon!.getAttribute('class') ?? '',
      `ícone do "${key}" deve usar a cor ${theme.iconColor}`,
    ).toContain(theme.iconColor);

    // Gradiente do badge na família correta (from + to esperados)
    const badge = button!.querySelector('div.bg-gradient-to-br');
    expect(badge, `badge do ícone do "${key}" não encontrado`).not.toBeNull();
    const badgeCls = badge!.getAttribute('class') ?? '';
    expect(
      badgeCls,
      `badge do "${key}" deve usar gradient ${theme.gradientFrom}`,
    ).toContain(theme.gradientFrom);
    expect(
      badgeCls,
      `badge do "${key}" deve usar gradient ${theme.gradientTo}`,
    ).toContain(theme.gradientTo);

    // Título e descrição usam tokens semânticos de contraste
    const title = button!.querySelector('h3');
    const description = button!.querySelector('p');
    expect(title, `título do "${key}" não encontrado`).not.toBeNull();
    expect(description, `descrição do "${key}" não encontrada`).not.toBeNull();
    expect(
      title!.getAttribute('class') ?? '',
      `título do "${key}" deve usar token ${EXPECTED_TITLE_CLASS}`,
    ).toContain(EXPECTED_TITLE_CLASS);
    expect(
      description!.getAttribute('class') ?? '',
      `descrição do "${key}" deve usar token ${EXPECTED_DESCRIPTION_CLASS}`,
    ).toContain(EXPECTED_DESCRIPTION_CLASS);
  }
}

describe('AuthPage — contraste/tema dos cartões', () => {
  const originalInnerWidth = window.innerWidth;
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: originalMatchMedia,
    });
  });

  it('mantém pares texto/fundo/borda esperados em mobile (375px)', () => {
    setViewportWidth(375);
    renderAuthPage();
    assertContrastInvariants();
  });

  it('mantém pares texto/fundo/borda esperados em desktop (1440px)', () => {
    setViewportWidth(1440);
    renderAuthPage();
    assertContrastInvariants();
  });

  it('cada perfil usa uma família de cor distinta (sem colisão de tema)', () => {
    setViewportWidth(1024);
    renderAuthPage();
    const families = Object.values(EXPECTED_THEME).map((t) => t.family);
    expect(new Set(families).size).toBe(families.length);
  });
});