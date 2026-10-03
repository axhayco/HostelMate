# Comprehensive Application Security Architecture & Hardening Guide

## Overview
This document details the security architecture, input validation, upload security, anti-IDOR controls, production deployment standards, and audit logging system implemented for **Hozztl**.

---

## 🔒 Security Requirements & Production Controls

### 1. Input Validation, Sanitization & Injection Prevention
- **Schema Validation Engine ([`src/lib/validation.ts`](file:///c:/Users/MEDHA%20TRUST/OneDrive/Desktop/HstlMate/HostelMate/src/lib/validation.ts))**:
  - Built on **Zod** schemas enforcing strict type constraints, string bounds, and regex format requirements.
  - All user forms (sign-in, sign-up, password reset, profile updates, hostel listings, complaint filings, contact forms, chat messages) strip unknown fields automatically using `.strip()`.
- **HTML & Script Injection Sanitization (`sanitizeText`)**:
  - Strips HTML/script tags (`/<[^>]*>?/gm`) and normalizes whitespace across all text inputs before database query execution or state assignment.
- **SQL & Command Injection Defense**:
  - Supabase client queries employ parameterized SQL bindings (`.eq()`, `.upsert()`, `.select()`). Raw SQL string concatenation is strictly forbidden.
- **Query Parameter Validation**:
  - Tab and page URL parameters (`?page=`, `?tab=`, `?id=`) in [`Index.tsx`](file:///c:/Users/MEDHA%20TRUST/OneDrive/Desktop/HstlMate/HostelMate/src/pages/Index.tsx) are validated against strict allowed type unions before rendering.

### 2. File Upload Security ([`src/lib/upload.ts`](file:///c:/Users/MEDHA%20TRUST/OneDrive/Desktop/HstlMate/HostelMate/src/lib/upload.ts))
- **MIME Type Whitelisting**: Strictly permits only `image/jpeg`, `image/png`, and `image/webp`. Malicious executable file extensions (`.exe`, `.php`, `.js`, `.sh`) are rejected.
- **File Size Restriction**: Enforces a strict **5 MB** file size limit (`MAX_SIZE_MB = 5`).
- **Filename Sanitization**: Replaces user-provided filenames with cryptographically safe, server-generated names (`hostels/${Date.now()}_${random}.${ext}`) using mapped safe extensions to prevent path traversal attacks.

### 3. Direct Database Access & IDOR Prevention
- **Row-Level Security (RLS)**: Enforced across all tables (`profiles`, `hostels`, `rooms`, `bookings`, `reviews`) in `supabase/migrations/001_initial_schema.sql`.
- **Ownership Verification**:
  - `profiles`: Users can only edit rows where `auth.uid() = id`.
  - `hostels`: Owners can only edit/delete hostels where `owner_id = auth.uid()`.
  - `bookings`: Scoped by `student_id = auth.uid()` for students and `owner_id = auth.uid()` for hostel owners.
  - `Index.tsx`: Favorites (`hozztl-favorites-${user.id}`) and bookings (`hozztl-bookings-${user.id}`) are strictly partitioned by `user.id` to prevent cross-account local storage leaks.

### 4. Secret Isolation & Zero Leakage ([`src/lib/envCheck.ts`](file:///c:/Users/MEDHA%20TRUST/OneDrive/Desktop/HstlMate/HostelMate/src/lib/envCheck.ts))
- **Client Bundle Isolation**: Only public anon keys (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) are exposed to client builds.
- **Runtime Secret Guard**: Startup check verifies that service role keys (`SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`) are strictly excluded from client variables.
- **Git Hygiene**: `.env` is listed in `.gitignore` and untracked. `.env.example` provides non-sensitive placeholders.

### 5. HTTPS Enforcement & Production Headers
- **Configured Headers** in `public/_headers` and `vercel.json`:
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Content-Security-Policy`: Restricts frame ancestors, object sources, and script origins.

### 6. Security Audit Logging & Rate Limiting ([`src/lib/securityLogger.ts`](file:///c:/Users/MEDHA%20TRUST/OneDrive/Desktop/HstlMate/HostelMate/src/lib/securityLogger.ts))
- Captures authentication events (`AUTH_LOGIN_SUCCESS`, `AUTH_LOGIN_FAILURE`, `AUTH_SIGNUP_ATTEMPT`, `AUTH_SIGNOUT`, `AUTH_PASSWORD_RESET_REQUEST`) and anomaly alerts (`RATE_LIMIT_EXCEEDED`, `SUSPICIOUS_TRAFFIC`).
- Automatically redacts passwords, access tokens, and secret keys before writing log entries.
- Rate limiting enforces a sliding window max of 5 login attempts per 15-minute window (`src/lib/rateLimiter.ts`).

---

## 🧪 Verification & Test Suite
- `src/lib/validation.test.ts`: Validates strong password policies, schema bounds, and input sanitization.
- `src/lib/securityLogger.test.ts`: Verifies event logging, buffer limits, and automatic credential redaction.
- `src/lib/sessionTimeout.test.ts`: Tests inactivity tracking and auto-logout timers.
- `src/lib/authErrors.test.ts`: Tests error code mapping and safe message sanitization.

All 29 unit tests pass with zero errors (`npm test -- --run`).
Production build compiles with 0 errors (`npm run build`).
