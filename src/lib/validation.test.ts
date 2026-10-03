import { describe, it, expect } from "vitest";
import {
    validateField,
    signInSchema,
    signUpSchema,
    resetEmailSchema,
    newPasswordSchema,
    PASSWORD_MIN_LENGTH,
} from "@/lib/validation";

describe("password policy (sign-up)", () => {
    const base = { email: "user@example.com", fullName: "Test User" };

    it("accepts a strong password", () => {
        const r = validateField(signUpSchema, { ...base, password: "Str0ngPassw0rd!" });
        expect(r.success).toBe(true);
    });

    it("rejects the old 6-character minimum", () => {
        const r = validateField(signUpSchema, { ...base, password: "Ab1xyz" });
        expect(r.success).toBe(false);
        if (!r.success) expect(r.error).toContain(`at least ${PASSWORD_MIN_LENGTH}`);
    });

    it("rejects passwords missing a character class", () => {
        expect(validateField(signUpSchema, { ...base, password: "alllowercase123" }).success).toBe(false);
        expect(validateField(signUpSchema, { ...base, password: "ALLUPPERCASE123" }).success).toBe(false);
        expect(validateField(signUpSchema, { ...base, password: "NoDigitsAtAllHere" }).success).toBe(false);
    });

    it("rejects over-long passwords", () => {
        const r = validateField(signUpSchema, { ...base, password: "Aa1" + "x".repeat(200) });
        expect(r.success).toBe(false);
    });

    it("requires a full name on sign-up", () => {
        expect(validateField(signUpSchema, { email: base.email, password: "Str0ngPassw0rd!" }).success).toBe(false);
    });
});

describe("sign-in schema", () => {
    it("does not apply the strength policy, so legacy weak passwords can still sign in", () => {
        const r = validateField(signInSchema, { email: "user@example.com", password: "abc123" });
        expect(r.success).toBe(true);
    });

    it("rejects empty password and malformed email", () => {
        expect(validateField(signInSchema, { email: "user@example.com", password: "" }).success).toBe(false);
        expect(validateField(signInSchema, { email: "not-an-email", password: "x" }).success).toBe(false);
    });
});

describe("reset + new password schemas", () => {
    it("reset only needs a valid email (no password bypass hack)", () => {
        expect(validateField(resetEmailSchema, { email: "user@example.com" }).success).toBe(true);
        expect(validateField(resetEmailSchema, { email: "nope" }).success).toBe(false);
    });

    it("new password must be strong and match confirmation", () => {
        expect(validateField(newPasswordSchema, { password: "Str0ngPassw0rd!", confirmPassword: "Str0ngPassw0rd!" }).success).toBe(true);
        const mismatch = validateField(newPasswordSchema, { password: "Str0ngPassw0rd!", confirmPassword: "different" });
        expect(mismatch.success).toBe(false);
        if (!mismatch.success) expect(mismatch.error).toContain("do not match");
        expect(validateField(newPasswordSchema, { password: "weak", confirmPassword: "weak" }).success).toBe(false);
    });
});
