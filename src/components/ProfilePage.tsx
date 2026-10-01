import { useState, useEffect } from "react";
import { Camera, User, Mail, Phone, MapPin, Save, Check, HelpCircle, PhoneCall, LogOut, LogIn } from "lucide-react";
import { DEFAULT_AVATAR_IMAGE, handleImageError } from "@/lib/imageUtils";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { profileSchema, validateField, sanitizeText } from "@/lib/validation";
import { formSubmitLimiter } from "@/lib/rateLimiter";

interface ProfilePageProps {
  isGuest?: boolean;
  onBack: () => void;
  onNavigate?: (page: string) => void;
  onSignOut?: () => void;
}

const ProfilePage = ({ isGuest, onBack, onNavigate, onSignOut }: ProfilePageProps) => {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    college: "",
    bio: "",
    avatar: "",
  });

  // Load profile: first from Supabase, fall back to auth metadata
  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const loadProfile = async () => {
      setLoading(true);

      // Try to fetch from the profiles table
      const { data } = await supabase
        .from("profiles")
        .select("name, email, profile_photo")
        .eq("user_id", user.id)
        .maybeSingle();

      const meta = user.user_metadata ?? {};

      setProfile({
        name: data?.name || meta.full_name || meta.name || user.email?.split("@")[0] || "",
        email: data?.email || user.email || "",
        phone: meta.phone || "",
        college: meta.college || "",
        bio: meta.bio || "",
        avatar: data?.profile_photo || meta.avatar_url || "",
      });

      setLoading(false);
    };

    loadProfile();
  }, [user?.id]);

  const handleSave = async () => {
    if (!user) return;

    // Rate Limiting
    const limit = formSubmitLimiter.tryConsume("profile_save");
    if (!limit.allowed) {
      alert(`Too many save attempts. Please try again in ${Math.ceil(limit.retryAfterMs / 1000)}s.`);
      return;
    }

    // Validation & Sanitization
    const validation = validateField(profileSchema, {
      name: sanitizeText(profile.name),
      email: sanitizeText(profile.email).toLowerCase(),
      phone: sanitizeText(profile.phone),
      college: sanitizeText(profile.college),
      bio: sanitizeText(profile.bio),
    });

    if ("success" in validation && "data" in validation && validation.success) {
      const validData = validation.data;
      setLoading(true);

      try {
        // Upsert into profiles table (may fail due to RLS, handle gracefully)
        const { error: dbError } = await supabase.from("profiles").upsert({
          user_id: user.id,
          name: validData.name,
          email: validData.email,
        });

        if (dbError) {
          console.warn("Could not save to profiles table (likely RLS), proceeding with auth metadata:", dbError);
        }

        // Also persist extra fields (phone, college, bio) to auth metadata
        const { error: authError } = await supabase.auth.updateUser({
          data: {
            full_name: validData.name,
            name: validData.name,
            phone: validData.phone,
            college: validData.college,
            bio: validData.bio,
          },
        });

        if (authError) throw authError;

        await supabase.auth.refreshSession();

        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch (err) {
        alert((err as Error).message || "Failed to save profile details");
      } finally {
        setLoading(false);
      }
    } else if ("error" in validation) {
      alert(validation.error as string);
      return;
    }
  };

  const inputClass =
    "w-full rounded-xl border border-input bg-background py-2.5 px-3 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-ring/20";

  if (isGuest) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="mx-auto max-w-5xl px-4 pt-6">
          <h1 className="text-2xl font-bold text-foreground mb-1">Profile</h1>
          <p className="text-sm text-muted-foreground mb-6">Guest Account</p>
        </div>
        <main className="mx-auto max-w-lg px-4 flex flex-col items-center justify-center mt-10">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-secondary text-muted-foreground mb-4">
            <User className="h-10 w-10" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Sign in to view your profile</h2>
          <p className="text-sm text-center text-muted-foreground mb-8">Save your favorite hostels, view your trips, and message owners.</p>
          <button
            onClick={() => onNavigate?.("role-select")}
            className="flex w-full max-w-sm items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 active:scale-[0.98]"
          >
            <LogIn className="h-4 w-4" /> Sign In / Sign Up
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-5xl px-4 pt-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">Profile</h1>
        <p className="text-sm text-muted-foreground mb-6">Manage your account</p>
      </div>

      <main className="mx-auto max-w-lg px-4 space-y-5">
        {/* Avatar */}
        <div className="flex flex-col items-center">
          <div className="relative">
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt="avatar"
                onError={(e) => handleImageError(e, DEFAULT_AVATAR_IMAGE)}
                className="h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="h-10 w-10" />
              </div>
            )}
            <button className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
              <Camera className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-3 text-lg font-bold text-foreground">
            {loading ? "Loading…" : profile.name || "Your Account"}
          </p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>

        {/* Form */}
        <div className="rounded-2xl bg-card p-5 shadow-card space-y-4">
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <User className="h-3.5 w-3.5" /> Full Name
            </label>
            <input type="text" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className={inputClass} placeholder="Your full name" />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Mail className="h-3.5 w-3.5" /> Email
            </label>
            <input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className={inputClass} placeholder="you@example.com" />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Phone className="h-3.5 w-3.5" /> Phone
            </label>
            <input type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className={inputClass} placeholder="+91 XXXXX XXXXX" />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> College / Institution
            </label>
            <input type="text" value={profile.college} onChange={(e) => setProfile({ ...profile, college: e.target.value })} className={inputClass} placeholder="Your college" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Bio</label>
            <textarea rows={3} value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} maxLength={150} className={`${inputClass} resize-none`} placeholder="Tell us about yourself…" />
            <p className="mt-1 text-right text-[10px] text-muted-foreground">{profile.bio.length}/150</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-60"
        >
          {saved ? <><Check className="h-4 w-4" /> Saved!</> : <><Save className="h-4 w-4" /> Save Changes</>}
        </button>

        {/* Quick Links */}
        <div className="rounded-2xl bg-card shadow-card overflow-hidden">
          <button onClick={() => onNavigate?.("help")} className="flex w-full items-center gap-3 px-5 py-4 text-sm text-foreground transition-colors hover:bg-secondary border-b border-border">
            <HelpCircle className="h-4 w-4 text-muted-foreground" /> Help Center
          </button>
          <button onClick={() => onNavigate?.("contact")} className="flex w-full items-center gap-3 px-5 py-4 text-sm text-foreground transition-colors hover:bg-secondary border-b border-border">
            <PhoneCall className="h-4 w-4 text-muted-foreground" /> Contact Us
          </button>
          <button onClick={onSignOut} className="flex w-full items-center gap-3 px-5 py-4 text-sm text-destructive transition-colors hover:bg-secondary">
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;
