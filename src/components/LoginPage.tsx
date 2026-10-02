// ─── LoginPage.tsx — Real Auth (Email + Password + Google + Phone OTP) ────────
// Drop this file at:  src/components/LoginPage.tsx
// Replaces the existing mock LoginPage entirely.

import logo from "@/assets/logo.png";
import { useState } from "react";
import {
  Mail, Phone, ArrowRight, Lock, Eye, EyeOff,
  AlertCircle, Hash, User,
} from "lucide-react";
import { useAuth, type UserRole } from "@/context/AuthContext";
import { authLimiter, otpResendLimiter } from "@/lib/rateLimiter";
import { loginEmailSchema, loginPhoneSchema, otpVerifySchema, validateField, sanitizeText } from "@/lib/validation";

type AuthMode = "email" | "phone";
type PhoneStep = "input" | "otp";

interface LoginPageProps {
  onLogin: () => void;
  role: UserRole;
  onBack?: () => void;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^(\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}$/;

const LoginPage = ({ onLogin, role, onBack }: LoginPageProps) => {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, sendPhoneOtp, verifyPhoneOtp, resetPassword } = useAuth();

  const [mode, setMode] = useState<AuthMode>("email");
  const [isSignUp, setIsSignUp] = useState(false);
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("input");

  // Email fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Phone fields
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const clearMessages = () => { setError(null); setInfo(null); };

  const handleEmailSubmit = async () => {
    clearMessages();

    // Rate Limiting
    const limit = authLimiter.tryConsume("auth_email");
    if (!limit.allowed) {
      setError(`Too many attempts. Please try again in ${Math.ceil(limit.retryAfterMs / 1000)}s.`);
      return;
    }

    // Validation & Sanitization
    const sanitizedEmail = sanitizeText(email).toLowerCase();
    const sanitizedName = isSignUp ? sanitizeText(fullName) : undefined;

    const validation = validateField(loginEmailSchema, {
      email: sanitizedEmail,
      password,
      fullName: sanitizedName,
    });

    if ("success" in validation && "data" in validation && validation.success) {
      setLoading(true);
      if (isSignUp) {
        const { error } = await signUpWithEmail(validation.data.email, validation.data.password, role, validation.data.fullName || "");
        if (error) { setError(error); }
        else { onLogin(); }
      } else {
        const { error } = await signInWithEmail(validation.data.email, validation.data.password);
        if (error) { setError(error); }
        else { onLogin(); }
      }
      setLoading(false);
    } else if ("error" in validation) {
      setError(validation.error as string);
    }
  };

  // ── Google OAuth ───────────────────────────────────────────────────────
  const handleGoogle = async () => {
    clearMessages();

    const limit = authLimiter.tryConsume("auth_google");
    if (!limit.allowed) {
      setError(`Too many attempts. Please try again in ${Math.ceil(limit.retryAfterMs / 1000)}s.`);
      return;
    }

    setLoading(true);
    const { error } = await signInWithGoogle(role);
    if (error) { setError(error); setLoading(false); }
    // On success the page redirects — loading stays true
  };

  // ── Phone OTP — send ───────────────────────────────────────────────────
  const handleSendOtp = async (isResend = false) => {
    clearMessages();

    const limiter = isResend ? otpResendLimiter : authLimiter;
    const limit = limiter.tryConsume(isResend ? "auth_otp_resend" : "auth_otp_send");
    if (!limit.allowed) {
      setError(`Too many attempts. Please try again in ${Math.ceil(limit.retryAfterMs / 1000)}s.`);
      return;
    }

    const validation = validateField(loginPhoneSchema, { phone: sanitizeText(phone) });
    if ("success" in validation && "data" in validation && validation.success) {
      setLoading(true);
      const { error } = await sendPhoneOtp(validation.data.phone!);
      if (error) { setError(error); }
      else { setPhoneStep("otp"); setInfo(`OTP sent to ${validation.data.phone}`); }
      setLoading(false);
    } else if ("error" in validation) {
      setError(validation.error as string);
    }
  };

  // ── Phone OTP — verify ─────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    clearMessages();

    const limit = authLimiter.tryConsume("auth_otp_verify");
    if (!limit.allowed) {
      setError(`Too many attempts. Please try again in ${Math.ceil(limit.retryAfterMs / 1000)}s.`);
      return;
    }

    const validation = validateField(otpVerifySchema, {
      phone: sanitizeText(phone),
      otp: sanitizeText(otp)
    });

    if ("success" in validation && "data" in validation && validation.success) {
      setLoading(true);
      const { error } = await verifyPhoneOtp(validation.data.phone!, validation.data.otp!, role);
      if (error) { setError(error); }
      else { onLogin(); }
      setLoading(false);
    } else if ("error" in validation) {
      setError(validation.error as string);
    }
  };

  // ── Forgot password ────────────────────────────────────────────────────
  const handleForgotPassword = async () => {
    clearMessages();

    const limit = authLimiter.tryConsume("auth_forgot_password");
    if (!limit.allowed) {
      setError(`Too many attempts. Please try again in ${Math.ceil(limit.retryAfterMs / 1000)}s.`);
      return;
    }

    const sanitizedEmail = sanitizeText(email).toLowerCase();
    const validation = validateField(loginEmailSchema, { email: sanitizedEmail, password: "temp_password_bypass", fullName: "" }); // bypass pass check

    if (validation.success || ("error" in validation && (validation.error as string).includes("Password"))) {
      setLoading(true);
      const { error } = await resetPassword(sanitizedEmail);
      if (error) { setError(error); }
      else { setInfo("Password reset email sent — check your inbox."); }
      setLoading(false);
    } else {
      setError("Enter your email address above first");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;
    if (mode === "email") handleEmailSubmit();
    else if (phoneStep === "input") handleSendOtp();
    else handleVerifyOtp();
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-6 pt-12">
      <div className="w-full max-w-sm animate-fade-up" style={{ animationFillMode: "both" }}>

        {/* Logo + Title */}
        <div className="mb-8 flex flex-col items-center">
          <img src={logo} alt="HostelMate" className="mb-4 h-20 w-20" />
          <h1 className="text-2xl font-bold text-foreground">
            {role === "owner" ? "Owner Login" : "Student Login"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {role === "owner" ? "Manage your hostel listings" : "Sign in to find your perfect hostel"}
          </p>
        </div>

        {/* Mode tabs */}
        <div className="mb-4 flex rounded-xl bg-secondary p-1">
          {(["email", "phone"] as AuthMode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); clearMessages(); setPhoneStep("input"); }}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${mode === m
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              {m === "email" ? "📧 Email" : "📱 Phone OTP"}
            </button>
          ))}
        </div>

        <div className="rounded-2xl bg-card p-6 shadow-card space-y-4">

          {/* ── Error / Info banners ── */}
          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-destructive/10 px-3.5 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}
          {info && (
            <div className="rounded-xl bg-success/10 px-3.5 py-3 text-sm text-success">
              {info}
            </div>
          )}

          {/* ── EMAIL MODE ── */}
          {mode === "email" && (
            <>
              {/* Full Name */}
              {isSignUp && (
                <div className="mb-4">
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => { setFullName(e.target.value); clearMessages(); }}
                      onKeyDown={handleKeyDown}
                      placeholder="John Doe"
                      className="w-full rounded-xl border border-input bg-background py-3 pl-10 pr-4 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-ring/20"
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div className="mb-4">
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); clearMessages(); }}
                    onKeyDown={handleKeyDown}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-input bg-background py-3 pl-10 pr-4 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-ring/20"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="mb-4">
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearMessages(); }}
                    onKeyDown={handleKeyDown}
                    placeholder={isSignUp ? "Create a password (min 6 chars)" : "Enter password"}
                    className="w-full rounded-xl border border-input bg-background py-3 pl-10 pr-10 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-ring/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Forgot password */}
              {!isSignUp && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleEmailSubmit}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
              >
                {loading
                  ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  : <><span>{isSignUp ? "Create Account" : "Sign In"}</span><ArrowRight className="h-4 w-4" /></>
                }
              </button>

              {/* Toggle sign up / sign in */}
              <p className="text-center text-xs text-muted-foreground">
                {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => { setIsSignUp(!isSignUp); clearMessages(); }}
                  className="font-semibold text-primary hover:underline"
                >
                  {isSignUp ? "Sign In" : "Sign Up"}
                </button>
              </p>
            </>
          )}

          {/* ── PHONE MODE ── */}
          {mode === "phone" && phoneStep === "input" && (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Indian Mobile Number
                </label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); clearMessages(); }}
                    onKeyDown={handleKeyDown}
                    placeholder="9876543210"
                    maxLength={13}
                    className="w-full rounded-xl border border-input bg-background py-3 pl-10 pr-4 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-ring/20"
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  We'll send a 6-digit OTP via SMS
                </p>
              </div>

              <button
                onClick={() => handleSendOtp(false)}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
              >
                {loading
                  ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  : <><span>Send OTP</span><ArrowRight className="h-4 w-4" /></>
                }
              </button>
            </>
          )}

          {mode === "phone" && phoneStep === "otp" && (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Enter OTP
                </label>
                <p className="mb-3 text-xs text-muted-foreground">
                  Sent to {phone} —{" "}
                  <button
                    type="button"
                    onClick={() => { setPhoneStep("input"); setOtp(""); clearMessages(); }}
                    className="text-primary hover:underline"
                  >
                    change
                  </button>
                </p>
                <div className="relative">
                  <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="number"
                    value={otp}
                    onChange={(e) => { setOtp(e.target.value.slice(0, 6)); clearMessages(); }}
                    onKeyDown={handleKeyDown}
                    placeholder="6-digit OTP"
                    className="w-full rounded-xl border border-input bg-background py-3 pl-10 pr-4 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-ring/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>

              <button
                onClick={handleVerifyOtp}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
              >
                {loading
                  ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  : <><span>Verify & Sign In</span><ArrowRight className="h-4 w-4" /></>
                }
              </button>

              <button
                type="button"
                onClick={() => handleSendOtp(true)}
                disabled={loading}
                className="w-full text-center text-xs text-primary hover:underline disabled:opacity-50"
              >
                Resend OTP
              </button>
            </>
          )}

          {/* ── Divider + Google (both modes) ── */}
          {!(mode === "phone" && phoneStep === "otp") && (
            <>
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <button
                onClick={handleGoogle}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-input bg-background py-3 text-sm font-medium text-foreground transition-all hover:bg-secondary active:scale-[0.98] disabled:opacity-60"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.35-1.04 2.5-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1c-4.3 0-8.01 2.47-9.82 6.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;