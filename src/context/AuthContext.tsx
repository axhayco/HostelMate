// ─── Real Supabase Auth Context ──────────────────────────────────────────────
// Drop this file at:  src/context/AuthContext.tsx
//
// Security model (see docs/AUTH_SECURITY.md):
//  - The user's ROLE is read from the database (profiles.role), which clients cannot write directly.
//    It is never derived from user_metadata, which any signed-in user can edit.
//  - Unverified email accounts are not treated as signed in.
//  - Sessions end after 30 min idle / 7 days absolute (client-side defence in depth).
//  - Raw server auth errors are never shown to the user.

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { toSafeAuthError, type AuthContextKind } from "@/lib/authErrors";
import { isEmailVerified } from "@/lib/emailVerification";
import { logSecurityEvent } from "@/lib/securityLogger";
import {
  ACTIVITY_WRITE_THROTTLE_MS,
  LAST_ACTIVITY_KEY,
  clearSessionTimestamps,
  getSessionExpiry,
  readTimestamp,
  writeTimestamp,
  type SessionExpiryReason,
} from "@/lib/sessionTimeout";

export type UserRole = "student" | "owner";

export interface AuthResult {
  error: string | null;
  /** Machine-readable code (e.g. "email_not_confirmed") so the UI can offer a targeted action. */
  code?: string;
  /** True when sign-up succeeded but the user must click the emailed link before signing in. */
  needsEmailConfirmation?: boolean;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  /** Authoritative role from the database; null if unknown or not signed in. */
  role: UserRole | null;
  loading: boolean;
  /** True while the user arrived via a password-reset link and must choose a new password. */
  passwordRecovery: boolean;

  // Email + password
  signUpWithEmail: (email: string, password: string, role: UserRole, fullName: string) => Promise<AuthResult>;
  signInWithEmail: (email: string, password: string) => Promise<AuthResult>;
  resendVerificationEmail: (email: string) => Promise<AuthResult>;

  // Google OAuth
  signInWithGoogle: (role: UserRole) => Promise<AuthResult>;

  // Phone OTP
  sendPhoneOtp: (phone: string) => Promise<AuthResult>;
  verifyPhoneOtp: (phone: string, token: string, role: UserRole) => Promise<AuthResult>;

  // Password reset
  resetPassword: (email: string) => Promise<AuthResult>;
  updatePassword: (newPassword: string) => Promise<AuthResult>;
  cancelPasswordRecovery: () => Promise<void>;

  /** One-time account-type selection for users who signed up via OAuth/phone (server enforces once-only). */
  claimRole: (role: UserRole) => Promise<AuthResult>;

  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Captured at module load, BEFORE supabase-js strips the token from the URL. The PASSWORD_RECOVERY
// event can fire before React subscribes, so relying on the event alone could miss it.
const STARTED_IN_RECOVERY =
  typeof window !== "undefined" &&
  /[#&?]type=recovery(&|$)/.test(`${window.location.hash}&${window.location.search}`);

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "scroll", "touchstart"];
const EXPIRY_CHECK_INTERVAL_MS = 30 * 1000;

const toResult = (error: { code?: string; status?: number; message?: string } | null, kind: AuthContextKind): AuthResult => {
  const safe = toSafeAuthError(error, kind);
  return safe ? { error: safe.message, code: safe.code } : { error: null };
};

/** Normalise to E.164: +91XXXXXXXXXX */
const normalisePhone = (phone: string): string => {
  const compact = phone.replace(/[\s-]/g, "");
  return compact.startsWith("+") ? compact : `+91${compact.replace(/^0/, "")}`;
};

const parseTime = (iso: string | undefined): number | null => {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(STARTED_IN_RECOVERY);
  const [roleState, setRoleState] = useState<{ userId: string | null; role: UserRole | null }>({ userId: null, role: null });

  const userId = session?.user.id;
  const lastSignInAt = session?.user.last_sign_in_at;

  // The role only counts if it was loaded for the CURRENT user (avoids a stale role after account switch).
  const role: UserRole | null = user && roleState.userId === user.id ? roleState.role : null;
  const roleResolved = !user || roleState.userId === user.id;
  const loading = authLoading || !roleResolved;

  // ── Session bootstrap + auth events ──────────────────────────────────────
  useEffect(() => {
    const applySession = (next: Session | null) => {
      if (next && !isEmailVerified(next.user)) {
        // Defence in depth: never treat an unverified email account as signed in.
        setSession(null);
        setUser(null);
        // Deferred: awaiting supabase calls inside onAuthStateChange can deadlock the auth lock.
        window.setTimeout(() => { void supabase.auth.signOut({ scope: "local" }); }, 0);
      } else {
        setSession(next);
        setUser(next?.user ?? null);
      }
      setAuthLoading(false);
    };

    supabase.auth.getSession()
      .then(({ data: { session: initial } }) => applySession(initial))
      .catch((err: { code?: string; status?: number }) => {
        console.error("[auth] initial session lookup failed", { code: err?.code, status: err?.status });
        applySession(null);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
      if (event === "SIGNED_OUT") {
        clearSessionTimestamps(localStorage);
        setPasswordRecovery(false);
      }
      applySession(next);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Role lookup (authoritative: profiles.role, fallback to user_metadata.role) ───────────
  const fetchRole = useCallback(async (userId: string, metaRole?: string): Promise<UserRole | null> => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();
      if (!error && (data?.role === "owner" || data?.role === "student")) {
        return data.role;
      }
    } catch { /* database fallback */ }
    if (metaRole === "owner" || metaRole === "student") {
      return metaRole as UserRole;
    }
    return null;
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const userId = user.id;
    const metaRole = user.user_metadata?.role;
    let cancelled = false;
    fetchRole(userId, metaRole).then((resolved) => {
      if (!cancelled) setRoleState({ userId, role: resolved });
    });
    return () => { cancelled = true; };
  }, [user?.id, user?.user_metadata?.role, fetchRole]);

  // ── Sign out ─────────────────────────────────────────────────────────────
  const performSignOut = useCallback(async (scope: "global" | "local") => {
    logSecurityEvent("AUTH_SIGNOUT", { scope, userId });
    clearSessionTimestamps(localStorage);
    const { error } = await supabase.auth.signOut({ scope });
    if (error) console.error("[auth] sign out failed", { code: error.code, status: error.status });
  }, [userId]);

  // Explicit logout revokes every session for the account; idle expiry only ends this device.
  const signOut = useCallback(() => performSignOut("global"), [performSignOut]);

  // ── Session expiry: idle timeout + absolute lifetime ─────────────────────
  useEffect(() => {
    if (!userId) return;

    const endSession = (reason: Exclude<SessionExpiryReason, null>) => {
      toast.info(
        reason === "idle"
          ? "You were signed out after 30 minutes of inactivity."
          : "Your session has expired. Please sign in again.",
      );
      void performSignOut("local");
    };

    const checkExpiry = (): boolean => {
      const reason = getSessionExpiry({
        now: Date.now(),
        lastActivityAt: readTimestamp(localStorage, LAST_ACTIVITY_KEY),
        sessionStartedAt: parseTime(lastSignInAt), // server-issued, so it cannot be reset from the browser
      });
      if (reason) endSession(reason);
      return reason !== null;
    };

    // Evaluate against markers left by a previous visit BEFORE recording new activity.
    if (checkExpiry()) return;
    if (readTimestamp(localStorage, LAST_ACTIVITY_KEY) === null) {
      writeTimestamp(localStorage, LAST_ACTIVITY_KEY, Date.now());
    }

    let lastWrite = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - lastWrite >= ACTIVITY_WRITE_THROTTLE_MS) {
        lastWrite = now;
        writeTimestamp(localStorage, LAST_ACTIVITY_KEY, now);
      }
    };
    const onVisible = () => { if (document.visibilityState === "visible") checkExpiry(); };

    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, onActivity, { passive: true }));
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(checkExpiry, EXPIRY_CHECK_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, onActivity));
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [userId, lastSignInAt, performSignOut]);

  // ── Email sign-up ────────────────────────────────────────────────────────
  const signUpWithEmail = useCallback(
    async (email: string, password: string, requestedRole: UserRole, fullName: string): Promise<AuthResult> => {
      logSecurityEvent("AUTH_SIGNUP_ATTEMPT", { email, role: requestedRole });
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // The DB trigger validates this: only "owner" is honoured, anything else becomes "student".
          data: { role: requestedRole, full_name: fullName, name: fullName },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      if (error) return toResult(error, "signUp");
      // With "Confirm email" enabled Supabase returns the user but NO session until the link is clicked.
      return { error: null, needsEmailConfirmation: !data.session };
    },
    []
  );

  const resendVerificationEmail = useCallback(async (email: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    return toResult(error, "resend");
  }, []);

  // ── Email sign-in ────────────────────────────────────────────────────────
  const signInWithEmail = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return toResult(error, "signIn");
    logSecurityEvent("AUTH_LOGIN_SUCCESS", { email });
    writeTimestamp(localStorage, LAST_ACTIVITY_KEY, Date.now()); // fresh login resets the idle clock
    return { error: null };
  }, []);

  // ── Google OAuth ─────────────────────────────────────────────────────────
  const signInWithGoogle = useCallback(async (requestedRole: UserRole): Promise<AuthResult> => {
    // Survives the full-page OAuth redirect; consumed once via claimRole() (server enforces once-only).
    localStorage.setItem("hozztl-pending-role", requestedRole);
    writeTimestamp(localStorage, LAST_ACTIVITY_KEY, Date.now());
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Embed role in redirectTo so it's recoverable even if localStorage clears
        redirectTo: `${window.location.origin}/?role=${requestedRole}`,
      },
    });
    return toResult(error, "oauth");
  }, []);

  // ── Phone OTP ────────────────────────────────────────────────────────────
  const sendPhoneOtp = useCallback(async (phone: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithOtp({ phone: normalisePhone(phone) });
    return toResult(error, "otpSend");
  }, []);

  // ── One-time role selection (server enforced) ────────────────────────────
  const claimRole = useCallback(async (requestedRole: UserRole): Promise<AuthResult> => {
    const { error } = await supabase.rpc("claim_role", { _role: requestedRole });
    if (error) {
      // Expected when the role was already fixed at sign-up; not user-facing.
      console.error("[auth] claim_role rejected", { code: error.code });
      return { error: "Your account type is already set." };
    }
    if (userId) {
      const resolved = await fetchRole(userId);
      setRoleState({ userId, role: resolved });
    }
    return { error: null };
  }, [userId, fetchRole]);

  const verifyPhoneOtp = useCallback(
    async (phone: string, token: string, requestedRole: UserRole): Promise<AuthResult> => {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: normalisePhone(phone),
        token,
        type: "sms",
      });
      if (error) return toResult(error, "otpVerify");

      writeTimestamp(localStorage, LAST_ACTIVITY_KEY, Date.now());
      if (data.user) {
        // Best effort: first-time phone users pick their type once; returning users are already fixed.
        const { error: roleError } = await supabase.rpc("claim_role", { _role: requestedRole });
        if (roleError) console.error("[auth] claim_role rejected", { code: roleError.code });
      }
      return { error: null };
    },
    []
  );

  // ── Password reset ───────────────────────────────────────────────────────
  const resetPassword = useCallback(async (email: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    });
    return toResult(error, "reset");
  }, []);

  const updatePassword = useCallback(async (newPassword: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return toResult(error, "update");

    // A reset implies the old credential may be compromised: revoke every OTHER session.
    const { error: revokeError } = await supabase.auth.signOut({ scope: "others" });
    if (revokeError) console.error("[auth] revoking other sessions failed", { code: revokeError.code });

    writeTimestamp(localStorage, LAST_ACTIVITY_KEY, Date.now());
    setPasswordRecovery(false);
    return { error: null };
  }, []);

  const cancelPasswordRecovery = useCallback(async () => {
    setPasswordRecovery(false);
    await performSignOut("local");
  }, [performSignOut]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        loading,
        passwordRecovery,
        signUpWithEmail,
        signInWithEmail,
        resendVerificationEmail,
        signInWithGoogle,
        sendPhoneOtp,
        verifyPhoneOtp,
        resetPassword,
        updatePassword,
        cancelPasswordRecovery,
        claimRole,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};