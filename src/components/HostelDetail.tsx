import { Hostel } from "@/data/hostels";
import { useState, useEffect, useMemo } from "react";
import { DEFAULT_HOSTEL_IMAGE, handleImageError } from "@/lib/imageUtils";
import { useAuth } from "@/context/AuthContext";
import { getResidencyStatus, verifyStudentCheckIn } from "@/lib/residency";
import {
  Star, MapPin, Phone, Wifi, Wind, Utensils, Dumbbell,
  ShieldCheck, Car, Zap, Droplets, BookOpen, Home, Sparkles, Sun,
  Send, User, MessageCircle, Trash2, ShieldAlert,
} from "lucide-react";
import ComplaintForm from "@/components/ComplaintForm";       // Feature #4
import MessRatingWidget from "@/components/MessRatingWidget"; // Feature #5

interface Review {
  id: string;
  name: string;
  rating: number;
  comment: string;
  date: string;
}

interface HostelDetailProps {
  hostel: Hostel;
  onBack: () => void;
  onBook?: () => void;
  onOpenChat?: () => void;
}

const amenityIcons: Record<string, React.ReactNode> = {
  "Wi-Fi":          <Wifi className="h-4 w-4" />,
  "AC":             <Wind className="h-4 w-4" />,
  "Meals Included": <Utensils className="h-4 w-4" />,
  "Gym":            <Dumbbell className="h-4 w-4" />,
  "CCTV":           <ShieldCheck className="h-4 w-4" />,
  "Parking":        <Car className="h-4 w-4" />,
  "Power Backup":   <Zap className="h-4 w-4" />,
  "Hot Water":      <Droplets className="h-4 w-4" />,
  "Study Room":     <BookOpen className="h-4 w-4" />,
  "Laundry":        <Sparkles className="h-4 w-4" />,
  "Housekeeping":   <Home className="h-4 w-4" />,
  "Terrace":        <Sun className="h-4 w-4" />,
};

const StarRating = ({
  rating,
  onRate,
  interactive = false,
}: {
  rating: number;
  onRate?: (r: number) => void;
  interactive?: boolean;
}) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <button
        key={s}
        type="button"
        disabled={!interactive}
        onClick={() => onRate?.(s)}
        className={
          interactive
            ? "cursor-pointer transition-transform hover:scale-110"
            : "cursor-default"
        }
      >
        <Star
          className={`h-5 w-5 ${
            s <= rating
              ? "fill-warning text-warning"
              : "text-muted-foreground/30"
          }`}
        />
      </button>
    ))}
  </div>
);

const HostelDetail = ({ hostel, onBack, onBook, onOpenChat }: HostelDetailProps) => {
  const { user } = useAuth();
  const [activePhoto, setActivePhoto] = useState(0);
  const storageKey = `reviews-${hostel.id}`;

  const residency = getResidencyStatus(user?.id, hostel.id);
  const [isVerified, setIsVerified] = useState(residency.isVerified);

  const handleSelfVerify = () => {
    if (user?.id) {
      verifyStudentCheckIn(user.id, hostel.id, "active_resident");
      setIsVerified(true);
    }
  };

  const [reviews, setReviews] = useState<Review[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "[]");
    } catch {
      return [];
    }
  });

  const [newName, setNewName]       = useState(user?.user_metadata?.full_name || "");
  const [newRating, setNewRating]   = useState(0);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(reviews));
  }, [reviews, storageKey]);

  const avgRating = useMemo(() => {
    if (reviews.length === 0) return hostel.rating;
    const sum = reviews.reduce((a, r) => a + r.rating, 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  }, [reviews, hostel.rating]);

  const handleSubmitReview = () => {
    if (!newName.trim() || !newComment.trim() || newRating === 0) return;
    const review: Review = {
      id: Date.now().toString(),
      name: newName.trim(),
      rating: newRating,
      comment: newComment.trim(),
      date: new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    };
    setReviews((prev) => [review, ...prev]);
    setNewName("");
    setNewRating(0);
    setNewComment("");
  };

  const handleDeleteReview = (id: string) => {
    if (window.confirm("Are you sure you want to delete this review?")) {
      setReviews((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const vacancyColor =
    hostel.vacancies === 0
      ? "text-destructive"
      : hostel.vacancies <= 3
        ? "text-warning"
        : "text-success";

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <h1 className="truncate text-lg font-bold text-foreground">
            {hostel.name}
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-4 space-y-4">
        {/* ── Photo Gallery with Dynamic Zoom ───────────────────────────────────────── */}
        <div className="relative mb-4">
          <div className="group relative aspect-[16/9] overflow-hidden rounded-2xl bg-muted shadow-card">
            <img
              src={hostel.photos?.[activePhoto] || hostel.image || DEFAULT_HOSTEL_IMAGE}
              alt={`${hostel.name} photo ${activePhoto + 1}`}
              onError={handleImageError}
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />

            {/* Photo count indicator */}
            <div className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white backdrop-blur-md border border-white/20">
              📷 {activePhoto + 1} / {(hostel.photos?.length || 1)}
            </div>
          </div>
          {/* Thumbnails */}
          <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
            {(hostel.photos?.length ? hostel.photos : [hostel.image || DEFAULT_HOSTEL_IMAGE]).map((photo, i) => (
              <button
                key={i}
                onClick={() => setActivePhoto(i)}
                className={`flex-shrink-0 overflow-hidden rounded-xl transition-all duration-300 ${
                  activePhoto === i
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105 shadow-md"
                    : "opacity-60 hover:opacity-100 hover:scale-100"
                }`}
              >
                <img
                  src={photo || DEFAULT_HOSTEL_IMAGE}
                  alt={`Thumbnail ${i + 1}`}
                  onError={handleImageError}
                  className="h-16 w-20 object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        {/* ── Info Card with Dynamic Motion Badges ────────────────────────────────── */}
        <div className="rounded-2xl bg-card p-5 shadow-card border border-border/60">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
                {hostel.name}
              </h2>
              <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground font-semibold">
                <MapPin className="h-4 w-4 text-primary animate-bounce" style={{ animationDuration: "3s" }} />
                <span>{hostel.location}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-sm font-extrabold text-amber-700 dark:text-amber-400">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400 animate-spin" style={{ animationDuration: "12s" }} />
              <span>{avgRating}</span>
              {reviews.length > 0 && (
                <span className="text-xs text-muted-foreground font-semibold">
                  ({reviews.length})
                </span>
              )}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4">
            <div>
              <span className="text-3xl font-extrabold text-primary tracking-tight">
                ₹{hostel.rent.toLocaleString()}
              </span>
              <span className="text-sm text-muted-foreground font-medium"> /month</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className={`absolute inline-flex h-full w-full rounded-full ${hostel.vacancies > 0 ? "bg-emerald-500 animate-beacon-ping" : "bg-destructive"}`} />
                <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${hostel.vacancies > 0 ? "bg-emerald-500" : "bg-destructive"}`} />
              </span>
              <span className={`text-sm font-extrabold ${vacancyColor}`}>
                {hostel.vacancies === 0
                  ? "Full Occupancy"
                  : `${hostel.vacancies} beds open`}
              </span>
            </div>
          </div>
          <div className="mt-3.5 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold capitalize text-primary">
              {hostel.gender === "male" ? "👦 Boys Hostel" : "👧 Girls Hostel"}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Verified Stay
            </span>
          </div>
        </div>

        {/* ── Description ─────────────────────────────────────────── */}
        <div className="rounded-2xl bg-card p-5 shadow-card border border-border/60">
          <h3 className="mb-2 text-base font-extrabold text-foreground tracking-tight">About Property</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {hostel.description}
          </p>
        </div>

        {/* ── Amenities with Interactive Motion Chips ───────────────────────────── */}
        <div className="rounded-2xl bg-card p-5 shadow-card border border-border/60">
          <h3 className="mb-3.5 text-base font-extrabold text-foreground tracking-tight">
            Included Amenities
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {hostel.amenities.map((amenity) => (
              <div
                key={amenity}
                className="group flex items-center gap-3 rounded-2xl bg-secondary/70 border border-border/40 px-4 py-3 text-xs font-bold text-foreground transition-all duration-300 hover:scale-105 hover:bg-card hover:border-primary/40 hover:shadow-sm"
              >
                <span className="text-primary transition-transform group-hover:scale-125">
                  {amenityIcons[amenity] || <Sparkles className="h-4 w-4" />}
                </span>
                <span>{amenity}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Feature #5 — Mess Food Daily Rating ─────────────────── */}
        <MessRatingWidget hostelId={hostel.id} hostelName={hostel.name} />

        {/* ── Reviews & Ratings ───────────────────────────────────── */}
        <div className="mb-4 rounded-2xl bg-card p-5 shadow-card">
          <h3 className="mb-4 text-base font-bold text-foreground">
            Reviews & Ratings
          </h3>

          {!isVerified ? (
            /* ── Unverified Resident Gate Banner ── */
            <div className="mb-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-left">
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                    Verified Resident Gate Active
                  </h4>
                  <p className="mt-1 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                    Property reviews & ratings are restricted to verified residents of this hostel to maintain 100% authentic student feedback.
                  </p>
                  {user ? (
                    <button
                      onClick={handleSelfVerify}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-md transition-all hover:bg-amber-700 active:scale-95"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Verify My Check-In (Demo Access)
                    </button>
                  ) : (
                    <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
                      Sign in as a resident to verify your check-in and post property reviews.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-5 rounded-xl border border-border bg-secondary/50 p-4">
              <p className="mb-3 text-sm font-semibold text-foreground">
                Write a Review
              </p>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Your name"
                className="mb-3 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
              />
              <div className="mb-3 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Rating:</span>
                <StarRating rating={newRating} onRate={setNewRating} interactive />
              </div>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your experience..."
                rows={3}
                className="mb-3 w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
              />
              <button
                onClick={handleSubmitReview}
                disabled={!newName.trim() || !newComment.trim() || newRating === 0}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
              >
                <Send className="h-4 w-4" /> Submit Review
              </button>
            </div>
          )}

          {reviews.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No reviews yet. Be the first to review!
            </p>
          ) : (
            <div className="space-y-4">
              {reviews.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl border border-border bg-secondary/30 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {r.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{r.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-sm font-semibold">
                      <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                      {r.rating}
                      <button 
                        onClick={() => handleDeleteReview(r.id)}
                        className="ml-2 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                    {r.comment}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Community Chat ───────────────────────────────────────── */}
        {onOpenChat && (
          <button
            onClick={onOpenChat}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-secondary py-4 text-base font-bold text-foreground transition-all hover:bg-secondary/80 active:scale-[0.98]"
          >
            <MessageCircle className="h-5 w-5" />
            Community Chat
          </button>
        )}

        {/* ── Feature #4 — Complaint & Maintenance Tracker ────────── */}
        <ComplaintForm hostelId={hostel.id} hostelName={hostel.name} />

        {/* ── Booking Action ────────────────────────────────────────── */}
        <div className="mb-4">
          <button
            onClick={onBook}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 active:scale-[0.98]"
          >
            <Sparkles className="h-5 w-5" />
            Reserve Now
          </button>
        </div>

        {/* ── Contact ─────────────────────────────────────────────── */}
        <div className="pb-6">
          <a
            href={`tel:${hostel.contactPhone}`}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-secondary py-4 text-base font-bold text-foreground transition-all hover:bg-secondary/80 active:scale-[0.98]"
          >
            <Phone className="h-5 w-5" />
            Contact Owner — {hostel.contactPhone}
          </a>
        </div>
      </main>
    </div>
  );
};

export default HostelDetail;