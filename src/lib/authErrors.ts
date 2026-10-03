/**
 * Maps raw Supabase Auth errors to messages that are safe to show end users.
 *
 * Why: raw GoTrue messages can reveal whether an account exists ("User already registered"),
 * internal state, or provider details. We log only the machine-readable code/status for
 * diagnostics and show a fixed, generic message to the user.
 */

import { logSecurityEvent } from "./securityLogger";

export type AuthContextKind = "signIn" | "signUp" | "otpSend" | "otpVerify" | "oauth" | "reset" | "update" | "resend";

export interface SafeAuthError {
    /** Message that is safe to render in the UI. */
    message: string;
    /** Machine-readable GoTrue error code (e.g. "email_not_confirmed"), if any. */
    code?: string;
}

interface AuthErrorLike {
    code?: string;
    status?: number;
    message?: string;
}

const RATE_LIMIT_CODES = new Set([
    "over_request_rate_limit",
    "over_email_send_rate_limit",
    "over_sms_send_rate_limit",
]);

const GENERIC: Record<AuthContextKind, string> = {
    signIn: "Invalid email or password.",
    signUp: "We couldn't create your account. Please check your details and try again.",
    otpSend: "We couldn't send the code. Please try again shortly.",
    otpVerify: "That code is invalid or has expired. Request a new one and try again.",
    oauth: "Google sign-in failed. Please try again.",
    reset: "We couldn't process that request. Please try again shortly.",
    update: "We couldn't update your password. The link may have expired - request a new reset email.",
    resend: "We couldn't resend the email. Please try again shortly.",
};

export function toSafeAuthError(error: AuthErrorLike | null | undefined, kind: AuthContextKind): SafeAuthError | null {
    if (!error) return null;

    const code = error.code;
    const rateLimited = error.status === 429 || (code !== undefined && RATE_LIMIT_CODES.has(code));

    // Diagnostics & Security Audit Logging
    logSecurityEvent(rateLimited ? "RATE_LIMIT_EXCEEDED" : "AUTH_LOGIN_FAILURE", { kind, code, status: error.status });
    console.error("[auth] request failed", { kind, code, status: error.status });
    if (error.status === 500 || code === "unexpected_failure") {
      console.error("[auth] HTTP 500 unexpected_failure: The database trigger (handle_new_user) on auth.users failed on your remote Supabase database. Please execute the handle_new_user SQL script in your Supabase SQL Editor.");
    }

    if (rateLimited) {
        return { message: "Too many attempts. Please wait a few minutes and try again.", code };
    }

    // Only reachable after a correct password, so it does not enable account enumeration.
    if (code === "email_not_confirmed") {
        return { message: "Please verify your email address first. Check your inbox for the confirmation link.", code };
    }

    if (code === "weak_password") {
        return { message: "That password is too weak. Use at least 12 characters with upper and lower case letters and a number.", code };
    }

    return { message: GENERIC[kind], code };
}
