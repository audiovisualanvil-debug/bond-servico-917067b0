import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AuthPage from './AuthPage';

// Mocks mínimos — isolar a tela de seleção de perfil.
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
 * Define largura da viewport simulada e ajusta `matchMedia` para refletir
 * o breakpoint correspondente. Como jsdom não computa CSS, o snapshot abaixo
 * captura o markup (classes Tailwind responsivas) que produz o layout —
 * qualquer mudança em classes como `grid-cols-*`, `md:*`, `sm:*`, etc.,
 * fará o teste falhar, forçando revisão consciente do layout.
 */
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
      // Suporta queries do tipo "(max-width: Npx)" e "(min-width: Npx)".
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

describe('AuthPage — snapshots responsivos dos cartões', () => {
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

  it('mantém o layout dos cartões em largura mobile (375px)', () => {
    setViewportWidth(375);
    const { container } = renderAuthPage();
    const grid = container.querySelector('.grid.gap-4');
    expect(grid).not.toBeNull();
    expect(grid?.outerHTML).toMatchSnapshot('mobile-375px');
  });

  it('mantém o layout dos cartões em largura desktop (1440px)', () => {
    setViewportWidth(1440);
    const { container } = renderAuthPage();
    const grid = container.querySelector('.grid.gap-4');
    expect(grid).not.toBeNull();
    expect(grid?.outerHTML).toMatchSnapshot('desktop-1440px');
  });

  it('preserva ordem e quantidade dos cartões em ambos os breakpoints', () => {
    setViewportWidth(375);
    const mobile = renderAuthPage();
    const mobileKeys = Array.from(
      mobile.container.querySelectorAll<HTMLButtonElement>('[data-profile-key]'),
    ).map((b) => b.getAttribute('data-profile-key'));
    cleanup();

    setViewportWidth(1440);
    const desktop = renderAuthPage();
    const desktopKeys = Array.from(
      desktop.container.querySelectorAll<HTMLButtonElement>('[data-profile-key]'),
    ).map((b) => b.getAttribute('data-profile-key'));

    expect(mobileKeys).toEqual(['admin', 'tecnico', 'imobiliaria', 'pessoa_fisica']);
    expect(desktopKeys).toEqual(mobileKeys);
  });
});