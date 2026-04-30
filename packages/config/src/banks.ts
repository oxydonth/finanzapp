import { TanMethod } from '@finanzapp/types';

export interface BankRegistryEntry {
  blz: string;
  name: string;
  shortName: string;
  fintsUrl: string;
  fintsVersion: '300';
  supportedTanMethods: TanMethod[];
  logoColor?: string;
}

export const GERMAN_BANKS: Record<string, BankRegistryEntry> = {
  // ── Deutsche Bank ─────────────────────────────────────────────────────────
  '20010020': {
    blz: '20010020',
    name: 'Deutsche Bank Hamburg',
    shortName: 'Deutsche Bank',
    fintsUrl: 'https://www.deutsche-bank.de/cgi/hbci',
    fintsVersion: '300',
    supportedTanMethods: [TanMethod.PUSHTAN, TanMethod.CHIPTAN_QR, TanMethod.SMSTAN],
    logoColor: '#0018A8',
  },
  '10010010': {
    blz: '10010010',
    name: 'Deutsche Bank Berlin',
    shortName: 'Deutsche Bank',
    fintsUrl: 'https://www.deutsche-bank.de/cgi/hbci',
    fintsVersion: '300',
    supportedTanMethods: [TanMethod.PUSHTAN, TanMethod.CHIPTAN_QR, TanMethod.SMSTAN],
    logoColor: '#0018A8',
  },

  // ── Commerzbank ──────────────────────────────────────────────────────────
  '20040000': {
    blz: '20040000',
    name: 'Commerzbank Hamburg',
    shortName: 'Commerzbank',
    fintsUrl: 'https://www.commerzbank.de/home-banking/fints',
    fintsVersion: '300',
    supportedTanMethods: [TanMethod.PUSHTAN, TanMethod.APPTAN, TanMethod.SMSTAN],
    logoColor: '#FFCC33',
  },
  '10040000': {
    blz: '10040000',
    name: 'Commerzbank Berlin',
    shortName: 'Commerzbank',
    fintsUrl: 'https://www.commerzbank.de/home-banking/fints',
    fintsVersion: '300',
    supportedTanMethods: [TanMethod.PUSHTAN, TanMethod.APPTAN, TanMethod.SMSTAN],
    logoColor: '#FFCC33',
  },

  // ── Sparkasse (representative BLZs — regional institutes use same URL pattern) ─
  '20050550': {
    blz: '20050550',
    name: 'Hamburger Sparkasse (Haspa)',
    shortName: 'Sparkasse',
    fintsUrl: 'https://www.haspa.de/fints',
    fintsVersion: '300',
    supportedTanMethods: [TanMethod.PUSHTAN, TanMethod.CHIPTAN_OPTIC, TanMethod.SMSTAN],
    logoColor: '#FF0000',
  },
  '10050000': {
    blz: '10050000',
    name: 'Berliner Sparkasse',
    shortName: 'Sparkasse',
    fintsUrl: 'https://www.berliner-sparkasse.de/fints',
    fintsVersion: '300',
    supportedTanMethods: [TanMethod.PUSHTAN, TanMethod.CHIPTAN_OPTIC, TanMethod.SMSTAN],
    logoColor: '#FF0000',
  },
  '37050198': {
    blz: '37050198',
    name: 'Stadtsparkasse Köln',
    shortName: 'Sparkasse',
    fintsUrl: 'https://www.sparkasse-koelnbonn.de/fints',
    fintsVersion: '300',
    supportedTanMethods: [TanMethod.PUSHTAN, TanMethod.CHIPTAN_OPTIC, TanMethod.SMSTAN],
    logoColor: '#FF0000',
  },
  '60050101': {
    blz: '60050101',
    name: 'Sparkasse Baden-Württemberg',
    shortName: 'Sparkasse',
    fintsUrl: 'https://www.sparkasse-bw.de/fints',
    fintsVersion: '300',
    supportedTanMethods: [TanMethod.PUSHTAN, TanMethod.CHIPTAN_OPTIC, TanMethod.SMSTAN],
    logoColor: '#FF0000',
  },

  // ── Volksbank / Raiffeisenbank (VR-NetWorld) ──────────────────────────────
  '20190003': {
    blz: '20190003',
    name: 'Volksbank Hamburg',
    shortName: 'Volksbank',
    fintsUrl: 'https://hbci11.fiducia.de/cgi-bin/hbciservlet',
    fintsVersion: '300',
    supportedTanMethods: [TanMethod.PUSHTAN, TanMethod.CHIPTAN_OPTIC, TanMethod.CHIPTAN_QR],
    logoColor: '#004A99',
  },
  '10090000': {
    blz: '10090000',
    name: 'Berliner Volksbank',
    shortName: 'Volksbank',
    fintsUrl: 'https://hbci11.fiducia.de/cgi-bin/hbciservlet',
    fintsVersion: '300',
    supportedTanMethods: [TanMethod.PUSHTAN, TanMethod.CHIPTAN_OPTIC, TanMethod.CHIPTAN_QR],
    logoColor: '#004A99',
  },

  // ── ING Germany ──────────────────────────────────────────────────────────
  '50010517': {
    blz: '50010517',
    name: 'ING-DiBa',
    shortName: 'ING',
    fintsUrl: 'https://fints.ing-diba.de/fints/',
    fintsVersion: '300',
    supportedTanMethods: [TanMethod.PUSHTAN, TanMethod.SMSTAN],
    logoColor: '#FF6200',
  },

  // ── DKB (Deutsche Kreditbank) ─────────────────────────────────────────────
  '12030000': {
    blz: '12030000',
    name: 'Deutsche Kreditbank (DKB)',
    shortName: 'DKB',
    fintsUrl: 'https://www.dkb.de/banking/fints',
    fintsVersion: '300',
    supportedTanMethods: [TanMethod.PUSHTAN, TanMethod.CHIPTAN_QR, TanMethod.SMSTAN],
    logoColor: '#005AA0',
  },

  // ── N26 ───────────────────────────────────────────────────────────────────
  '10011001': {
    blz: '10011001',
    name: 'N26 Bank',
    shortName: 'N26',
    fintsUrl: 'https://fints.tech26.de/fints',
    fintsVersion: '300',
    supportedTanMethods: [TanMethod.PUSHTAN, TanMethod.SMSTAN],
    logoColor: '#00CCFF',
  },

  // ── Comdirect (Commerzbank subsidiary) ───────────────────────────────────
  '20041133': {
    blz: '20041133',
    name: 'comdirect bank',
    shortName: 'Comdirect',
    fintsUrl: 'https://fints.comdirect.de/fints',
    fintsVersion: '300',
    supportedTanMethods: [TanMethod.PUSHTAN, TanMethod.CHIPTAN_OPTIC, TanMethod.SMSTAN],
    logoColor: '#FFCC00',
  },

  // ── Postbank ──────────────────────────────────────────────────────────────
  '20010020': {
    blz: '20010020',
    name: 'Postbank Hamburg',
    shortName: 'Postbank',
    fintsUrl: 'https://banking.postbank.de/fints',
    fintsVersion: '300',
    supportedTanMethods: [TanMethod.PUSHTAN, TanMethod.CHIPTAN_OPTIC, TanMethod.SMSTAN],
    logoColor: '#FFCC00',
  },
  '10010010': {
    blz: '10010010',
    name: 'Postbank Berlin',
    shortName: 'Postbank',
    fintsUrl: 'https://banking.postbank.de/fints',
    fintsVersion: '300',
    supportedTanMethods: [TanMethod.PUSHTAN, TanMethod.CHIPTAN_OPTIC, TanMethod.SMSTAN],
    logoColor: '#FFCC00',
  },

  // ── HypoVereinsbank (UniCredit) ───────────────────────────────────────────
  '70020270': {
    blz: '70020270',
    name: 'HypoVereinsbank München',
    shortName: 'HVB',
    fintsUrl: 'https://fints.hypovereinsbank.de/fints',
    fintsVersion: '300',
    supportedTanMethods: [TanMethod.PUSHTAN, TanMethod.CHIPTAN_OPTIC, TanMethod.SMSTAN],
    logoColor: '#C8102E',
  },

  // ── Targobank ─────────────────────────────────────────────────────────────
  '30020900': {
    blz: '30020900',
    name: 'Targobank',
    shortName: 'Targobank',
    fintsUrl: 'https://fints.targobank.de/fints',
    fintsVersion: '300',
    supportedTanMethods: [TanMethod.PUSHTAN, TanMethod.SMSTAN, TanMethod.CHIPTAN_OPTIC],
    logoColor: '#007AB8',
  },

  // ── Norisbank ─────────────────────────────────────────────────────────────
  '76026000': {
    blz: '76026000',
    name: 'Norisbank',
    shortName: 'Norisbank',
    fintsUrl: 'https://www.norisbank.de/fints',
    fintsVersion: '300',
    supportedTanMethods: [TanMethod.PUSHTAN, TanMethod.SMSTAN],
    logoColor: '#E40428',
  },

  // ── Santander Germany ─────────────────────────────────────────────────────
  '31010833': {
    blz: '31010833',
    name: 'Santander Bank Deutschland',
    shortName: 'Santander',
    fintsUrl: 'https://fints.santander.de/fints',
    fintsVersion: '300',
    supportedTanMethods: [TanMethod.PUSHTAN, TanMethod.SMSTAN],
    logoColor: '#EC0000',
  },
};

export function findBankByBlz(blz: string): BankRegistryEntry | undefined {
  return GERMAN_BANKS[blz];
}

export function searchBanks(query: string): BankRegistryEntry[] {
  const q = query.toLowerCase();
  return Object.values(GERMAN_BANKS).filter(
    (b) =>
      b.blz.includes(q) ||
      b.name.toLowerCase().includes(q) ||
      b.shortName.toLowerCase().includes(q),
  );
}

export function getAllBanks(): BankRegistryEntry[] {
  const seen = new Set<string>();
  return Object.values(GERMAN_BANKS).filter((b) => {
    const key = b.shortName;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
