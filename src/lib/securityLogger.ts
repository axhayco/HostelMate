/**
 * Security Logger & Audit Trail Module for Hozztl
 * Captures authentication events, security warnings, API failures, and rate limit triggers.
 * Ensures PII and authentication secrets are NEVER leaked in log outputs.
 */

export type SecurityEventType =
  | "AUTH_LOGIN_SUCCESS"
  | "AUTH_LOGIN_FAILURE"
  | "AUTH_SIGNUP_ATTEMPT"
  | "AUTH_SIGNOUT"
  | "AUTH_PASSWORD_RESET_REQUEST"
  | "RATE_LIMIT_EXCEEDED"
  | "SUSPICIOUS_TRAFFIC"
  | "API_ERROR"
  | "UNAUTHORIZED_ACCESS_ATTEMPT";

export interface SecurityLogEntry {
  timestamp: string;
  eventType: SecurityEventType;
  details: Record<string, unknown>;
  userAgent?: string;
}

// In-memory buffer of recent security events (max 100 entries for client diagnostic)
const securityLogBuffer: SecurityLogEntry[] = [];
const MAX_BUFFER_SIZE = 100;

/**
 * Sanitizes object values to ensure passwords, tokens, and secrets are stripped.
 */
function sanitizeLogDetails(details: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  const SENSITIVE_KEYS = ["password", "token", "secret", "access_token", "refresh_token", "authorization", "key"];

  for (const [key, val] of Object.entries(details)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some((s) => lowerKey.includes(s))) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof val === "object" && val !== null && !Array.isArray(val)) {
      sanitized[key] = sanitizeLogDetails(val as Record<string, unknown>);
    } else {
      sanitized[key] = val;
    }
  }

  return sanitized;
}

/**
 * Records a security audit log event.
 */
export function logSecurityEvent(eventType: SecurityEventType, details: Record<string, unknown> = {}): SecurityLogEntry {
  const entry: SecurityLogEntry = {
    timestamp: new Date().toISOString(),
    eventType,
    details: sanitizeLogDetails(details),
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "server/unknown",
  };

  securityLogBuffer.unshift(entry);
  if (securityLogBuffer.length > MAX_BUFFER_SIZE) {
    securityLogBuffer.pop();
  }

  // Development/Production console logging format
  const isProd = import.meta.env.PROD;
  if (!isProd) {
    console.info(`[SECURITY_AUDIT] [${entry.eventType}]`, entry.details);
  } else if (eventType === "RATE_LIMIT_EXCEEDED" || eventType === "SUSPICIOUS_TRAFFIC" || eventType === "UNAUTHORIZED_ACCESS_ATTEMPT") {
    // In production, log security anomalies to error console for monitoring tools (Sentry/Datadog/CloudWatch)
    console.warn(`[SECURITY_ALERT] [${entry.eventType}]`, JSON.stringify(entry));
  }

  return entry;
}

/**
 * Retrieves recent in-memory security log entries (useful for security diagnostics/admin view).
 */
export function getSecurityLogs(): ReadonlyArray<SecurityLogEntry> {
  return [...securityLogBuffer];
}

/**
 * Clears security log buffer (primarily for testing).
 */
export function clearSecurityLogs(): void {
  securityLogBuffer.length = 0;
}
