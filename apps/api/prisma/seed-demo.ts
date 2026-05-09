import { PrismaClient, AccountType, TransactionType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ── helpers ──────────────────────────────────────────────────────────────────

function d(year: number, month: number, day: number) {
  return new Date(year, month - 1, day);
}

function tx(
  userId: string,
  bankAccountId: string,
  categoryId: string | null,
  date: Date,
  amountCents: number,
  type: TransactionType,
  opts: {
    creditorName?: string;
    purpose?: string;
    merchantName?: string;
    isRecurring?: boolean;
    externalId: string;
  },
) {
  return {
    userId,
    bankAccountId,
    categoryId,
    externalId: opts.externalId,
    valueDate: date,
    bookingDate: date,
    amountCents: BigInt(amountCents),
    currency: 'EUR',
    type,
    creditorName: opts.creditorName,
    purpose: opts.purpose,
    merchantName: opts.merchantName,
    isRecurring: opts.isRecurring ?? false,
    isReviewed: false,
    isPending: false,
    tags: [],
  };
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱  Seeding demo data...');

  // ── Demo user ─────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Demo1234!', 12);

  const user = await prisma.user.upsert({
    where: { email: 'anna@demo.finanzapp.de' },
    update: {},
    create: {
      email: 'anna@demo.finanzapp.de',
      passwordHash,
      firstName: 'Anna',
      lastName: 'Müller',
      currency: 'EUR',
      locale: 'de-DE',
      isEmailVerified: true,
    },
  });

  console.log(`✅  User: ${user.email}  (password: Demo1234!)`);

  // ── Bank connections ──────────────────────────────────────────────────────
  const sparkasse = await prisma.bankConnection.upsert({
    where: { id: 'demo-conn-sparkasse' },
    update: {},
    create: {
      id: 'demo-conn-sparkasse',
      userId: user.id,
      bankCode: '10050000',
      bankName: 'Sparkasse Berlin',
      fintsUrl: 'https://banking-be3.s-fints-pt-be.de/fints30',
      loginNameEncrypted: 'DEMO_ENCRYPTED',
      pinEncrypted: 'DEMO_ENCRYPTED',
      pinIv: 'DEMO_IV',
      syncStatus: 'SUCCESS',
      lastSyncAt: new Date(),
    },
  });

  const deutschebank = await prisma.bankConnection.upsert({
    where: { id: 'demo-conn-deutschebank' },
    update: {},
    create: {
      id: 'demo-conn-deutschebank',
      userId: user.id,
      bankCode: '10070024',
      bankName: 'Deutsche Bank',
      fintsUrl: 'https://mbs.postbank.de/banking/init.do',
      loginNameEncrypted: 'DEMO_ENCRYPTED',
      pinEncrypted: 'DEMO_ENCRYPTED',
      pinIv: 'DEMO_IV',
      syncStatus: 'SUCCESS',
      lastSyncAt: new Date(),
    },
  });

  // ── Accounts ──────────────────────────────────────────────────────────────
  const giro = await prisma.bankAccount.upsert({
    where: { id: 'demo-acc-giro' },
    update: { balanceCents: BigInt(284732) },
    create: {
      id: 'demo-acc-giro',
      userId: user.id,
      bankConnectionId: sparkasse.id,
      iban: 'DE89100500001234567890',
      ibanMasked: 'DE89 **** **** **** 7890',
      bic: 'BELADEBEXXX',
      accountType: AccountType.CHECKING,
      accountName: 'Girokonto',
      ownerName: 'Anna Müller',
      balanceCents: BigInt(284732),
      balanceDate: new Date(),
      sortOrder: 0,
    },
  });

  const savings = await prisma.bankAccount.upsert({
    where: { id: 'demo-acc-savings' },
    update: { balanceCents: BigInt(1250000) },
    create: {
      id: 'demo-acc-savings',
      userId: user.id,
      bankConnectionId: sparkasse.id,
      iban: 'DE89100500009876543210',
      ibanMasked: 'DE89 **** **** **** 3210',
      bic: 'BELADEBEXXX',
      accountType: AccountType.SAVINGS,
      accountName: 'Tagesgeldkonto',
      ownerName: 'Anna Müller',
      balanceCents: BigInt(1250000),
      balanceDate: new Date(),
      sortOrder: 1,
    },
  });

  const creditcard = await prisma.bankAccount.upsert({
    where: { id: 'demo-acc-cc' },
    update: { balanceCents: BigInt(-34218) },
    create: {
      id: 'demo-acc-cc',
      userId: user.id,
      bankConnectionId: deutschebank.id,
      iban: 'DE12100700240987654321',
      ibanMasked: 'DE12 **** **** **** 4321',
      bic: 'DEUTDEDB',
      accountType: AccountType.CREDIT_CARD,
      accountName: 'Visa Gold',
      ownerName: 'Anna Müller',
      balanceCents: BigInt(-34218),
      balanceDate: new Date(),
      sortOrder: 2,
    },
  });

  const depot = await prisma.bankAccount.upsert({
    where: { id: 'demo-acc-depot' },
    update: { balanceCents: BigInt(823400) },
    create: {
      id: 'demo-acc-depot',
      userId: user.id,
      bankConnectionId: deutschebank.id,
      iban: 'DE56100700241234598765',
      ibanMasked: 'DE56 **** **** **** 8765',
      bic: 'DEUTDEDB',
      accountType: AccountType.DEPOT,
      accountName: 'ETF Depot',
      ownerName: 'Anna Müller',
      balanceCents: BigInt(823400),
      balanceDate: new Date(),
      sortOrder: 3,
    },
  });

  console.log('✅  Bank connections & accounts created');

  // ── Transactions ──────────────────────────────────────────────────────────
  // Delete existing demo transactions to avoid unique constraint errors on re-seed
  await prisma.transaction.deleteMany({
    where: { userId: user.id },
  });

  const txData = [
    // ── February 2026 ────────────────────────────────────────────────────
    tx(user.id, giro.id, 'income-salary', d(2026,2,1), 320000, 'CREDIT', { externalId: 'demo-feb-salary', creditorName: 'ACME GmbH', purpose: 'Gehalt Februar 2026', isRecurring: true }),
    tx(user.id, giro.id, 'housing-rent', d(2026,2,2), 95000, 'DEBIT', { externalId: 'demo-feb-rent', creditorName: 'Hausverwaltung Mitte GmbH', purpose: 'Miete Februar 2026 RE-2026-02', isRecurring: true }),
    tx(user.id, giro.id, 'transport-public', d(2026,2,2), 8600, 'DEBIT', { externalId: 'demo-feb-bvg', creditorName: 'BVG Berlin', purpose: 'Monatskarte Februar', isRecurring: true }),
    tx(user.id, giro.id, 'health-insurance', d(2026,2,5), 18000, 'DEBIT', { externalId: 'demo-feb-tk', creditorName: 'Techniker Krankenkasse', purpose: 'Krankenversicherung Feb 2026', isRecurring: true }),
    tx(user.id, giro.id, 'health-sports', d(2026,2,5), 2990, 'DEBIT', { externalId: 'demo-feb-gym', creditorName: 'FitnesFirst Berlin', purpose: 'Monatsbeitrag Februar', isRecurring: true }),
    tx(user.id, giro.id, 'food-groceries', d(2026,2,5), 5240, 'DEBIT', { externalId: 'demo-feb-rewe1', merchantName: 'REWE', purpose: 'REWE SAGT DANKE 5234' }),
    tx(user.id, giro.id, 'food-cafe', d(2026,2,6), 680, 'DEBIT', { externalId: 'demo-feb-starbucks1', merchantName: 'Starbucks', purpose: 'STARBUCKS COFFEE' }),
    tx(user.id, giro.id, 'food-groceries', d(2026,2,8), 2180, 'DEBIT', { externalId: 'demo-feb-aldi1', merchantName: 'Aldi', purpose: 'ALDI SUED 1234' }),
    tx(user.id, giro.id, 'housing-utilities', d(2026,2,10), 3999, 'DEBIT', { externalId: 'demo-feb-telekom', creditorName: 'Deutsche Telekom', purpose: 'Rechnung Feb 2026 Kundennummer 1234567', isRecurring: true }),
    tx(user.id, giro.id, 'housing-utilities', d(2026,2,10), 2999, 'DEBIT', { externalId: 'demo-feb-o2', creditorName: 'Telefónica Germany GmbH', purpose: 'O2 Mobilfunk Feb 2026', isRecurring: true }),
    tx(user.id, giro.id, 'food-restaurant', d(2026,2,11), 2340, 'DEBIT', { externalId: 'demo-feb-resto1', merchantName: 'Vapiano Berlin Mitte', purpose: 'VAPIANO BERLIN' }),
    tx(user.id, giro.id, 'entertainment-streaming', d(2026,2,12), 1799, 'DEBIT', { externalId: 'demo-feb-netflix', creditorName: 'Netflix International', purpose: 'NETFLIX.COM', isRecurring: true }),
    tx(user.id, giro.id, 'entertainment-music', d(2026,2,12), 1099, 'DEBIT', { externalId: 'demo-feb-spotify', creditorName: 'Spotify AB', purpose: 'Spotify Premium', isRecurring: true }),
    tx(user.id, giro.id, 'food-groceries', d(2026,2,13), 6780, 'DEBIT', { externalId: 'demo-feb-edeka1', merchantName: 'EDEKA', purpose: 'EDEKA ZWE 5678' }),
    tx(user.id, giro.id, 'shopping-online', d(2026,2,14), 3490, 'DEBIT', { externalId: 'demo-feb-amazon1', creditorName: 'Amazon EU S.a.r.l.', purpose: 'Amazon.de Bestellung 123-4567890' }),
    tx(user.id, giro.id, 'entertainment-streaming', d(2026,2,15), 899, 'DEBIT', { externalId: 'demo-feb-prime', creditorName: 'Amazon EU S.a.r.l.', purpose: 'Amazon Prime Mitgliedschaft', isRecurring: true }),
    tx(user.id, giro.id, 'food-cafe', d(2026,2,17), 450, 'DEBIT', { externalId: 'demo-feb-bakery1', merchantName: 'Bäckerei Müller', purpose: 'BAECKEREI MUELLER' }),
    tx(user.id, giro.id, 'food-groceries', d(2026,2,18), 4120, 'DEBIT', { externalId: 'demo-feb-rewe2', merchantName: 'REWE', purpose: 'REWE SAGT DANKE 5234' }),
    tx(user.id, giro.id, 'transport-car', d(2026,2,19), 7200, 'DEBIT', { externalId: 'demo-feb-aral', merchantName: 'Aral Tankstelle', purpose: 'ARAL BERLIN MITTE' }),
    tx(user.id, giro.id, 'food-delivery', d(2026,2,20), 2890, 'DEBIT', { externalId: 'demo-feb-lieferando1', merchantName: 'Lieferando', purpose: 'LIEFERANDO.DE BESTELLUNG' }),
    tx(user.id, giro.id, 'food-restaurant', d(2026,2,22), 1850, 'DEBIT', { externalId: 'demo-feb-sushi1', merchantName: 'Sushi Circle', purpose: 'SUSHI CIRCLE BERLIN' }),
    tx(user.id, giro.id, 'food-groceries', d(2026,2,23), 1990, 'DEBIT', { externalId: 'demo-feb-lidl1', merchantName: 'Lidl', purpose: 'LIDL DIENSTLEISTUNG 9876' }),
    tx(user.id, giro.id, 'shopping-clothing', d(2026,2,24), 8990, 'DEBIT', { externalId: 'demo-feb-zalando1', creditorName: 'Zalando SE', purpose: 'Zalando Bestellung 987-654321' }),
    tx(user.id, giro.id, 'health-pharmacy', d(2026,2,25), 1240, 'DEBIT', { externalId: 'demo-feb-apo1', merchantName: 'DM Drogerie', purpose: 'DM DROGERIE MARKT' }),
    tx(user.id, giro.id, 'food-groceries', d(2026,2,26), 5540, 'DEBIT', { externalId: 'demo-feb-rewe3', merchantName: 'REWE', purpose: 'REWE SAGT DANKE 5234' }),
    tx(user.id, giro.id, 'taxes-fees', d(2026,2,28), 1836, 'DEBIT', { externalId: 'demo-feb-gez', creditorName: 'Rundfunk ARD ZDF', purpose: 'Rundfunkbeitrag 01/2026–03/2026', isRecurring: true }),
    tx(user.id, savings.id, 'savings-savings', d(2026,2,1), 30000, 'CREDIT', { externalId: 'demo-feb-savings-in', creditorName: 'Sparkasse Berlin', purpose: 'Zinsgutschrift Januar 2026' }),
    tx(user.id, depot.id, 'savings-etf', d(2026,2,3), 50000, 'DEBIT', { externalId: 'demo-feb-etf', creditorName: 'Deutsche Bank Securities', purpose: 'Sparplan iShares MSCI World ETF', isRecurring: true }),

    // ── March 2026 ──────────────────────────────────────────────────────
    tx(user.id, giro.id, 'income-salary', d(2026,3,2), 320000, 'CREDIT', { externalId: 'demo-mar-salary', creditorName: 'ACME GmbH', purpose: 'Gehalt März 2026', isRecurring: true }),
    tx(user.id, giro.id, 'housing-rent', d(2026,3,3), 95000, 'DEBIT', { externalId: 'demo-mar-rent', creditorName: 'Hausverwaltung Mitte GmbH', purpose: 'Miete März 2026 RE-2026-03', isRecurring: true }),
    tx(user.id, giro.id, 'transport-public', d(2026,3,3), 8600, 'DEBIT', { externalId: 'demo-mar-bvg', creditorName: 'BVG Berlin', purpose: 'Monatskarte März', isRecurring: true }),
    tx(user.id, giro.id, 'health-insurance', d(2026,3,5), 18000, 'DEBIT', { externalId: 'demo-mar-tk', creditorName: 'Techniker Krankenkasse', purpose: 'Krankenversicherung Mrz 2026', isRecurring: true }),
    tx(user.id, giro.id, 'health-sports', d(2026,3,5), 2990, 'DEBIT', { externalId: 'demo-mar-gym', creditorName: 'FitnesFirst Berlin', purpose: 'Monatsbeitrag März', isRecurring: true }),
    tx(user.id, giro.id, 'food-groceries', d(2026,3,5), 7320, 'DEBIT', { externalId: 'demo-mar-rewe1', merchantName: 'REWE', purpose: 'REWE SAGT DANKE 5234' }),
    tx(user.id, giro.id, 'food-cafe', d(2026,3,7), 560, 'DEBIT', { externalId: 'demo-mar-coffee1', merchantName: 'Coffee Fellows', purpose: 'COFFEE FELLOWS BERLIN' }),
    tx(user.id, giro.id, 'food-groceries', d(2026,3,8), 3450, 'DEBIT', { externalId: 'demo-mar-aldi1', merchantName: 'Aldi', purpose: 'ALDI SUED 1234' }),
    tx(user.id, giro.id, 'housing-utilities', d(2026,3,10), 3999, 'DEBIT', { externalId: 'demo-mar-telekom', creditorName: 'Deutsche Telekom', purpose: 'Rechnung Mrz 2026 Kundennummer 1234567', isRecurring: true }),
    tx(user.id, giro.id, 'housing-utilities', d(2026,3,10), 2999, 'DEBIT', { externalId: 'demo-mar-o2', creditorName: 'Telefónica Germany GmbH', purpose: 'O2 Mobilfunk Mrz 2026', isRecurring: true }),
    tx(user.id, giro.id, 'food-restaurant', d(2026,3,11), 4560, 'DEBIT', { externalId: 'demo-mar-resto1', merchantName: 'Nobelhart & Schmutzig', purpose: 'NOBELHART SCHMUTZIG' }),
    tx(user.id, giro.id, 'entertainment-streaming', d(2026,3,12), 1799, 'DEBIT', { externalId: 'demo-mar-netflix', creditorName: 'Netflix International', purpose: 'NETFLIX.COM', isRecurring: true }),
    tx(user.id, giro.id, 'entertainment-music', d(2026,3,12), 1099, 'DEBIT', { externalId: 'demo-mar-spotify', creditorName: 'Spotify AB', purpose: 'Spotify Premium', isRecurring: true }),
    tx(user.id, giro.id, 'food-groceries', d(2026,3,14), 5890, 'DEBIT', { externalId: 'demo-mar-edeka1', merchantName: 'EDEKA', purpose: 'EDEKA ZWE 5678' }),
    tx(user.id, giro.id, 'entertainment-streaming', d(2026,3,15), 899, 'DEBIT', { externalId: 'demo-mar-prime', creditorName: 'Amazon EU S.a.r.l.', purpose: 'Amazon Prime Mitgliedschaft', isRecurring: true }),
    tx(user.id, giro.id, 'shopping-electronics', d(2026,3,15), 12990, 'DEBIT', { externalId: 'demo-mar-saturn', merchantName: 'MediaMarkt', purpose: 'MEDIAMARKT BERLIN TEMPELHOF' }),
    tx(user.id, giro.id, 'food-groceries', d(2026,3,17), 2670, 'DEBIT', { externalId: 'demo-mar-rewe2', merchantName: 'REWE', purpose: 'REWE SAGT DANKE 5234' }),
    tx(user.id, giro.id, 'transport-taxi', d(2026,3,18), 1890, 'DEBIT', { externalId: 'demo-mar-uber1', merchantName: 'Uber', purpose: 'UBER TRIP 3F8A2B' }),
    tx(user.id, giro.id, 'food-delivery', d(2026,3,19), 3150, 'DEBIT', { externalId: 'demo-mar-lieferando1', merchantName: 'Lieferando', purpose: 'LIEFERANDO.DE BESTELLUNG' }),
    tx(user.id, giro.id, 'health-doctor', d(2026,3,20), 2800, 'DEBIT', { externalId: 'demo-mar-doctor1', creditorName: 'Dr. med. Schmidt Praxis', purpose: 'Arztrechnung Praxisgebühr' }),
    tx(user.id, giro.id, 'food-groceries', d(2026,3,21), 4120, 'DEBIT', { externalId: 'demo-mar-lidl1', merchantName: 'Lidl', purpose: 'LIDL DIENSTLEISTUNG 9876' }),
    tx(user.id, giro.id, 'food-cafe', d(2026,3,22), 890, 'DEBIT', { externalId: 'demo-mar-starbucks1', merchantName: 'Starbucks', purpose: 'STARBUCKS COFFEE' }),
    tx(user.id, giro.id, 'food-restaurant', d(2026,3,25), 2960, 'DEBIT', { externalId: 'demo-mar-pizza1', merchantName: 'Pizzeria da Luigi', purpose: 'DA LUIGI PIZZERIA' }),
    tx(user.id, giro.id, 'shopping-online', d(2026,3,26), 5490, 'DEBIT', { externalId: 'demo-mar-amazon1', creditorName: 'Amazon EU S.a.r.l.', purpose: 'Amazon.de Bestellung 234-5678901' }),
    tx(user.id, giro.id, 'food-groceries', d(2026,3,27), 6130, 'DEBIT', { externalId: 'demo-mar-rewe3', merchantName: 'REWE', purpose: 'REWE SAGT DANKE 5234' }),
    tx(user.id, giro.id, 'health-pharmacy', d(2026,3,28), 890, 'DEBIT', { externalId: 'demo-mar-apo1', merchantName: 'Apotheke am Markt', purpose: 'APOTHEKE AM MARKT' }),
    tx(user.id, depot.id, 'savings-etf', d(2026,3,3), 50000, 'DEBIT', { externalId: 'demo-mar-etf', creditorName: 'Deutsche Bank Securities', purpose: 'Sparplan iShares MSCI World ETF', isRecurring: true }),
    tx(user.id, giro.id, 'income-other', d(2026,3,15), 28500, 'CREDIT', { externalId: 'demo-mar-freelance', creditorName: 'Kunde XY GmbH', purpose: 'Freelance Rechnung 2026-003' }),

    // ── April 2026 ──────────────────────────────────────────────────────
    tx(user.id, giro.id, 'income-salary', d(2026,4,1), 320000, 'CREDIT', { externalId: 'demo-apr-salary', creditorName: 'ACME GmbH', purpose: 'Gehalt April 2026', isRecurring: true }),
    tx(user.id, giro.id, 'housing-rent', d(2026,4,2), 95000, 'DEBIT', { externalId: 'demo-apr-rent', creditorName: 'Hausverwaltung Mitte GmbH', purpose: 'Miete April 2026 RE-2026-04', isRecurring: true }),
    tx(user.id, giro.id, 'transport-public', d(2026,4,2), 8600, 'DEBIT', { externalId: 'demo-apr-bvg', creditorName: 'BVG Berlin', purpose: 'Monatskarte April', isRecurring: true }),
    tx(user.id, giro.id, 'health-insurance', d(2026,4,5), 18000, 'DEBIT', { externalId: 'demo-apr-tk', creditorName: 'Techniker Krankenkasse', purpose: 'Krankenversicherung Apr 2026', isRecurring: true }),
    tx(user.id, giro.id, 'health-sports', d(2026,4,5), 2990, 'DEBIT', { externalId: 'demo-apr-gym', creditorName: 'FitnesFirst Berlin', purpose: 'Monatsbeitrag April', isRecurring: true }),
    tx(user.id, giro.id, 'food-groceries', d(2026,4,4), 4870, 'DEBIT', { externalId: 'demo-apr-rewe1', merchantName: 'REWE', purpose: 'REWE SAGT DANKE 5234' }),
    tx(user.id, giro.id, 'food-restaurant', d(2026,4,5), 3420, 'DEBIT', { externalId: 'demo-apr-resto1', merchantName: 'Brauhaus Mitte', purpose: 'BRAUHAUS MITTE BERLIN' }),
    tx(user.id, giro.id, 'food-cafe', d(2026,4,6), 720, 'DEBIT', { externalId: 'demo-apr-cafe1', merchantName: 'Bonanza Coffee', purpose: 'BONANZA COFFEE HEROES' }),
    tx(user.id, giro.id, 'food-groceries', d(2026,4,7), 2990, 'DEBIT', { externalId: 'demo-apr-aldi1', merchantName: 'Aldi', purpose: 'ALDI SUED 1234' }),
    tx(user.id, giro.id, 'housing-utilities', d(2026,4,10), 3999, 'DEBIT', { externalId: 'demo-apr-telekom', creditorName: 'Deutsche Telekom', purpose: 'Rechnung Apr 2026 Kundennummer 1234567', isRecurring: true }),
    tx(user.id, giro.id, 'housing-utilities', d(2026,4,10), 2999, 'DEBIT', { externalId: 'demo-apr-o2', creditorName: 'Telefónica Germany GmbH', purpose: 'O2 Mobilfunk Apr 2026', isRecurring: true }),
    tx(user.id, giro.id, 'entertainment-streaming', d(2026,4,12), 1799, 'DEBIT', { externalId: 'demo-apr-netflix', creditorName: 'Netflix International', purpose: 'NETFLIX.COM', isRecurring: true }),
    tx(user.id, giro.id, 'entertainment-music', d(2026,4,12), 1099, 'DEBIT', { externalId: 'demo-apr-spotify', creditorName: 'Spotify AB', purpose: 'Spotify Premium', isRecurring: true }),
    tx(user.id, giro.id, 'food-groceries', d(2026,4,12), 6230, 'DEBIT', { externalId: 'demo-apr-edeka1', merchantName: 'EDEKA', purpose: 'EDEKA ZWE 5678' }),
    tx(user.id, giro.id, 'entertainment-streaming', d(2026,4,15), 899, 'DEBIT', { externalId: 'demo-apr-prime', creditorName: 'Amazon EU S.a.r.l.', purpose: 'Amazon Prime Mitgliedschaft', isRecurring: true }),
    tx(user.id, giro.id, 'transport-flight', d(2026,4,16), 18900, 'DEBIT', { externalId: 'demo-apr-flight1', creditorName: 'Ryanair DAC', purpose: 'RYANAIR BERLIN-MALLORCA 28APR' }),
    tx(user.id, giro.id, 'food-groceries', d(2026,4,17), 3890, 'DEBIT', { externalId: 'demo-apr-rewe2', merchantName: 'REWE', purpose: 'REWE SAGT DANKE 5234' }),
    tx(user.id, giro.id, 'food-delivery', d(2026,4,18), 2450, 'DEBIT', { externalId: 'demo-apr-lieferando1', merchantName: 'Lieferando', purpose: 'LIEFERANDO.DE BESTELLUNG' }),
    tx(user.id, giro.id, 'shopping-clothing', d(2026,4,20), 15990, 'DEBIT', { externalId: 'demo-apr-hm1', merchantName: 'H&M', purpose: 'H&M BERLIN ALEXANDERPLATZ' }),
    tx(user.id, giro.id, 'food-groceries', d(2026,4,22), 5510, 'DEBIT', { externalId: 'demo-apr-lidl1', merchantName: 'Lidl', purpose: 'LIDL DIENSTLEISTUNG 9876' }),
    tx(user.id, giro.id, 'food-restaurant', d(2026,4,23), 5670, 'DEBIT', { externalId: 'demo-apr-brunch', merchantName: 'Benedict', purpose: 'BENEDICT BERLIN MITTE' }),
    tx(user.id, giro.id, 'transport-car', d(2026,4,24), 6800, 'DEBIT', { externalId: 'demo-apr-shell', merchantName: 'Shell Tankstelle', purpose: 'SHELL STATION BERLIN' }),
    tx(user.id, giro.id, 'food-groceries', d(2026,4,25), 7110, 'DEBIT', { externalId: 'demo-apr-rewe3', merchantName: 'REWE', purpose: 'REWE SAGT DANKE 5234' }),
    tx(user.id, giro.id, 'shopping-online', d(2026,4,26), 2990, 'DEBIT', { externalId: 'demo-apr-amazon1', creditorName: 'Amazon EU S.a.r.l.', purpose: 'Amazon.de Bestellung 345-6789012' }),
    tx(user.id, giro.id, 'taxes-fees', d(2026,4,28), 1836, 'DEBIT', { externalId: 'demo-apr-gez', creditorName: 'Rundfunk ARD ZDF', purpose: 'Rundfunkbeitrag 04/2026–06/2026', isRecurring: true }),
    tx(user.id, giro.id, 'health-pharmacy', d(2026,4,29), 2340, 'DEBIT', { externalId: 'demo-apr-apo1', merchantName: 'Apotheke am Markt', purpose: 'APOTHEKE AM MARKT' }),
    tx(user.id, depot.id, 'savings-etf', d(2026,4,3), 50000, 'DEBIT', { externalId: 'demo-apr-etf', creditorName: 'Deutsche Bank Securities', purpose: 'Sparplan iShares MSCI World ETF', isRecurring: true }),

    // ── May 2026 (partial, up to today 2026-05-09) ────────────────────
    tx(user.id, giro.id, 'income-salary', d(2026,5,2), 320000, 'CREDIT', { externalId: 'demo-may-salary', creditorName: 'ACME GmbH', purpose: 'Gehalt Mai 2026', isRecurring: true }),
    tx(user.id, giro.id, 'housing-rent', d(2026,5,2), 95000, 'DEBIT', { externalId: 'demo-may-rent', creditorName: 'Hausverwaltung Mitte GmbH', purpose: 'Miete Mai 2026 RE-2026-05', isRecurring: true }),
    tx(user.id, giro.id, 'transport-public', d(2026,5,2), 8600, 'DEBIT', { externalId: 'demo-may-bvg', creditorName: 'BVG Berlin', purpose: 'Monatskarte Mai', isRecurring: true }),
    tx(user.id, giro.id, 'health-insurance', d(2026,5,5), 18000, 'DEBIT', { externalId: 'demo-may-tk', creditorName: 'Techniker Krankenkasse', purpose: 'Krankenversicherung Mai 2026', isRecurring: true }),
    tx(user.id, giro.id, 'health-sports', d(2026,5,5), 2990, 'DEBIT', { externalId: 'demo-may-gym', creditorName: 'FitnesFirst Berlin', purpose: 'Monatsbeitrag Mai', isRecurring: true }),
    tx(user.id, giro.id, 'food-groceries', d(2026,5,6), 5430, 'DEBIT', { externalId: 'demo-may-rewe1', merchantName: 'REWE', purpose: 'REWE SAGT DANKE 5234' }),
    tx(user.id, giro.id, 'food-cafe', d(2026,5,7), 590, 'DEBIT', { externalId: 'demo-may-cafe1', merchantName: 'Starbucks', purpose: 'STARBUCKS COFFEE' }),
    tx(user.id, giro.id, 'food-groceries', d(2026,5,8), 3210, 'DEBIT', { externalId: 'demo-may-aldi1', merchantName: 'Aldi', purpose: 'ALDI SUED 1234' }),
    tx(user.id, giro.id, 'food-restaurant', d(2026,5,8), 4130, 'DEBIT', { externalId: 'demo-may-resto1', merchantName: 'Cantamundo', purpose: 'CANTAMUNDO BERLIN' }),
    tx(user.id, depot.id, 'savings-etf', d(2026,5,3), 50000, 'DEBIT', { externalId: 'demo-may-etf', creditorName: 'Deutsche Bank Securities', purpose: 'Sparplan iShares MSCI World ETF', isRecurring: true }),
  ];

  await prisma.transaction.createMany({ data: txData });
  console.log(`✅  ${txData.length} transactions created (Feb–May 2026)`);

  // ── Budgets ───────────────────────────────────────────────────────────────
  await prisma.budget.deleteMany({ where: { userId: user.id } });

  const budgets = [
    { name: 'Lebensmittel & Essen', categoryId: 'food', limitCents: BigInt(50000), startDate: d(2026, 5, 1) },
    { name: 'Freizeit & Unterhaltung', categoryId: 'entertainment', limitCents: BigInt(15000), startDate: d(2026, 5, 1) },
    { name: 'Shopping', categoryId: 'shopping', limitCents: BigInt(20000), startDate: d(2026, 5, 1) },
    { name: 'Mobilität', categoryId: 'transport', limitCents: BigInt(12000), startDate: d(2026, 5, 1) },
    { name: 'Gesundheit & Sport', categoryId: 'health', limitCents: BigInt(10000), startDate: d(2026, 5, 1) },
    { name: 'Wohnen & Nebenkosten', categoryId: 'housing', limitCents: BigInt(105000), startDate: d(2026, 5, 1) },
  ];

  await prisma.budget.createMany({
    data: budgets.map((b) => ({
      ...b,
      userId: user.id,
      period: 'MONTHLY',
      alertThreshold: 80,
      rollover: false,
      isActive: true,
    })),
  });

  console.log(`✅  ${budgets.length} budgets created`);
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Demo account ready!');
  console.log('  Email:    anna@demo.finanzapp.de');
  console.log('  Password: Demo1234!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
