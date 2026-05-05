// Set required env vars before any module import triggers env.ts parsing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/finanzapp_test';
process.env.JWT_SECRET = 'test-secret-at-least-32-characters-long-for-jwt';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-chars-long-jwt';
process.env.ENCRYPTION_KEY = 'a'.repeat(64); // 32 bytes as 64 hex chars
