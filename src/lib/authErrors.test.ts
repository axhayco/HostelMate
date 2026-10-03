import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { toSafeAuthError } from "@/lib/authErrors";
import { RateLimiter } from "@/lib/rateLimiter";

describe("toSafeAuthError", () => {
    beforeEach(() => { vi.spyOn(console, "error").mockImplementation(() => undefined); });
    afterEach(() => { vi.restoreAllMocks(); });

    it("returns null when there is no error", () => {
        expect(toSafeAuthError(null, "signIn")).toBeNull();
    });

    it("never leaks the raw server message (account enumeration)", () => {
        const r = toSafeAuthError({ code: "user_already_exists", message: "User already registered" }, "signUp");
        expect(r?.message).not.toMatch(/already registered/i);
    });

    it("uses one generic message for bad credentials", () => {
        const a = toSafeAuthError({ code: "invalid_credentials", message: "Invalid login credentials" }, "signIn");
        const b = toSafeAuthError({ code: "user_not_found", message: "User not found" }, "signIn");
        expect(a?.message).toBe(b?.message);
    });

    it("surfaces rate limiting by status or code", () => {
        expect(toSafeAuthError({ status: 429 }, "signIn")?.message).toMatch(/too many attempts/i);
        expect(toSafeAuthError({ code: "over_email_send_rate_limit" }, "reset")?.message).toMatch(/too many attempts/i);
    });

    it("keeps the email_not_confirmed code so the UI can offer a resend", () => {
        const r = toSafeAuthError({ code: "email_not_confirmed", message: "Email not confirmed" }, "signIn");
        expect(r?.code).toBe("email_not_confirmed");
        expect(r?.message).toMatch(/verify your email/i);
    });

    it("logs only code/status, never the message", () => {
        toSafeAuthError({ code: "x", status: 400, message: "secret@example.com failed" }, "signIn");
        const logged = JSON.stringify((console.error as unknown as { mock: { calls: unknown[][] } }).mock.calls);
        expect(logged).not.toContain("secret@example.com");
    });
});

describe("RateLimiter lockout", () => {
    it("blocks after the limit and reports the lockout duration", () => {
        const limiter = new RateLimiter(3, 60_000, 300_000);
        expect(limiter.tryConsume("k").allowed).toBe(true);
        expect(limiter.tryConsume("k").allowed).toBe(true);
        expect(limiter.tryConsume("k").allowed).toBe(true);
        const blocked = limiter.tryConsume("k");
        expect(blocked.allowed).toBe(false);
        expect(blocked.retryAfterMs).toBe(300_000);
    });

    it("keeps separate counters per key and can be reset after success", () => {
        const limiter = new RateLimiter(1, 60_000);
        expect(limiter.tryConsume("signin").allowed).toBe(true);
        expect(limiter.tryConsume("signin").allowed).toBe(false);
        expect(limiter.tryConsume("signup").allowed).toBe(true);
        limiter.reset("signin");
        expect(limiter.tryConsume("signin").allowed).toBe(true);
    });
});
