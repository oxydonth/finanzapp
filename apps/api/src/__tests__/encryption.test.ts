import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '../services/encryption.service';

describe('encrypt / decrypt', () => {
  it('returns ciphertext, iv, tag', () => {
    const result = encrypt('hello world');
    expect(result).toHaveProperty('ciphertext');
    expect(result).toHaveProperty('iv');
    expect(result).toHaveProperty('tag');
  });

  it('ciphertext differs from plaintext', () => {
    const { ciphertext } = encrypt('secret data');
    expect(ciphertext).not.toBe('secret data');
  });

  it('round-trips correctly', () => {
    const plaintext = 'my-bank-pin-1234';
    const { ciphertext, iv, tag } = encrypt(plaintext);
    expect(decrypt(ciphertext, iv, tag)).toBe(plaintext);
  });

  it('produces different ciphertext for same input (random IV)', () => {
    const a = encrypt('same input');
    const b = encrypt('same input');
    expect(a.ciphertext).not.toBe(b.ciphertext);
    expect(a.iv).not.toBe(b.iv);
  });

  it('both results decrypt to same plaintext', () => {
    const plaintext = 'reuse test';
    const a = encrypt(plaintext);
    const b = encrypt(plaintext);
    expect(decrypt(a.ciphertext, a.iv, a.tag)).toBe(plaintext);
    expect(decrypt(b.ciphertext, b.iv, b.tag)).toBe(plaintext);
  });

  it('throws on tampered ciphertext', () => {
    const { ciphertext, iv, tag } = encrypt('tamper me');
    const tampered = ciphertext.slice(0, -2) + 'ff';
    expect(() => decrypt(tampered, iv, tag)).toThrow();
  });

  it('throws on wrong tag', () => {
    const { ciphertext, iv } = encrypt('tag test');
    const wrongTag = 'a'.repeat(32);
    expect(() => decrypt(ciphertext, iv, wrongTag)).toThrow();
  });

  it('handles unicode and special chars', () => {
    const plaintext = 'Ünïcödé & 日本語 🔑';
    const { ciphertext, iv, tag } = encrypt(plaintext);
    expect(decrypt(ciphertext, iv, tag)).toBe(plaintext);
  });

  it('handles empty string', () => {
    const { ciphertext, iv, tag } = encrypt('');
    expect(decrypt(ciphertext, iv, tag)).toBe('');
  });
});
