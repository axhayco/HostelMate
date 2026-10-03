import { describe, it, expect } from "vitest";
import {
    getSessionExpiry,
    readTimestamp,
    IDLE_TIMEOUT_MS,
    MAX_SESSION_MS,
} from "@/lib/sessionTimeout";

const T0 = 1_700_000_000_000;

describe("getSessionExpiry", () => {
    it("keeps an active, recent session", () => {
        expect(getSessionExpiry({ now: T0 + 60_000, lastActivityAt: T0, sessionStartedAt: T0 })).toBeNull();
    });

    it("expires after the idle timeout", () => {
        expect(
            getSessionExpiry({ now: T0 + IDLE_TIMEOUT_MS, lastActivityAt: T0, sessionStartedAt: T0 }),
        ).toBe("idle");
    });

    it("does not expire one millisecond before the idle timeout", () => {
        expect(
            getSessionExpiry({ now: T0 + IDLE_TIMEOUT_MS - 1, lastActivityAt: T0, sessionStartedAt: T0 }),
        ).toBeNull();
    });

    it("expires at the absolute max age even if the user is still active", () => {
        const now = T0 + MAX_SESSION_MS;
        expect(getSessionExpiry({ now, lastActivityAt: now - 1000, sessionStartedAt: T0 })).toBe("max-age");
    });

    it("max-age takes precedence over idle", () => {
        const now = T0 + MAX_SESSION_MS + IDLE_TIMEOUT_MS;
        expect(getSessionExpiry({ now, lastActivityAt: T0, sessionStartedAt: T0 })).toBe("max-age");
    });

    it("treats missing timestamps as not expired (nothing to compare against)", () => {
        expect(getSessionExpiry({ now: T0, lastActivityAt: null, sessionStartedAt: null })).toBeNull();
    });
});

describe("readTimestamp", () => {
    const store = (value: string | null) => ({ getItem: () => value });

    it("parses a valid timestamp", () => {
        expect(readTimestamp(store("12345"), "k")).toBe(12345);
    });

    it("returns null for missing, corrupt or non-positive values", () => {
        expect(readTimestamp(store(null), "k")).toBeNull();
        expect(readTimestamp(store("abc"), "k")).toBeNull();
        expect(readTimestamp(store("-5"), "k")).toBeNull();
        expect(readTimestamp(store("0"), "k")).toBeNull();
    });

    it("returns null if storage throws", () => {
        const throwing = { getItem: () => { throw new Error("denied"); } };
        expect(readTimestamp(throwing, "k")).toBeNull();
    });
});
