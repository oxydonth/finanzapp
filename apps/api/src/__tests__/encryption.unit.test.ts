import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '../services/encryption.service';

describe('encrypt / decrypt', () => {
  it('round-trips a simple string', () => {
    const plain = 'hello world';
    const enc = encrypt(plain);
    expect(decrypt(enc.ciphertext, enc.iv, enc.tag)).toBe(plain);
  });

  it('round-trips an empty string', () => {
    const enc = encrypt('');
    expect(decrypt(enc.ciphertext, enc.iv, enc.tag)).toBe('');
  });

  it('round-trips a long string', () => {
    const plain = 'a'.repeat(10_000);
    const enc = encrypt(plain);
    expect(decrypt(enc.ciphertext, enc.iv, enc.tag)).toBe(plain);
  });

  it('round-trips unicode characters', () => {
    const plain = 'Passwort: "Straße & café" 🔒';
    const enc = encrypt(plain);
    expect(decrypt(enc.ciphertext, enc.iv, enc.tag)).toBe(plain);
  });

  it('produces different ciphertext for same input (random IV)', () => {
    const enc1 = encrypt('same');
    const enc2 = encrypt('same');
    expect(enc1.iv).not.toBe(enc2.iv);
    expect(enc1.ciphertext).not.toBe(enc2.ciphertext);
  });

  it('returns hex strings for ciphertext, iv, and tag', () => {
    const enc = encrypt('test');
    expect(enc.ciphertext).toMatch(/^[0-9a-f]+$/);
    expect(enc.iv).toMatch(/^[0-9a-f]+$/);
    expect(enc.tag).toMatch(/^[0-9a-f]+$/);
  });

  it('iv is 24 hex chars (12 bytes)', () => {
    const enc = encrypt('test');
    expect(enc.iv).toHaveLength(24);
  });

  it('tag is 32 hex chars (16 bytes)', () => {
    const enc = encrypt('test');
    expect(enc.tag).toHaveLength(32);
  });

  it('throws on tampered ciphertext', () => {
    const enc = encrypt('secret');
    const tampered = enc.ciphertext.slice(0, -2) + '00';
    expect(() => decrypt(tampered, enc.iv, enc.tag)).toThrow();
  });

  it('throws on tampered tag', () => {
    const enc = encrypt('secret');
    const badTag = 'ff'.repeat(16);
    expect(() => decrypt(enc.ciphertext, enc.iv, badTag)).toThrow();
  });

  it('throws on wrong iv', () => {
    const enc = encrypt('secret');
    const badIv = 'aa'.repeat(12);
    expect(() => decrypt(enc.ciphertext, badIv, enc.tag)).toThrow();
  });

  it('handles PIN-like strings', () => {
    const pin = '1234567890';
    const enc = encrypt(pin);
    expect(decrypt(enc.ciphertext, enc.iv, enc.tag)).toBe(pin);
  });

  it('handles URL strings', () => {
    const url = 'https://banking.example.com/fints?v=300';
    const enc = encrypt(url);
    expect(decrypt(enc.ciphertext, enc.iv, enc.tag)).toBe(url);
  });
});
