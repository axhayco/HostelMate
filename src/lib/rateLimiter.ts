/**
 * Simple client-side sliding window rate limiter.
 * This is an in-memory measure to prevent UI spam and accidental double-submissions.
 * Note: Real security requires server-side validation (which Supabase provides via its API).
 */

import { logSecurityEvent } from "./securityLogger";

interface LimitRecord {
    timestamps: number[];
    blockedUntil: number;
}

export class RateLimiter {
    private limits: Map<string, LimitRecord> = new Map();
    private maxRequests: number;
    private windowMs: number;
    private blockDurationMs: number;

    /**
     * @param maxRequests Maximum number of allowed requests in the window
     * @param windowMs The time window in milliseconds (e.g., 60000 for 1 minute)
     * @param blockDurationMs How long to block the user if they exceed `maxRequests`
     */
    constructor(maxRequests: number, windowMs: number, blockDurationMs: number = windowMs) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.blockDurationMs = blockDurationMs;
    }

    /**
     * Attempts to consume a token for the given key.
     * @param key Identifier for the user/action (e.g. "auth_login", or user.id)
     * @returns { allowed: boolean, retryAfterMs: number }
     */
    tryConsume(key: string): { allowed: boolean; retryAfterMs: number } {
        const now = Date.now();

        if (!this.limits.has(key)) {
            this.limits.set(key, { timestamps: [], blockedUntil: 0 });
        }

        const record = this.limits.get(key)!;

        // If currently blocked, reject
        if (now < record.blockedUntil) {
            logSecurityEvent("RATE_LIMIT_EXCEEDED", { key, blockedUntil: record.blockedUntil });
            return { allowed: false, retryAfterMs: record.blockedUntil - now };
        }

        // Clean up timestamps outside the current window
        const windowStart = now - this.windowMs;
        record.timestamps = record.timestamps.filter(ts => ts > windowStart);

        // If limit exceeded, apply block
        if (record.timestamps.length >= this.maxRequests) {
            record.blockedUntil = now + this.blockDurationMs;
            logSecurityEvent("RATE_LIMIT_EXCEEDED", { key, maxRequests: this.maxRequests, windowMs: this.windowMs });
            return { allowed: false, retryAfterMs: this.blockDurationMs };
        }

        // Allowed, record timestamp
        record.timestamps.push(now);
        return { allowed: true, retryAfterMs: 0 };
    }

    /**
     * Resets the limit for a specific key (useful after successful verification).
     */
    reset(key: string) {
        this.limits.delete(key);
    }
}

// ─── Shared Instances ───
// These are singletons used across the app for global limits.

export const authLimiter = new RateLimiter(5, 60 * 1000); // 5 attempts per min
export const signInLimiter = new RateLimiter(5, 60 * 1000, 5 * 60 * 1000); // 5 sign-ins/min, then 5 min lockout
export const signUpLimiter = new RateLimiter(3, 10 * 60 * 1000, 10 * 60 * 1000); // 3 sign-ups per 10 min
export const passwordResetLimiter = new RateLimiter(3, 15 * 60 * 1000, 15 * 60 * 1000); // 3 reset emails per 15 min
export const otpResendLimiter = new RateLimiter(3, 120 * 1000); // 3 resends per 2 mins
export const formSubmitLimiter = new RateLimiter(3, 60 * 1000); // 3 submits per min
export const chatLimiter = new RateLimiter(10, 10 * 1000); // 10 messages per 10s
export const profileSaveLimiter = new RateLimiter(5, 60 * 1000); // 5 saves per min
export const agentLimiter = new RateLimiter(8, 15 * 1000); // 8 queries per 15s
