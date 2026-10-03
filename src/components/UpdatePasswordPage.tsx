import { useState } from "react";
import { Lock, Eye, EyeOff, AlertCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { useAuth } from "@/context/AuthContext";
import { newPasswordSchema, validateField, PASSWORD_MIN_LENGTH } from "@/lib/validation";
import { formSubmitLimiter } from "@/lib/rateLimiter";

/**
 * Shown when the user arrives from a password-reset email. The reset link grants a temporary
 * "recovery" session; this screen is the ONLY thing reachable until a new password is set (or the
 * user cancels, which signs the recovery session out).
 */
const UpdatePasswordPage = () => {
  const { updatePassword, cancelPasswordRecovery } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const inputClass =
    "w-full rounded-xl border border-input bg-background py-3 pl-10 pr-10 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-ring/20";

  const handleSubmit = async () => {
    setError(null);

    const parsed = validateField(newPasswordSchema, { password, confirmPassword });
    if (!parsed.success) { setError(parsed.error); return; }

    const limit = formSubmitLimiter.tryConsume("password_update");
    if (!limit.allowed) {
      setError(`Too many attempts. Please try again in ${Math.ceil(limit.retryAfterMs / 1000)}s.`);
      return;
    }

    setLoading(true);
    const result = await updatePassword(parsed.data.password);
    setLoading(false);

    if (result.error) { setError(result.error); return; }
    toast.success("Password updated. Other devices have been signed out.");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) void handleSubmit();
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-background px-6 pt-12">
      <div className="w-full max-w-sm animate-fade-up" style={{ animationFillMode: "both" }}>
        <div className="mb-8 flex flex-col items-center">
          <img src={logo} alt="Hozztl" className="mb-4 h-20 w-20" />
          <h1 className="text-2xl font-bold text-foreground">Set a new password</h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Choose a strong password you don't use anywhere else.
          </p>
        </div>

        <div className="rounded-2xl bg-card p-6 shadow-card space-y-4">
          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-xl bg-destructive/10 px-3.5 py-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-foreground">
              New password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="new-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                onKeyDown={handleKeyDown}
                autoComplete="new-password"
                className={inputClass}
                placeholder={`Min ${PASSWORD_MIN_LENGTH} characters`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              At least {PASSWORD_MIN_LENGTH} characters, with upper and lower case letters and a number.
            </p>
          </div>

          <div>
            <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-foreground">
              Confirm new password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                onKeyDown={handleKeyDown}
                autoComplete="new-password"
                className={inputClass}
                placeholder="Re-enter password"
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.98] disabled:opacity-60"
          >
            {loading
              ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              : <><span>Update password</span><ArrowRight className="h-4 w-4" /></>
            }
          </button>

          <button
            type="button"
            onClick={() => void cancelPasswordRecovery()}
            disabled={loading}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground hover:underline disabled:opacity-50"
          >
            Cancel and return to sign in
          </button>
        </div>
      </div>
    </main>
  );
};

export default UpdatePasswordPage;
