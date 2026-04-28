/**
 * Normalization & validation helpers for BR-specific fields.
 * Used before sending data to edge functions / Supabase.
 */

export const normalizeEmail = (email: string): string =>
  email.trim().toLowerCase();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (email: string): boolean => {
  const v = normalizeEmail(email);
  return v.length > 0 && v.length <= 255 && EMAIL_RE.test(v);
};

/** Remove tudo que não for dígito (máscara, espaços, pontos, traços). */
export const onlyDigits = (value: string): string =>
  (value || '').replace(/\D+/g, '');

/** Remove máscara do CPF, retornando apenas os 11 dígitos. */
export const normalizeCPF = (cpf: string): string => onlyDigits(cpf);

/**
 * Valida CPF brasileiro:
 * - 11 dígitos
 * - Não pode ser sequência repetida (000.000.000-00, 111..., etc.)
 * - Dígitos verificadores corretos
 */
export const isValidCPF = (cpf: string): boolean => {
  const digits = normalizeCPF(cpf);
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  const calc = (slice: string, factorStart: number): number => {
    let sum = 0;
    for (let i = 0; i < slice.length; i++) {
      sum += parseInt(slice[i], 10) * (factorStart - i);
    }
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };

  const d1 = calc(digits.slice(0, 9), 10);
  if (d1 !== parseInt(digits[9], 10)) return false;
  const d2 = calc(digits.slice(0, 10), 11);
  if (d2 !== parseInt(digits[10], 10)) return false;

  return true;
};

/** Formata 11 dígitos em 000.000.000-00. Retorna o original se não tiver 11 dígitos. */
export const formatCPF = (cpf: string): string => {
  const d = normalizeCPF(cpf);
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
};

/** Remove máscara do CNPJ, retornando apenas os 14 dígitos. */
export const normalizeCNPJ = (cnpj: string): string => onlyDigits(cnpj);

export const isValidCNPJ = (cnpj: string): boolean => {
  const d = normalizeCNPJ(cnpj);
  return d.length === 14;
};