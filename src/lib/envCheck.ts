/**
 * Environment & Secret Isolation Checker
 * Ensures backend secrets (e.g. SUPABASE_SERVICE_ROLE_KEY) are never exposed to the client bundle.
 */

import { logSecurityEvent } from "./securityLogger";

export function validateEnvironmentSecrets(): void {
  // Check if dangerous service role key is leaked into window or import.meta.env
  const metaEnv = import.meta.env as Record<string, string | undefined>;

  const forbiddenKeys = [
    "SUPABASE_SERVICE_ROLE_KEY",
    "VITE_SUPABASE_SERVICE_ROLE_KEY",
    "DATABASE_URL",
    "SECRET_KEY",
    "PRIVATE_KEY",
  ];

  for (const key of forbiddenKeys) {
    if (metaEnv[key] || (typeof window !== "undefined" && (window as unknown as Record<string, unknown>)[key])) {
      const msg = `[CRITICAL_SECURITY_LEAK] Forbidden secret '${key}' is exposed in the frontend environment!`;
      logSecurityEvent("SUSPICIOUS_TRAFFIC", { alert: "SECRET_LEAK_DETECTED", key });
      console.error(msg);
      if (import.meta.env.PROD) {
        throw new Error(msg);
      }
    }
  }

  // Ensure public keys are configured properly
  if (!metaEnv.VITE_SUPABASE_URL || !metaEnv.VITE_SUPABASE_ANON_KEY) {
    console.warn("[SECURITY_CONFIG] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY env variables.");
  }
}

// Automatically validate secrets on module import
validateEnvironmentSecrets();
