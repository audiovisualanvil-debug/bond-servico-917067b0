import { describe, it, expect } from 'vitest';
import {
  normalizeEmail,
  isValidEmail,
  normalizeCPF,
  isValidCPF,
  formatCPF,
  normalizeCNPJ,
  isValidCNPJ,
  maskCPF,
  maskCNPJ,
  maskPhoneBR,
} from './validators';

describe('normalizeEmail / isValidEmail', () => {
  it('lowercases and trims', () => {
    expect(normalizeEmail('  Foo@Bar.COM ')).toBe('foo@bar.com');
  });
  it('valid e-mails', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('  USER@EXAMPLE.COM  ')).toBe(true);
  });
  it('rejects malformed', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});

describe('CPF', () => {
  it('normalizeCPF strips mask', () => {
    expect(normalizeCPF('529.982.247-25')).toBe('52998224725');
    expect(normalizeCPF('  529 982 247 25  ')).toBe('52998224725');
  });
  it('accepts valid CPFs (with/without mask)', () => {
    expect(isValidCPF('52998224725')).toBe(true);
    expect(isValidCPF('529.982.247-25')).toBe(true);
  });
  it('rejects repeated sequences', () => {
    expect(isValidCPF('00000000000')).toBe(false);
    expect(isValidCPF('111.111.111-11')).toBe(false);
  });
  it('rejects wrong length', () => {
    expect(isValidCPF('123')).toBe(false);
    expect(isValidCPF('123456789012')).toBe(false);
  });
  it('rejects bad check digits', () => {
    expect(isValidCPF('52998224724')).toBe(false);
    expect(isValidCPF('12345678900')).toBe(false);
  });
  it('formats correctly', () => {
    expect(formatCPF('52998224725')).toBe('529.982.247-25');
    expect(formatCPF('123')).toBe('123');
  });
  it('mask is progressive', () => {
    expect(maskCPF('529')).toBe('529');
    expect(maskCPF('529982')).toBe('529.982');
    expect(maskCPF('529982247')).toBe('529.982.247');
    expect(maskCPF('52998224725')).toBe('529.982.247-25');
    expect(maskCPF('52998224725999')).toBe('529.982.247-25');
  });
});

describe('CNPJ', () => {
  it('normalizes', () => {
    expect(normalizeCNPJ('12.345.678/0001-90')).toBe('12345678000190');
  });
  it('validates length only', () => {
    expect(isValidCNPJ('12345678000190')).toBe(true);
    expect(isValidCNPJ('123456')).toBe(false);
  });
  it('mask is progressive', () => {
    expect(maskCNPJ('12')).toBe('12');
    expect(maskCNPJ('12345')).toBe('12.345');
    expect(maskCNPJ('12345678')).toBe('12.345.678');
    expect(maskCNPJ('123456780001')).toBe('12.345.678/0001');
    expect(maskCNPJ('12345678000190')).toBe('12.345.678/0001-90');
  });
});

describe('maskPhoneBR', () => {
  it('progressive masking for mobile and landline', () => {
    expect(maskPhoneBR('11')).toBe('(11');
    expect(maskPhoneBR('1199999')).toBe('(11) 9999-9');
    expect(maskPhoneBR('1199998888')).toBe('(11) 9999-8888');
    expect(maskPhoneBR('11999988888')).toBe('(11) 99998-8888');
  });
  it('handles empty', () => {
    expect(maskPhoneBR('')).toBe('');
  });
});