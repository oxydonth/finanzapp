import { describe, it, expect } from 'vitest';
import { SYSTEM_CATEGORIES } from '../categories';

describe('SYSTEM_CATEGORIES', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(SYSTEM_CATEGORIES)).toBe(true);
    expect(SYSTEM_CATEGORIES.length).toBeGreaterThan(0);
  });

  it('every top-level category has required fields', () => {
    for (const cat of SYSTEM_CATEGORIES) {
      expect(cat.id, `${cat.name} missing id`).toBeTruthy();
      expect(cat.name, `${cat.id} missing name`).toBeTruthy();
      expect(cat.icon, `${cat.id} missing icon`).toBeTruthy();
      expect(cat.color, `${cat.id} missing color`).toBeTruthy();
      expect(typeof cat.isIncome, `${cat.id} isIncome not boolean`).toBe('boolean');
    }
  });

  it('has no duplicate top-level IDs', () => {
    const ids = SYSTEM_CATEGORIES.map((c) => c.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('has no duplicate IDs across all categories and children', () => {
    const ids: string[] = [];
    for (const cat of SYSTEM_CATEGORIES) {
      ids.push(cat.id);
      if (cat.children) ids.push(...cat.children.map((c) => c.id));
    }
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('children inherit isIncome from parent', () => {
    for (const cat of SYSTEM_CATEGORIES) {
      if (cat.children) {
        for (const child of cat.children) {
          expect(child.isIncome).toBe(cat.isIncome);
        }
      }
    }
  });

  it('color values are valid hex colors', () => {
    const hexColor = /^#[0-9A-Fa-f]{6}$/;
    for (const cat of SYSTEM_CATEGORIES) {
      expect(hexColor.test(cat.color), `${cat.id} color "${cat.color}" invalid`).toBe(true);
      if (cat.children) {
        for (const child of cat.children) {
          expect(hexColor.test(child.color), `${child.id} color "${child.color}" invalid`).toBe(true);
        }
      }
    }
  });

  it('contains expected top-level categories', () => {
    const ids = SYSTEM_CATEGORIES.map((c) => c.id);
    expect(ids).toContain('income');
    expect(ids).toContain('housing');
    expect(ids).toContain('food');
    expect(ids).toContain('transport');
    expect(ids).toContain('health');
    expect(ids).toContain('other');
  });

  it('income category has isIncome=true', () => {
    const income = SYSTEM_CATEGORIES.find((c) => c.id === 'income');
    expect(income?.isIncome).toBe(true);
  });

  it('expense categories have isIncome=false', () => {
    const expenseIds = ['housing', 'food', 'transport', 'health', 'entertainment', 'shopping'];
    for (const id of expenseIds) {
      const cat = SYSTEM_CATEGORIES.find((c) => c.id === id);
      expect(cat?.isIncome, `${id} should have isIncome=false`).toBe(false);
    }
  });

  it('other category has no children', () => {
    const other = SYSTEM_CATEGORIES.find((c) => c.id === 'other');
    expect(other).toBeDefined();
    expect(other?.children).toBeUndefined();
  });
});
