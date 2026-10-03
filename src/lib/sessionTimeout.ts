/**
 * Client-side session lifetime policy.
 *
 * Supabase JWTs already expire (default 1h) and are silently renewed by a refresh token, which on
 * its own lets a session live forever. This adds two bounds on top of that:
 *   - idle timeout:      sign out after IDLE_TIMEOUT_MS without user activity
 *   - absolute lifetime: sign out MAX_SESSION_MS after sign-in regardless of activity
 *
 * NOTE: this is defence in depth for shared/unattended devices. It is enforced in the browser, so it
 * is not a substitute for server-side limits (see docs/AUTH_SECURITY.md).
 */

export const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
export const MAX_SESSION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const ACTIVITY_WRITE_THROTTLE_MS = 15 * 1000;

export const LAST_ACTIVITY_KEY = "hozztl-last-activity";
export const SESSION_STARTED_KEY = "hozztl-session-started";

export type SessionExpiryReason = "idle" | "max-age" | null;

interface ExpiryInput {
    now: number;
    lastActivityAt: number | null;
    sessionStartedAt: number | null;
    idleTimeoutMs?: number;
    maxSessionMs?: number;
}

/** Pure decision function so the policy can be unit-tested without timers or storage. */
export function getSessionExpiry({
    now,
    lastActivityAt,
    sessionStartedAt,
    idleTimeoutMs = IDLE_TIMEOUT_MS,
    maxSessionMs = MAX_SESSION_MS,
}: ExpiryInput): SessionExpiryReason {
    if (sessionStartedAt !== null && now - sessionStartedAt >= maxSessionMs) return "max-age";
    if (lastActivityAt !== null && now - lastActivityAt >= idleTimeoutMs) return "idle";
    return null;
}

/** Reads a numeric timestamp from storage; returns null for missing or corrupt values. */
export function readTimestamp(storage: Pick<Storage, "getItem">, key: string): number | null {
    try {
        const raw = storage.getItem(key);
        if (raw === null) return null;
        const value = Number(raw);
        return Number.isFinite(value) && value > 0 ? value : null;
    } catch {
        return null;
    }
}

export function writeTimestamp(storage: Pick<Storage, "setItem">, key: string, value: number): void {
    try {
        storage.setItem(key, String(value));
    } catch {
        // Storage can be unavailable (private mode / quota). Failing open here only disables the
        // convenience timeout; the server-side JWT expiry still applies.
    }
}

export function clearSessionTimestamps(storage: Pick<Storage, "removeItem">): void {
    try {
        storage.removeItem(LAST_ACTIVITY_KEY);
        storage.removeItem(SESSION_STARTED_KEY);
    } catch {
        // see writeTimestamp
    }
}
