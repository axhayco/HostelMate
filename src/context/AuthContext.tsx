// ─── Real Supabase Auth Context ──────────────────────────────────────────────
// Drop this file at:  src/context/AuthContext.tsx

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type UserRole = "student" | "owner";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  loading: boolean;

  // Email + password
  signUpWithEmail: (email: string, password: string, role: UserRole, fullName?: string) => Promise<{ error: string | null }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;

  // Google OAuth
  signInWithGoogle: (role: UserRole) => Promise<{ error: string | null }>;

  // Phone OTP
  sendPhoneOtp: (phone: string) => Promise<{ error: string | null }>;
  verifyPhoneOtp: (phone: string, token: string, role: UserRole) => Promise<{ error: string | null }>;

  // Password reset
  resetPassword: (email: string) => Promise<{ error: string | null }>;

  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Derive role from user_metadata (set at sign-up / OAuth callback)
  const role: UserRole | null =
    (user?.user_metadata?.role as UserRole) ?? null;

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // ── Email sign-up ────────────────────────────────────────────────────────
  const signUpWithEmail = useCallback(
    async (email: string, password: string, role: UserRole, fullName?: string) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { role, full_name: fullName, name: fullName },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      return { error: error?.message ?? null };
    },
    []
  );

  // ── Email sign-in ────────────────────────────────────────────────────────
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  // ── Google OAuth ─────────────────────────────────────────────────────────
  const signInWithGoogle = useCallback(async (role: UserRole) => {
    // Store role in localStorage — survives the full-page OAuth redirect
    localStorage.setItem("hozztl-pending-role", role);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Embed role in redirectTo so it's recoverable even if localStorage clears
        redirectTo: `${window.location.origin}/?role=${role}`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    return { error: error?.message ?? null };
  }, []);

  // ── Phone OTP — send ─────────────────────────────────────────────────────
  const sendPhoneOtp = useCallback(async (phone: string) => {
    // Normalise to E.164: +91XXXXXXXXXX
    const normalised = phone.replace(/[\s-]/g, "").startsWith("+")
      ? phone.replace(/[\s-]/g, "")
      : `+91${phone.replace(/[\s-]/g, "").replace(/^0/, "")}`;

    const { error } = await supabase.auth.signInWithOtp({ phone: normalised });
    return { error: error?.message ?? null };
  }, []);

  // ── Phone OTP — verify ───────────────────────────────────────────────────
  const verifyPhoneOtp = useCallback(
    async (phone: string, token: string, role: UserRole) => {
      const normalised = phone.replace(/[\s-]/g, "").startsWith("+")
        ? phone.replace(/[\s-]/g, "")
        : `+91${phone.replace(/[\s-]/g, "").replace(/^0/, "")}`;

      const { data, error } = await supabase.auth.verifyOtp({
        phone: normalised,
        token,
        type: "sms",
      });

      if (!error && data.user) {
        // Persist role in user_metadata after first phone login
        await supabase.auth.updateUser({ data: { role } });
      }

      return { error: error?.message ?? null };
    },
    []
  );

  // ── Password reset ───────────────────────────────────────────────────────
  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    });
    return { error: error?.message ?? null };
  }, []);

  // ── Sign out ─────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        loading,
        signUpWithEmail,
        signInWithEmail,
        signInWithGoogle,
        sendPhoneOtp,
        verifyPhoneOtp,
        resetPassword,
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