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

export interface TransactionFilters {
  accountId?: string;
  categoryId?: string;
  from?: string;
  to?: string;
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
}
