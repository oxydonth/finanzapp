import { AccountType, BudgetPeriod, SyncStatus, TanMethod, TransactionType } from './enums';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  currency: string;
  locale: string;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BankConnection {
  id: string;
  userId: string;
  bankCode: string;
  bankName: string;
  fintsUrl: string;
  selectedTanMethod?: string;
  availableTanMethods?: TanMethodInfo[];
  lastSyncAt?: string;
  syncStatus: SyncStatus;
  syncError?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  accounts?: BankAccount[];
}

export interface TanMethodInfo {
  id: string;
  name: string;
  method: TanMethod;
}

export interface BankAccount {
  id: string;
  userId: string;
  bankConnectionId: string;
  ibanMasked: string;
  bic: string;
  accountType: AccountType;
  accountName: string;
  ownerName: string;
  currency: string;
  balanceCents: number;
  balanceDate?: string;
  availableBalanceCents?: number;
  isHidden: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  bankAccountId: string;
  categoryId?: string;
  category?: Category;
  externalId?: string;
  valueDate: string;
  bookingDate: string;
  amountCents: number;
  currency: string;
  type: TransactionType;
  creditorName?: string;
  creditorIban?: string;
  purpose?: string;
  merchantName?: string;
  isRecurring: boolean;
  note?: string;
  tags: string[];
  isReviewed: boolean;
  isPending: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  userId?: string;
  name: string;
  icon?: string;
  color?: string;
  parentId?: string;
  children?: Category[];
  isIncome: boolean;
  isSystem: boolean;
  sortOrder: number;
}

export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  category?: Category;
  bankAccountId?: string;
  name: string;
  limitCents: number;
  period: BudgetPeriod;
  startDate: string;
  endDate?: string;
  rollover: boolean;
  alertThreshold: number;
  isActive: boolean;
  spentCents?: number;
  remainingCents?: number;
  progressPercent?: number;
}
