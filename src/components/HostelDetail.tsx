import { Hostel } from "@/data/hostels";
import { useState, useEffect, useMemo } from "react";
import { DEFAULT_HOSTEL_IMAGE, handleImageError } from "@/lib/imageUtils";
import {
  ArrowLeft, Star, MapPin, Phone, Wifi, Wind, Utensils, Dumbbell,
  ShieldCheck, Car, Zap, Droplets, BookOpen, Home, Sparkles, Sun,
  Send, User, MessageCircle, Trash2,
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
  const [activePhoto, setActivePhoto] = useState(0);
  const storageKey = `reviews-${hostel.id}`;

  const [reviews, setReviews] = useState<Review[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "[]");
    } catch {
      return [];
    }
  });

  const [newName, setNewName]       = useState("");
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
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <button
            onClick={onBack}
            className="rounded-lg p-2 text-foreground transition-colors hover:bg-secondary"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="truncate text-lg font-bold text-foreground">
            {hostel.name}
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-4">
        {/* ── Photo Gallery ───────────────────────────────────────── */}
        <div className="mb-4">
          <div className="aspect-[16/9] overflow-hidden rounded-2xl">
            <img
              src={hostel.photos?.[activePhoto] || hostel.image || DEFAULT_HOSTEL_IMAGE}
              alt={`${hostel.name} photo ${activePhoto + 1}`}
              onError={handleImageError}
              className="h-full w-full object-cover transition-all duration-500"
            />
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {(hostel.photos?.length ? hostel.photos : [hostel.image || DEFAULT_HOSTEL_IMAGE]).map((photo, i) => (
              <button
                key={i}
                onClick={() => setActivePhoto(i)}
                className={`flex-shrink-0 overflow-hidden rounded-xl transition-all duration-200 ${
                  activePhoto === i
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                    : "opacity-60 hover:opacity-100"
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

        {/* ── Info ────────────────────────────────────────────────── */}
        <div className="mb-4 rounded-2xl bg-card p-5 shadow-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {hostel.name}
              </h2>
              <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {hostel.location}
              </div>
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1.5 text-sm font-semibold">
              <Star className="h-3.5 w-3.5 fill-warning text-warning" />
              {avgRating}
              {reviews.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  ({reviews.length})
                </span>
              )}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
            <div>
              <span className="text-2xl font-bold text-primary">
                ₹{hostel.rent.toLocaleString()}
              </span>
              <span className="text-sm text-muted-foreground">/month</span>
            </div>
            <div className={`text-sm font-semibold ${vacancyColor}`}>
              {hostel.vacancies === 0
                ? "No Vacancies"
                : `${hostel.vacancies} beds available`}
            </div>
          </div>
          <div className="mt-3">
            <span className="inline-block rounded-full bg-secondary px-3 py-1 text-xs font-semibold capitalize text-secondary-foreground">
              {hostel.gender === "male" ? "👦 Boys" : "👧 Girls"}
            </span>
          </div>
        </div>

        {/* ── Description ─────────────────────────────────────────── */}
        <div className="mb-4 rounded-2xl bg-card p-5 shadow-card">
          <h3 className="mb-2 text-base font-bold text-foreground">About</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {hostel.description}
          </p>
        </div>

        {/* ── Amenities ───────────────────────────────────────────── */}
        <div className="mb-4 rounded-2xl bg-card p-5 shadow-card">
          <h3 className="mb-3 text-base font-bold text-foreground">
            Amenities
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {hostel.amenities.map((amenity) => (
              <div
                key={amenity}
                className="flex items-center gap-2.5 rounded-xl bg-secondary px-3.5 py-2.5 text-sm font-medium text-foreground"
              >
                <span className="text-primary">
                  {amenityIcons[amenity] || <Sparkles className="h-4 w-4" />}
                </span>
                {amenity}
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