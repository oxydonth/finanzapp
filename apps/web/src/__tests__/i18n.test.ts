import { describe, it, expect, beforeAll } from 'vitest';
import i18n from '../lib/i18n';

const SUPPORTED_LANGUAGES = [
  'de', 'en', 'fr', 'es', 'it', 'pt', 'nl', 'pl', 'cs', 'sk', 'hu', 'ro',
  'bg', 'hr', 'sr', 'sl', 'da', 'nb', 'sv', 'fi', 'et', 'lv', 'lt', 'el',
  'sq', 'mk', 'bs', 'ca', 'cy', 'ga', 'mt', 'is', 'tr', 'ru', 'uk', 'be', 'fa',
];

const REQUIRED_KEYS = [
  'nav.dashboard', 'nav.accounts', 'nav.transactions', 'nav.categories',
  'nav.budget', 'nav.statistics', 'nav.banks', 'nav.settings', 'nav.logout',
  'dashboard.title', 'dashboard.netWorth', 'dashboard.assets', 'dashboard.liabilities',
  'dashboard.income', 'dashboard.expenses', 'dashboard.budgets', 'dashboard.showAll',
  'dashboard.noBudgets', 'dashboard.createBudget', 'dashboard.recentTransactions', 'dashboard.unknown',
  'auth.welcomeBack', 'auth.signIn', 'auth.email', 'auth.password', 'auth.loginFailed',
  'auth.twoFactor', 'auth.authCode', 'auth.confirm', 'auth.backToLogin', 'auth.invalidCode',
  'auth.createAccount', 'auth.firstName', 'auth.lastName', 'auth.registrationFailed',
  'settings.title', 'settings.profile', 'settings.twoFactor', 'settings.enableMfa',
  'settings.mfaSuccess', 'settings.disableMfa', 'settings.language', 'settings.invalidCode',
  'transactions.title', 'transactions.search', 'transactions.all', 'transactions.income',
  'transactions.expenses', 'transactions.loading', 'transactions.noTransactions',
  'transactions.date', 'transactions.category', 'transactions.amount',
  'budget.title', 'budget.loading', 'budget.spent', 'budget.remaining', 'budget.noBudgets',
  'accounts.title', 'accounts.totalBalance', 'accounts.loading', 'accounts.active',
  'accounts.noAccounts', 'accounts.connectBank',
  'categories.title', 'categories.description', 'categories.loading',
  'categories.customCategories', 'categories.systemCategories', 'categories.add',
  'statistics.title', 'statistics.expenses', 'statistics.income', 'statistics.savings',
  'statistics.assets', 'statistics.autoCategorize', 'statistics.noExpenses',
  'banks.title', 'banks.connectBank', 'banks.loading', 'banks.noBanks', 'banks.sync',
  'banks.disconnect', 'banks.disconnectConfirm', 'banks.never',
  'connectBank.title', 'connectBank.connect', 'connectBank.successTitle',
  'connectBank.successDesc', 'connectBank.connectionFailed',
];

beforeAll(async () => {
  await i18n.init;
});

describe('i18n initialization', () => {
  it('initializes successfully', () => {
    expect(i18n.isInitialized).toBe(true);
  });

  it('has German as fallback language', () => {
    const fallback = i18n.options.fallbackLng;
    const normalized = Array.isArray(fallback) ? fallback[0] : fallback;
    expect(normalized).toBe('de');
  });

  it('has all 37 supported languages loaded', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(i18n.hasResourceBundle(lang, 'common'), `Missing resource bundle for: ${lang}`).toBe(true);
    }
  });
});

describe('translation completeness', () => {
  for (const lang of SUPPORTED_LANGUAGES) {
    describe(`${lang} translations`, () => {
      it('has all required keys', () => {
        i18n.changeLanguage(lang);
        for (const key of REQUIRED_KEYS) {
          const value = i18n.t(key);
          expect(value, `[${lang}] missing key: ${key}`).not.toBe(key);
          expect(value, `[${lang}] empty value for: ${key}`).toBeTruthy();
        }
      });

      it('returns non-empty string for nav keys', () => {
        i18n.changeLanguage(lang);
        const navKeys = ['nav.dashboard', 'nav.accounts', 'nav.transactions', 'nav.logout'];
        for (const key of navKeys) {
          expect(typeof i18n.t(key)).toBe('string');
          expect(i18n.t(key).length).toBeGreaterThan(0);
        }
      });
    });
  }
});

describe('interpolation', () => {
  it('interpolates page variables in German', () => {
    i18n.changeLanguage('de');
    const result = i18n.t('transactions.page', { page: 2, total: 5 });
    expect(result).toContain('2');
    expect(result).toContain('5');
  });

  it('interpolates page variables in English', () => {
    i18n.changeLanguage('en');
    const result = i18n.t('transactions.page', { page: 3, total: 10 });
    expect(result).toContain('3');
    expect(result).toContain('10');
  });

  it('interpolates amount in uncategorized_amount', () => {
    i18n.changeLanguage('de');
    const result = i18n.t('statistics.uncategorized_amount', { amount: '€50.00' });
    expect(result).toContain('€50.00');
  });
});

describe('pluralization', () => {
  it('handles categorized count plurals in German', () => {
    i18n.changeLanguage('de');
    const singular = i18n.t('statistics.categorized', { count: 1 });
    const plural = i18n.t('statistics.categorized', { count: 5 });
    expect(typeof singular).toBe('string');
    expect(typeof plural).toBe('string');
  });

  it('handles categorized count plurals in Polish', () => {
    i18n.changeLanguage('pl');
    const one = i18n.t('statistics.categorized', { count: 1 });
    const few = i18n.t('statistics.categorized', { count: 3 });
    const many = i18n.t('statistics.categorized', { count: 10 });
    expect(typeof one).toBe('string');
    expect(typeof few).toBe('string');
    expect(typeof many).toBe('string');
  });

  it('handles categorized count plurals in Russian', () => {
    i18n.changeLanguage('ru');
    const one = i18n.t('statistics.categorized', { count: 1 });
    const few = i18n.t('statistics.categorized', { count: 3 });
    const many = i18n.t('statistics.categorized', { count: 11 });
    expect(typeof one).toBe('string');
    expect(typeof few).toBe('string');
    expect(typeof many).toBe('string');
  });
});

describe('RTL language', () => {
  it('has Farsi translations loaded', () => {
    expect(i18n.hasResourceBundle('fa', 'common')).toBe(true);
  });

  it('Farsi nav.dashboard is not empty', () => {
    i18n.changeLanguage('fa');
    expect(i18n.t('nav.dashboard').length).toBeGreaterThan(0);
  });
});
