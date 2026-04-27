import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  ensureRequiredProfileCards,
  PROFILE_FALLBACKS,
  type ProfileCard,
} from './AuthPage';

/**
 * Renderiza apenas a grade de cartões a partir de uma lista arbitrária,
 * para isolar o comportamento do fallback (sem precisar montar a AuthPage inteira
 * com Router/Auth/Toast).
 */
function ProfileGrid({ cards }: { cards: ProfileCard[] }) {
  const { cards: finalCards } = ensureRequiredProfileCards(cards);
  return (
    <div>
      {finalCards.map((card) => (
        <button key={card.key} data-profile-key={card.key}>
          <span>{card.title}</span>
          <span>{card.description}</span>
        </button>
      ))}
    </div>
  );
}

describe('AuthPage fallback — Pessoa Física', () => {
  it('renderiza "Entrar como Pessoa Física" mesmo quando a lista de cards não contém pessoa_fisica', () => {
    // Lista de entrada SEM o cartão pessoa_fisica
    const incomplete: ProfileCard[] = [
      PROFILE_FALLBACKS.admin,
      PROFILE_FALLBACKS.tecnico,
      PROFILE_FALLBACKS.imobiliaria,
    ];

    render(<ProfileGrid cards={incomplete} />);

    // Botão é re-injetado pelo fallback e renderizado normalmente.
    const button = screen.getByRole('button', { name: /Entrar como Pessoa Física/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('data-profile-key', 'pessoa_fisica');
    expect(screen.getByText(/Solicita serviços para meus imóveis/i)).toBeInTheDocument();
  });

  it('renderiza todos os 4 papéis obrigatórios mesmo recebendo lista vazia', () => {
    render(<ProfileGrid cards={[]} />);

    expect(screen.getByRole('button', { name: /Entrar como Administrador/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Entrar como Técnico/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Entrar como Imobiliária/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Entrar como Pessoa Física/i })).toBeInTheDocument();
  });

  it('ensureRequiredProfileCards reporta pessoa_fisica como injected quando ausente', () => {
    const { cards, injected } = ensureRequiredProfileCards([
      PROFILE_FALLBACKS.admin,
      PROFILE_FALLBACKS.tecnico,
      PROFILE_FALLBACKS.imobiliaria,
    ]);
    expect(injected).toEqual(['pessoa_fisica']);
    expect(cards.map((c) => c.key)).toEqual([
      'admin',
      'tecnico',
      'imobiliaria',
      'pessoa_fisica',
    ]);
  });

  it('ordem oficial é mantida mesmo se a entrada vier embaralhada', () => {
    const shuffled: ProfileCard[] = [
      PROFILE_FALLBACKS.pessoa_fisica,
      PROFILE_FALLBACKS.imobiliaria,
      PROFILE_FALLBACKS.admin,
      PROFILE_FALLBACKS.tecnico,
    ];
    const { cards } = ensureRequiredProfileCards(shuffled);
    expect(cards.map((c) => c.key)).toEqual([
      'admin',
      'tecnico',
      'imobiliaria',
      'pessoa_fisica',
    ]);
  });

  it('ordem oficial é mantida quando entrada é parcialmente embaralhada e incompleta', () => {
    const partial: ProfileCard[] = [
      PROFILE_FALLBACKS.tecnico,
      PROFILE_FALLBACKS.admin,
      // imobiliaria e pessoa_fisica vêm via fallback
    ];
    const { cards, injected } = ensureRequiredProfileCards(partial);
    expect(cards.map((c) => c.key)).toEqual([
      'admin',
      'tecnico',
      'imobiliaria',
      'pessoa_fisica',
    ]);
    expect(injected.sort()).toEqual(['imobiliaria', 'pessoa_fisica']);
  });

  it('detecta duplicatas e mantém apenas a primeira ocorrência', () => {
    const withDup: ProfileCard[] = [
      PROFILE_FALLBACKS.admin,
      PROFILE_FALLBACKS.admin, // duplicado
      PROFILE_FALLBACKS.tecnico,
      PROFILE_FALLBACKS.imobiliaria,
      PROFILE_FALLBACKS.pessoa_fisica,
    ];
    const { cards, duplicates } = ensureRequiredProfileCards(withDup);
    expect(duplicates).toEqual(['admin']);
    // Apenas uma ocorrência de admin no resultado.
    const adminCount = cards.filter((c) => c.key === 'admin').length;
    expect(adminCount).toBe(1);
    expect(cards.map((c) => c.key)).toEqual([
      'admin',
      'tecnico',
      'imobiliaria',
      'pessoa_fisica',
    ]);
  });

  it('não reporta duplicatas quando a entrada é válida', () => {
    const { duplicates } = ensureRequiredProfileCards([
      PROFILE_FALLBACKS.admin,
      PROFILE_FALLBACKS.tecnico,
      PROFILE_FALLBACKS.imobiliaria,
      PROFILE_FALLBACKS.pessoa_fisica,
    ]);
    expect(duplicates).toEqual([]);
  });
});