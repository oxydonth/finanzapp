export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: import('./models').User;
}

export interface MfaChallengeResponse {
  requiresMfa: true;
  mfaToken: string;
}

export interface MfaSetupResponse {
  secret: string;
  qrCodeDataUrl: string;
}

export interface MfaEnableResponse {
  backupCodes: string[];
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface ConnectBankRequest {
  bankCode: string;
  loginName: string;
  pin: string;
}

export interface SubmitTanRequest {
  tan: string;
}
