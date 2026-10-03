import { useState, useEffect } from "react";
import {
  Camera, User, Mail, Phone, MapPin, Save, Check, HelpCircle, PhoneCall,
  LogOut, LogIn, Building2, ShieldCheck, GraduationCap, Briefcase, Calendar,
  Home, PhoneOff, Plus, Compass, Heart, CalendarDays
} from "lucide-react";
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
  const { user, role } = useAuth();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Unified profile state supporting both Student and Owner fields
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    // Student specific
    college: "",
    branchYear: "",
    hometown: "",
    emergencyPhone: "",
    // Owner specific
    businessName: "",
    businessAddress: "",
    operatingSince: "",
    // General
    bio: "",
    avatar: "",
  });

  // Load profile: first from Supabase profiles table, fall back to user metadata
  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const loadProfile = async () => {
      setLoading(true);

      const meta = user.user_metadata ?? {};

      try {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, email, avatar_url, phone")
          .eq("id", user.id)
          .maybeSingle();

        setProfile({
          name: data?.full_name || meta.full_name || meta.name || user.email?.split("@")[0] || "",
          email: data?.email || user.email || "",
          phone: data?.phone || meta.phone || "",
          college: meta.college || "",
          branchYear: meta.branchYear || meta.branch_year || "",
          hometown: meta.hometown || "",
          emergencyPhone: meta.emergencyPhone || meta.emergency_phone || "",
          businessName: meta.businessName || meta.business_name || "",
          businessAddress: meta.businessAddress || meta.business_address || "",
          operatingSince: meta.operatingSince || meta.operating_since || "",
          bio: meta.bio || "",
          avatar: data?.avatar_url || meta.avatar_url || "",
        });
      } catch (err) {
        console.warn("Could not load from profiles table, using auth metadata:", err);
        setProfile({
          name: meta.full_name || meta.name || user.email?.split("@")[0] || "",
          email: user.email || "",
          phone: meta.phone || "",
          college: meta.college || "",
          branchYear: meta.branchYear || meta.branch_year || "",
          hometown: meta.hometown || "",
          emergencyPhone: meta.emergencyPhone || meta.emergency_phone || "",
          businessName: meta.businessName || meta.business_name || "",
          businessAddress: meta.businessAddress || meta.business_address || "",
          operatingSince: meta.operatingSince || meta.operating_since || "",
          bio: meta.bio || "",
          avatar: meta.avatar_url || "",
        });
      } finally {
        setLoading(false);
      }
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
      branchYear: sanitizeText(profile.branchYear),
      hometown: sanitizeText(profile.hometown),
      emergencyPhone: sanitizeText(profile.emergencyPhone),
      businessName: sanitizeText(profile.businessName),
      businessAddress: sanitizeText(profile.businessAddress),
      operatingSince: sanitizeText(profile.operatingSince),
      bio: sanitizeText(profile.bio),
    });

    if ("success" in validation && "data" in validation && validation.success) {
      const validData = validation.data;
      setLoading(true);

      try {
        // Upsert core fields into profiles table
        const { error: dbError } = await supabase.from("profiles").upsert({
          id: user.id,
          full_name: validData.name,
          email: validData.email,
          phone: validData.phone,
        });

        if (dbError) {
          console.warn("Could not save to profiles table, proceeding with auth metadata:", dbError);
        }

        // Persist role-specific metadata into auth metadata
        const { error: authError } = await supabase.auth.updateUser({
          data: {
            full_name: validData.name,
            name: validData.name,
            phone: validData.phone,
            college: validData.college,
            branchYear: validData.branchYear,
            hometown: validData.hometown,
            emergencyPhone: validData.emergencyPhone,
            businessName: validData.businessName,
            businessAddress: validData.businessAddress,
            operatingSince: validData.operatingSince,
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

  const metaRole = user?.user_metadata?.role;
  const isOwner = role === "owner" || metaRole === "owner" || (user?.email?.toLowerCase().includes("owner") ?? false);

  const requiredFields = isOwner
    ? [
        { key: "name", label: "Full Name", value: profile.name },
        { key: "phone", label: "Phone Number", value: profile.phone },
        { key: "businessName", label: "Business Name", value: profile.businessName },
        { key: "businessAddress", label: "Office Address", value: profile.businessAddress },
      ]
    : [
        { key: "name", label: "Full Name", value: profile.name },
        { key: "phone", label: "Phone Number", value: profile.phone },
        { key: "college", label: "College / University", value: profile.college },
        { key: "branchYear", label: "Branch / Year", value: profile.branchYear },
      ];

  const completedFields = requiredFields.filter((f) => Boolean(f.value?.trim()));
  const missingFields = requiredFields.filter((f) => !f.value?.trim());
  const isProfileComplete = missingFields.length === 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-5xl px-4 pt-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">
            {isOwner ? "Owner & Business Profile" : "Student Profile"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isOwner ? "Manage property host details and business contact" : "Manage your student account and room preferences"}
          </p>
        </div>
        {isOwner && (
          <button
            onClick={() => onNavigate?.("owner")}
            className="flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-95"
          >
            <Building2 className="h-4 w-4" /> Owner Dashboard
          </button>
        )}
      </div>

      <main className="mx-auto max-w-lg px-4 mt-4 space-y-5">
        {/* Profile Card Header */}
        <div className="flex flex-col items-center rounded-2xl bg-card p-5 shadow-card">
          <div className="relative">
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt="avatar"
                onError={(e) => handleImageError(e, DEFAULT_AVATAR_IMAGE)}
                className="h-24 w-24 rounded-full object-cover border-2 border-primary/20 shadow-md"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-primary border-2 border-primary/20">
                {isOwner ? <Building2 className="h-10 w-10" /> : <GraduationCap className="h-10 w-10" />}
              </div>
            )}
            <button className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-all hover:scale-105">
              <Camera className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-3 text-lg font-bold text-foreground">
            {loading ? "Loading…" : profile.name || (isOwner ? "Hostel Owner" : "Student User")}
          </p>
          <div className="mt-1 flex items-center gap-2 flex-wrap justify-center">
            <span className="text-xs text-muted-foreground">{user?.email}</span>
            {isProfileComplete ? (
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                {isOwner ? "Verified Property Owner" : "Verified Student"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                {isOwner ? "Owner (Unverified)" : "Student (Unverified)"}
              </span>
            )}
          </div>

          {/* Profile Completion Callout (Only shown when profile is incomplete) */}
          {!isProfileComplete && !loading && (
            <div className="mt-4 w-full rounded-xl bg-amber-500/10 border border-amber-500/20 p-3.5 text-left">
              <div className="flex items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-300 mb-1">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-amber-500" />
                  Complete Profile for Verified Badge
                </span>
                <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                  {completedFields.length}/{requiredFields.length} Completed
                </span>
              </div>
              <p className="text-[11.5px] text-amber-700/80 dark:text-amber-300/80 mb-2">
                Fill in <span className="font-semibold">{missingFields.map((f) => f.label).join(", ")}</span> to unlock your verified badge.
              </p>
              <div className="w-full bg-amber-500/20 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full transition-all duration-500 rounded-full"
                  style={{ width: `${(completedFields.length / requiredFields.length) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Form Sections */}
        <div className="rounded-2xl bg-card p-5 shadow-card space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
            Personal Information
          </h2>
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <User className="h-3.5 w-3.5" /> Full Name
            </label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className={inputClass}
              placeholder={isOwner ? "Owner / Manager Full Name" : "Your Full Name"}
            />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Mail className="h-3.5 w-3.5" /> Email Address
            </label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              className={inputClass}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Phone className="h-3.5 w-3.5" /> Phone Number
            </label>
            <input
              type="tel"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              className={inputClass}
              placeholder="+91 98765 43210"
            />
          </div>
        </div>

        {/* Role-Specific Details Section */}
        {isOwner ? (
          /* OWNER SPECIFIC FIELDS */
          <div className="rounded-2xl bg-card p-5 shadow-card space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 border-b border-border pb-2 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> Business & Hostel Management Details
            </h2>
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Briefcase className="h-3.5 w-3.5" /> Business / Property Group Name
              </label>
              <input
                type="text"
                value={profile.businessName}
                onChange={(e) => setProfile({ ...profile, businessName: e.target.value })}
                className={inputClass}
                placeholder="e.g. Sri Lakshmi Hostel Group"
              />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" /> Main Office / Business Address
              </label>
              <input
                type="text"
                value={profile.businessAddress}
                onChange={(e) => setProfile({ ...profile, businessAddress: e.target.value })}
                className={inputClass}
                placeholder="e.g. Plot 42, Hitech City Main Rd, Hyderabad"
              />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" /> Operating Experience / Since Year
              </label>
              <input
                type="text"
                value={profile.operatingSince}
                onChange={(e) => setProfile({ ...profile, operatingSince: e.target.value })}
                className={inputClass}
                placeholder="e.g. 5+ Years (Since 2019)"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                Host / Property Bio & House Rules Note
              </label>
              <textarea
                rows={3}
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                maxLength={250}
                className={`${inputClass} resize-none`}
                placeholder="Describe your hospitality standards, safety rules, and message for students..."
              />
              <p className="mt-1 text-right text-[10px] text-muted-foreground">{profile.bio.length}/250</p>
            </div>
          </div>
        ) : (
          /* STUDENT SPECIFIC FIELDS */
          <div className="rounded-2xl bg-card p-5 shadow-card space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-border pb-2 flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5" /> Academic & Student Details
            </h2>
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <GraduationCap className="h-3.5 w-3.5" /> College / Institution
              </label>
              <input
                type="text"
                value={profile.college}
                onChange={(e) => setProfile({ ...profile, college: e.target.value })}
                className={inputClass}
                placeholder="e.g. JNTU Hyderabad / CBIT"
              />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Briefcase className="h-3.5 w-3.5" /> Branch & Year of Study
              </label>
              <input
                type="text"
                value={profile.branchYear}
                onChange={(e) => setProfile({ ...profile, branchYear: e.target.value })}
                className={inputClass}
                placeholder="e.g. B.Tech CSE - 3rd Year"
              />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Home className="h-3.5 w-3.5" /> Hometown / Native Place
              </label>
              <input
                type="text"
                value={profile.hometown}
                onChange={(e) => setProfile({ ...profile, hometown: e.target.value })}
                className={inputClass}
                placeholder="e.g. Vijayawada, Andhra Pradesh"
              />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Phone className="h-3.5 w-3.5" /> Emergency Contact Number (Parent/Guardian)
              </label>
              <input
                type="tel"
                value={profile.emergencyPhone}
                onChange={(e) => setProfile({ ...profile, emergencyPhone: e.target.value })}
                className={inputClass}
                placeholder="+91 98765 43210 (Parent Phone)"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                Student Bio & Roommate Preferences
              </label>
              <textarea
                rows={3}
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                maxLength={250}
                className={`${inputClass} resize-none`}
                placeholder="Looking for 2-sharing room near campus, non-smoker..."
              />
              <p className="mt-1 text-right text-[10px] text-muted-foreground">{profile.bio.length}/250</p>
            </div>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-md transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-60"
        >
          {saved ? <><Check className="h-4 w-4" /> Saved Successfully!</> : <><Save className="h-4 w-4" /> Save Profile Details</>}
        </button>

        {/* Quick Actions & Navigation */}
        <div className="rounded-2xl bg-card shadow-card overflow-hidden">
          {isOwner ? (
            <>
              <button
                onClick={() => onNavigate?.("owner")}
                className="flex w-full items-center gap-3 px-5 py-4 text-sm font-semibold text-primary transition-colors hover:bg-secondary border-b border-border"
              >
                <Building2 className="h-4 w-4 text-primary" /> Open Owner Dashboard
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onNavigate?.("trips")}
                className="flex w-full items-center gap-3 px-5 py-4 text-sm text-foreground transition-colors hover:bg-secondary border-b border-border"
              >
                <CalendarDays className="h-4 w-4 text-muted-foreground" /> My Bookings & Trips
              </button>
              <button
                onClick={() => onNavigate?.("wishlists")}
                className="flex w-full items-center gap-3 px-5 py-4 text-sm text-foreground transition-colors hover:bg-secondary border-b border-border"
              >
                <Heart className="h-4 w-4 text-muted-foreground" /> Saved Wishlists
              </button>
            </>
          )}
          <button
            onClick={() => onNavigate?.("help")}
            className="flex w-full items-center gap-3 px-5 py-4 text-sm text-foreground transition-colors hover:bg-secondary border-b border-border"
          >
            <HelpCircle className="h-4 w-4 text-muted-foreground" /> Help Center
          </button>
          <button
            onClick={() => onNavigate?.("contact")}
            className="flex w-full items-center gap-3 px-5 py-4 text-sm text-foreground transition-colors hover:bg-secondary border-b border-border"
          >
            <PhoneCall className="h-4 w-4 text-muted-foreground" /> Contact Support
          </button>
          <button
            onClick={onSignOut}
            className="flex w-full items-center gap-3 px-5 py-4 text-sm font-semibold text-destructive transition-colors hover:bg-secondary"
          >
            <LogOut className="h-4 w-4" /> Log Out
          </button>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;
