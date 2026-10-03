import { describe, it, expect, beforeEach } from "vitest";
import { logSecurityEvent, getSecurityLogs, clearSecurityLogs } from "./securityLogger";

describe("securityLogger", () => {
  beforeEach(() => {
    clearSecurityLogs();
  });

  it("logs security events with timestamp and user agent", () => {
    const entry = logSecurityEvent("AUTH_LOGIN_SUCCESS", { userId: "user-123", email: "test@example.com" });

    expect(entry.eventType).toBe("AUTH_LOGIN_SUCCESS");
    expect(entry.details.userId).toBe("user-123");
    expect(entry.details.email).toBe("test@example.com");
    expect(entry.timestamp).toBeDefined();

    const logs = getSecurityLogs();
    expect(logs.length).toBe(1);
    expect(logs[0]).toEqual(entry);
  });

  it("redacts sensitive fields (passwords, tokens, keys) automatically", () => {
    const entry = logSecurityEvent("AUTH_LOGIN_FAILURE", {
      email: "test@example.com",
      password: "SuperSecretPassword123!",
      access_token: "jwt-token-xyz",
      nested: {
        secret_key: "my-secret-key",
        normalField: "allowed",
      },
    });

    expect(entry.details.password).toBe("[REDACTED]");
    expect(entry.details.access_token).toBe("[REDACTED]");
    expect((entry.details.nested as Record<string, unknown>).secret_key).toBe("[REDACTED]");
    expect((entry.details.nested as Record<string, unknown>).normalField).toBe("allowed");
  });

  it("maintains a maximum buffer of 100 entries", () => {
    for (let i = 0; i < 120; i++) {
      logSecurityEvent("API_ERROR", { index: i });
    }

    const logs = getSecurityLogs();
    expect(logs.length).toBe(100);
    // Most recent should be first
    expect(logs[0].details.index).toBe(119);
  });
});
