// Typed helpers for Supabase queries
// Since the auto-generated types.ts may not reflect the latest schema,
// we use manual type-safe helpers here.

import { supabase } from './client';

/**
 * Returns a query builder for tables not yet in the generated types.
 * Casts away the strict table-name checking.
 */
export function typedFrom(table: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabase as any).from(table);
}
