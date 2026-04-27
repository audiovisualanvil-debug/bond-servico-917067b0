import type { AppRole } from '@/types/database';

/**
 * Lista única de roles conhecidos pelo frontend. Mantenha sincronizada com
 * o enum `app_role` do Postgres e com `AppRole` em `src/types/database.ts`.
 */
export const KNOWN_ROLES = ['admin', 'tecnico', 'imobiliaria', 'pessoa_fisica'] as const;

export type KnownRole = (typeof KNOWN_ROLES)[number];

export function isKnownRole(role: unknown): role is KnownRole {
  return typeof role === 'string' && (KNOWN_ROLES as readonly string[]).includes(role);
}

/**
 * Emite um log estruturado em JSON quando o frontend recebe um role
 * desconhecido vindo do backend. Pronto para ser capturado por
 * Sentry/LogRocket/Datadog.
 */
export function logUnknownRole(role: AppRole | string | null, context: Record<string, unknown> = {}) {
  const event = {
    event: 'auth.unknown_role_detected',
    severity: 'error',
    timestamp: new Date().toISOString(),
    received_role: role,
    expected_roles: KNOWN_ROLES,
    context: {
      url: typeof window !== 'undefined' ? window.location.href : null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      app: 'vita-faz-tudo',
      ...context,
    },
  };
  // eslint-disable-next-line no-console
  console.error('[audit]', JSON.stringify(event));
}