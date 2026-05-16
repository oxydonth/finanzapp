# Finanzapp — Go-to-Market Checklist

German personal finance app. Monorepo: `apps/api` (Express/Prisma/Postgres), `apps/web` (Next.js 16), `apps/mobile` (Expo 51, React Native). Deployed on Render (API) + Vercel (web). Mobile via EAS.

**Target:** German-speaking EU market. Financial data. DSGVO mandatory.

---

## 1. Critical Blockers — App Cannot Ship Without These

### 1.1 Password Reset Flow
- `mail.service.ts` has `sendPasswordResetEmail()` and schema has `passwordResetToken`/`passwordResetExpiry` fields, but **no route exists** (`apps/api/src/routes/auth.routes.ts` has no `/forgot-password` or `/reset-password` endpoint)
- **Action:** Implement `POST /api/v1/auth/forgot-password` and `POST /api/v1/auth/reset-password` in `auth.routes.ts` + `auth.service.ts`
- **Action:** Add forgot-password UI page in `apps/web/src/app/(auth)/` and mobile equivalent

### 1.2 In-Memory Session Stores → Redis
- `apps/api/src/services/fints.service.ts:26`: `// In-memory TAN challenge store (use Redis in production)` — TAN sessions lost on server restart/scale
- `apps/api/src/services/paypal.service.ts:18`: Same pattern for OAuth state
- Wise, Revolut likely have the same pattern
- **Action:** Migrate all `Map<string, ...>` pending sessions to Redis (`REDIS_URL` env var already wired in `env.ts`)
- **Action:** Verify `ioredis` (already in deps) client is initialised in `apps/api/src/config/`

### 1.3 Background Job Processors are Empty
- `apps/api/src/jobs/processors/` and `apps/api/src/jobs/schedulers/` directories exist but contain **no files**
- `bull` is in deps — queue is declared but nothing is consuming it
- **Action:** Implement sync job processor (scheduled bank sync, e.g. nightly)
- **Action:** Implement budget alert job (notify when threshold exceeded — `alertThreshold` field exists on `Budget` model)
- **Action:** Hook jobs into `apps/api/src/index.ts` startup

### 1.4 Apple ID / App Store Connect IDs Missing
- `apps/mobile/eas.json` submit config has `"appleId": "YOUR_APPLE_ID"` and `"ascAppId": "YOUR_APP_STORE_CONNECT_APP_ID"` as placeholders
- **Action:** Create app in App Store Connect, fill in real IDs before iOS submission

### 1.5 Legal Pages Missing
- No Impressum page (legally required in Germany under TMG §5)
- No AGB (Allgemeine Geschäftsbedingungen / Terms of Service)
- `datenschutz/page.tsx` exists but uses placeholder company data: `'Musterstraße 1, 10115 Berlin'`
- **Action:** Add real company address, Handelsregisternummer, USt-IdNr to `datenschutz/page.tsx`
- **Action:** Create `apps/web/src/app/impressum/page.tsx`
- **Action:** Create `apps/web/src/app/agb/page.tsx`
- **Action:** Add links to all three in landing page footer and app footer

---

## 2. Security — Must Fix Before Launch

### 2.1 IBAN Stored Encrypted — Verify Decrypt Path
- `finaliseConnection()` in `fints.service.ts` encrypts IBANs before storing
- Verify `GET /api/v1/accounts` and `GET /api/v1/accounts/:id` decrypt IBANs before returning — check if `ibanMasked` is used everywhere the full IBAN is not needed
- Test that the decrypt key rotation path exists (if `ENCRYPTION_KEY` ever changes, all stored IBANs and credentials are unreadable)

### 2.2 PIN Stored Encrypted — Ongoing Re-auth Risk
- FinTS requires the real PIN for each sync. It is AES-256-GCM encrypted at rest (`fints.service.ts`)
- **Action:** Confirm PIN is never logged (grep `console.log` across all services for any variable that could contain PIN)
- **Action:** Ensure error messages from `node-fints` that may echo credentials are caught and sanitised before reaching the error response

### 2.3 TAN Session Timeout
- `pendingSessions` has `setTimeout(..., 10 * 60 * 1000)` — fine for single instance
- After Redis migration (1.2): set TTL on Redis keys, not setTimeout

### 2.4 Rate Limiting Gaps
- Auth endpoints rate-limited (15 req/15min) ✓
- `GET /api/v1/transactions` has no rate limit — a compromised token could enumerate all transactions at high speed
- `GET /api/v1/users/me/export` (GDPR export) has no rate limit — could be abused for data exfiltration if token leaked
- **Action:** Add a general API rate limiter (e.g. 200 req/15min per IP) in `app.ts` before the router

### 2.5 Dependency Vulnerabilities (Transitive, Lockfile Stale)
- Root `package.json` has overrides for `fast-xml-parser@5.7.3`, `node-fetch@2.7.0`, `tar@7.5.15`, `send@0.19.0`, `@xmldom/xmldom@0.9.10` — but **lockfile still holds old versions** because `node_modules` was not fully wiped
- **Action:** `rm -rf node_modules && npm install` to force override resolution
- Remaining after that: `expo ~51` chain vulns — defer to Expo 52/53 upgrade

### 2.6 Content Security Policy
- `helmet()` is applied but with default CSP — Next.js inlines scripts by default, which may be blocked
- **Action:** Configure CSP nonces in `apps/web/src/app/layout.tsx` (Next.js 15 supports `headers()` for CSP)
- **Action:** Review `helmet()` config in `apps/api/src/app.ts` for HSTS, X-Frame-Options

### 2.7 Email Verification Not Enforced
- `isEmailVerified` field exists on User, but no middleware blocks unverified users from using the API
- **Action:** Decide policy: block API access entirely, or only soft-warn. If blocking: add check in `authenticate` middleware or a separate `requireVerified` middleware

---

## 3. DSGVO / Regulatory Compliance

### 3.1 Verify GDPR Export Completeness (Art. 15 & 20)
- `GET /api/v1/users/me/export` exists and exports transactions, accounts, budgets, categories ✓
- **Verify:** Export includes `SyncLog` entries (data about when and how the user's bank was accessed)
- **Verify:** Export includes category rules
- **Verify:** BigInt serialization works correctly end-to-end (`.toString()` is applied but test with real data)

### 3.2 Right to Erasure Implementation (Art. 17)
- `DELETE /api/v1/users/me` soft-deletes user (sets `deletedAt`, clears PII) and hard-deletes financial data ✓
- **Verify:** Soft-deleted users cannot log in (email is set to `deleted-{id}@deleted.invalid` — check login flow handles this)
- **Verify:** Soft-deleted users do not appear in any admin queries (if admin panel exists)
- **Action:** Implement a cron job that permanently deletes soft-deleted users after 30 days (DSGVO minimum retention period)

### 3.3 Data Retention Policy
- Transaction data: no automatic deletion. Define and document retention period.
- SyncLog data: grows unbounded. **Action:** Add a cleanup job to prune `SyncLog` entries older than 90 days.
- **Action:** Document retention periods in `datenschutz/page.tsx`

### 3.4 Consent & Cookie Banner
- No cookie/consent banner on web app or landing page
- If using any analytics (Vercel Analytics, etc.) this is mandatory under DSGVO
- **Action:** Add consent banner if any tracking is enabled

### 3.5 Data Processing Agreements (AVV)
- Required with: Render (API hosting), Vercel (web hosting), Resend (email), GoCardless, Salt Edge, Neon/Postgres provider
- **Action:** Sign AVV with each processor or confirm existing DPA covers your use case

### 3.6 PSD2 / Open Banking Compliance
- GoCardless and Salt Edge connectors are regulated PSD2 providers — they handle licensing
- FinTS direct connector (`node-fints`): check if your use constitutes acting as a AISP (Account Information Service Provider) under PSD2 — may require BaFin registration or exemption
- **Action:** Obtain legal opinion on whether direct FinTS credential storage requires AISP license

---

## 4. Missing Features

### 4.1 Password Reset UI
- See 1.1. Both web and mobile need pages.

### 4.2 Push Notifications
- `Budget` model has `alertThreshold` (default 80%) — alerts are never sent
- No FCM/APNs integration in mobile app
- No `expo-notifications` in `apps/mobile/package.json`
- **Action:** Add `expo-notifications`, register device tokens, send from API when budget threshold crossed

### 4.3 Recurring Transaction Detection
- `isRecurring` field exists on `Transaction` — never set by any service
- **Action:** Implement detection logic in categorization service or a dedicated job

### 4.4 Mobile — Missing Screens
- Mobile has 5 tab screens (dashboard, transactions, accounts, budget, mehr)
- No settings screen (settings exist in web but not mobile)
- No bank connection flow beyond `bank/verbinden.tsx`
- No category management screen
- No statistics screen
- **Action:** Port remaining web screens to mobile or implement mobile-native equivalents

### 4.5 Mobile — Biometric Auth
- `expo-local-authentication` is in deps and `infoPlist` has Face ID permission
- No biometric auth implementation found in `apps/mobile/src/`
- **Action:** Implement biometric unlock using `expo-local-authentication` in the auth flow

### 4.6 Wise / Revolut / PayPal — Sync Frequency
- OAuth tokens expire. No token refresh logic verified for these connectors.
- **Action:** Audit `wise.service.ts`, `revolut.service.ts`, `paypal.service.ts` for token refresh and implement if missing

### 4.7 Transaction CSV/PDF Export
- No export feature for transactions (only GDPR data export exists)
- Common user expectation for finance apps
- Consider: `GET /api/v1/transactions/export?format=csv`

### 4.8 Landing Page Pricing Section
- No pricing section on `apps/web/src/app/page.tsx`
- **Action:** Define monetization model (freemium, subscription, one-time) and add pricing section

---

## 5. Infrastructure & Ops

### 5.1 Database Backups
- Render Postgres has automated backups on paid plans — **verify this is enabled**
- **Action:** Test restore procedure before launch

### 5.2 Redis Persistence
- If TAN sessions are moved to Redis (1.2), verify Redis persistence mode (AOF/RDB) is enabled so sessions survive Redis restart

### 5.3 Monitoring & Alerting
- No error tracking (Sentry, etc.)
- No uptime monitoring
- **Action:** Add Sentry SDK to API and web (`@sentry/nextjs`, `@sentry/node`)
- **Action:** Set up uptime monitor (BetterUptime, Checkly, or Render health checks)
- **Action:** Set up Render alerting on deploy failures and memory thresholds

### 5.4 Logging
- `morgan('combined')` logs HTTP access ✓
- No structured logging (JSON) for production — hard to parse in Render log drain
- **Action:** Replace/augment morgan with structured logger (pino) for production

### 5.5 Environment Secrets Audit
- Required secrets not yet in Render/Vercel dashboard:
  - `ENCRYPTION_KEY` (64 hex chars — generate with `openssl rand -hex 32`)
  - `JWT_SECRET`, `JWT_REFRESH_SECRET` (min 32 chars)
  - `RESEND_API_KEY`
  - `RENDER_DEPLOY_HOOK_URL`
  - `NEXT_PUBLIC_API_URL`
  - `EXPO_TOKEN`
  - `EXPO_PUBLIC_API_URL`
  - `GOOGLE_SERVICE_ACCOUNT_KEY` (Android Play submission)
  - OAuth credentials for each connector: PayPal, Wise, Revolut, GoCardless, Salt Edge
- **Action:** Populate all secrets before first production deploy

### 5.6 Database Migration Strategy
- `prisma migrate deploy` runs in CI on every push ✓
- **Verify:** Render's deploy pipeline runs migrations before starting new server instance (zero-downtime migration order)
- **Action:** Add `db:migrate` as a pre-deploy step in Render dashboard (not just CI)

### 5.7 CORS Configuration
- `CORS_ORIGINS` env var splits on comma — verify production value includes both `https://finanzapp.de` and `https://www.finanzapp.de`

---

## 6. Testing Gaps

### 6.1 Integration Tests Need Real DB in CI
- `apps/api/.github/workflows/api.yml` already provisions Postgres service ✓
- **Verify:** Integration tests (`*.integration.test.ts`) actually run — `vitest.config.ts` uses `include: ['src/**/*.test.ts']` which matches `*.integration.test.ts` ✓

### 6.2 Mobile Test Coverage
- Only util and store tests exist — no screen render tests
- **Action:** Add `@testing-library/react-native` render tests for at minimum: login flow, dashboard load, transaction list

### 6.3 Web Component Tests
- `authStore.test.ts` and `api.test.ts` exist — no component render tests
- **Action:** Add render tests for login form, dashboard, and bank connect flow using `@testing-library/react`

### 6.4 E2E Tests (Playwright / Detox)
- No end-to-end browser tests
- **Action (web):** Add Playwright tests for: register → verify email → login → connect bank → view dashboard
- **Action (mobile):** Add Detox tests for: login → dashboard → view transactions

### 6.5 Performance / Load Tests
- No load tests for API
- FinTS sync is slow (external HTTP) — verify timeout handling under concurrent syncs
- **Action:** Add k6 or Artillery load test for auth + transactions endpoints

---

## 7. App Store Submission Checklist

### iOS
- [ ] Apple Developer account active ($99/year)
- [ ] App Store Connect app created (bundle ID: `de.finanzapp.app`)
- [ ] `eas.json` `appleId` and `ascAppId` filled in (currently placeholders)
- [ ] Privacy Nutrition Labels completed (financial data, contact info, identifiers)
- [ ] App Review Information: test account credentials for reviewer
- [ ] Age rating set (financial apps: 4+)
- [ ] Screenshots for all required device sizes (6.7", 6.1", iPad if `supportsTablet` is ever enabled)
- [ ] App description, keywords, support URL
- [ ] Privacy Policy URL pointing to `datenschutz` page

### Android
- [ ] Google Play Console account active ($25 one-time)
- [ ] Package `de.finanzapp.app` registered in Play Console
- [ ] `google-service-account.json` secret populated in GitHub
- [ ] Data safety section completed (financial data collection declaration)
- [ ] Play Store listing: screenshots, description, feature graphic
- [ ] Content rating questionnaire completed
- [ ] Privacy Policy URL

---

## 8. Pre-Launch QA Checklist

Run through manually before go-live:

- [ ] Register → receive verification email → click link → login
- [ ] Login → wrong password 3 times → account not locked (no lockout implemented — consider adding)
- [ ] Enable MFA → scan QR → enter code → disable MFA with backup code
- [ ] Connect bank (FinTS, mocked in CI — test with real sandbox or test bank)
- [ ] Manual sync triggers → accounts update
- [ ] Create transaction category → create rule → run auto-categorize
- [ ] Create budget → spend past threshold → verify alert fires
- [ ] Change language across all 37 supported languages — spot check 5
- [ ] GDPR export → download JSON → verify all data present
- [ ] Account deletion → confirm login fails after
- [ ] Password reset flow (once implemented)
- [ ] Test on iOS (real device) + Android (real device) — not just simulator
- [ ] Test on slow 3G network (transaction list pagination, bank sync timeout)
- [ ] Verify dark mode on web and mobile
- [ ] Verify RTL layout for Farsi (`fa`) locale on web

---

## 9. Quick Wins (Low Effort, High Impact)

- Add `robots.txt` and `sitemap.xml` to `apps/web/public/`
- Add `<meta name="description">` and Open Graph tags to landing page
- Add favicon and PWA manifest to web app
- Set `Cache-Control` headers on static bank registry endpoint (`GET /api/v1/banks`)
- Add `Retry-After` header to rate-limited responses (already using `express-rate-limit` with `standardHeaders: true`)
- Add `requestId` to all API responses and logs for traceability

---

## Priority Order

1. **1.1** Password reset (blocker — users get locked out)
2. **1.5** Legal pages (legal requirement in Germany)
3. **2.7** Email verification enforcement (security)
4. **1.2** Redis session migration (scalability — blocks horizontal scaling)
5. **3.6** AISP/PSD2 legal opinion (regulatory risk)
6. **1.3** Background jobs — budget alerts (core feature)
7. **2.4** Rate limiting gaps (security)
8. **4.5** Biometric auth mobile (user expectation)
9. **5** Infrastructure secrets + monitoring
10. **7** App Store submission
