export enum TransactionType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

export enum AccountType {
  CHECKING = 'CHECKING',
  SAVINGS = 'SAVINGS',
  CREDIT_CARD = 'CREDIT_CARD',
  DEPOT = 'DEPOT',
  LOAN = 'LOAN',
}

export enum BudgetPeriod {
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

export enum SyncStatus {
  IDLE = 'IDLE',
  SYNCING = 'SYNCING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  TAN_REQUIRED = 'TAN_REQUIRED',
}

export enum TanMethod {
  CHIPTAN_OPTIC = 'CHIPTAN_OPTIC',
  CHIPTAN_USB = 'CHIPTAN_USB',
  CHIPTAN_QR = 'CHIPTAN_QR',
  SMSTAN = 'SMSTAN',
  PUSHTAN = 'PUSHTAN',
  APPTAN = 'APPTAN',
  ITAN = 'ITAN',
  MTAN = 'MTAN',
}
