import { describe, expect, it } from 'vitest';
import { validateLead, LIMITS } from '../src/form/validate.js';

const valid = {
  name: 'Анна',
  contact: '+7 999 123-45-67',
  wall: '2,5 × 1,2 м',
  consent: true,
  website: '',
};

describe('validateLead', () => {
  it('accepts a complete valid lead', () => {
    const result = validateLead(valid);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('rejects an empty name', () => {
    const result = validateLead({ ...valid, name: '  ' });
    expect(result.valid).toBe(false);
    expect(result.errors.name).toBeTruthy();
  });

  it.each(['+7 999 123-45-67', '89991234567', '@name_1', 'a@b.ru'])(
    'accepts contact %s',
    (contact) => {
      expect(validateLead({ ...valid, contact }).valid).toBe(true);
    },
  );

  it.each(['abc', '123', '@ab', 'a@b', ''])('rejects contact "%s"', (contact) => {
    const result = validateLead({ ...valid, contact });
    expect(result.valid).toBe(false);
    expect(result.errors.contact).toBeTruthy();
  });

  it('allows an empty wall size', () => {
    expect(validateLead({ ...valid, wall: '' }).valid).toBe(true);
  });

  it('rejects a wall description that is too long', () => {
    const wall = 'x'.repeat(LIMITS.wallMax + 1);
    const result = validateLead({ ...valid, wall });
    expect(result.valid).toBe(false);
    expect(result.errors.wall).toBeTruthy();
  });

  it('requires consent', () => {
    const result = validateLead({ ...valid, consent: false });
    expect(result.valid).toBe(false);
    expect(result.errors.consent).toBeTruthy();
  });

  it('flags a filled honeypot as spam', () => {
    const result = validateLead({ ...valid, website: 'http://spam' });
    expect(result.valid).toBe(false);
    expect(result.spam).toBe(true);
  });

  it('does not mutate its input', () => {
    const input = Object.freeze({ ...valid });
    expect(() => validateLead(input)).not.toThrow();
  });
});
