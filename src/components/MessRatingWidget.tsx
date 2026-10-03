// ─── Mess / Food Daily Rating — Student Widget ───────────────────────────────
// Drop this file at:  src/components/MessRatingWidget.tsx
//
// Usage inside HostelDetail.tsx — add just below the Amenities card:
//
//   import MessRatingWidget from "@/components/MessRatingWidget";
//   ...
//   {hostel.amenities.includes("Meals Included") && (
//     <MessRatingWidget hostelId={hostel.id} hostelName={hostel.name} />
//   )}
//
// Or always show it (remove the amenities check) if all hostels have mess.

import { useState, useCallback } from "react";
import { Send, ChevronDown, Utensils, TrendingUp, ShieldAlert, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getResidencyStatus, verifyStudentCheckIn, isMockHostel } from "@/lib/residency";
import {
  type MealType,
  type MessRating,
  MEAL_EMOJI,
  REACTION_EMOJIS,
  loadMessRatings,
  saveMessRatings,
  hasRatedToday,
  getHostelAvgMessRating,
  getLast7DaysScores,
  getTodayString,
} from "@/data/messRatings";

interface MessRatingWidgetProps {
  hostelId: string;
  hostelName: string;
}

const MEALS: MealType[] = ["Breakfast", "Lunch", "Dinner"];

const StarRow = ({
  rating,
  onRate,
}: {
  rating: number;
  onRate: (r: number) => void;
}) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((s) => (
      <button
        key={s}
        type="button"
        onClick={() => onRate(s)}
        className="text-xl transition-transform hover:scale-110 active:scale-95"
      >
        {s <= rating ? "⭐" : "☆"}
      </button>
    ))}
  </div>
);

const MessRatingWidget = ({ hostelId, hostelName }: MessRatingWidgetProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [showTrend, setShowTrend] = useState(false);

  // Verification Gate Check
  const residency = getResidencyStatus(user?.id, hostelId);
  const [isVerified, setIsVerified] = useState(residency.isVerified);

  // form state
  const [studentName, setStudentName] = useState(user?.user_metadata?.full_name || "");
  const [selectedMeal, setSelectedMeal] = useState<MealType>("Lunch");
  const [rating, setRating] = useState(0);
  const [selectedEmoji, setSelectedEmoji] = useState("");
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alreadyRated, setAlreadyRated] = useState(false);

  const handleSelfVerify = () => {
    if (user?.id) {
      verifyStudentCheckIn(user.id, hostelId, "active_resident");
      setIsVerified(true);
    }
  };

  const overallAvg = getHostelAvgMessRating(hostelId);
  const trend = getLast7DaysScores(hostelId);
  const trendMax = Math.max(...trend.map((d) => d.avgRating), 5);

  const canSubmit =
    studentName.trim().length > 0 && rating > 0 && selectedEmoji !== "";

  const checkAlreadyRated = useCallback(() => {
    if (studentName.trim()) {
      setAlreadyRated(hasRatedToday(hostelId, studentName.trim(), selectedMeal));
    }
  }, [hostelId, studentName, selectedMeal]);

  const handleSubmit = () => {
    if (!canSubmit) return;
    if (hasRatedToday(hostelId, studentName.trim(), selectedMeal)) {
      setAlreadyRated(true);
      return;
    }

    setLoading(true);
    const newRating: MessRating = {
      id: `mr-${Date.now()}`,
      hostelId,
      studentName: studentName.trim(),
      meal: selectedMeal,
      rating,
      emoji: selectedEmoji,
      comment: comment.trim() || undefined,
      date: getTodayString(),
      createdAt: new Date().toISOString(),
    };

    const existing = loadMessRatings();
    saveMessRatings([newRating, ...existing]);

    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setRating(0);
        setSelectedEmoji("");
        setComment("");
        setOpen(false);
      }, 3000);
    }, 500);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" });
  };

  return (
    <div className="rounded-2xl bg-card shadow-card mb-4 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2.5">
          <Utensils className="h-5 w-5 text-primary" />
          <div>
            <span className="text-base font-bold text-foreground">
              Rate Today's Mess Food
            </span>
            {overallAvg > 0 && (
              <span className="ml-2 text-xs text-muted-foreground">
                Avg ⭐ {overallAvg}
              </span>
            )}
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="border-t border-border px-5 pb-5 pt-4">
          {!isVerified ? (
            /* ── Unverified Resident Gate Banner ── */
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-left">
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                    Verified Resident Gate Active
                  </h4>
                  <p className="mt-1 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                    Mess food ratings & reviews are restricted to verified active residents of this hostel to maintain 100% authentic feedback.
                  </p>
                  {isMockHostel(hostelId) ? (
                    user ? (
                      <button
                        onClick={handleSelfVerify}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-md transition-all hover:bg-amber-700 active:scale-95"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        Verify My Check-In (Demo Hostel)
                      </button>
                    ) : (
                      <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
                        Sign in as a resident to verify check-in and post mess reviews.
                      </p>
                    )
                  ) : (
                    <div className="mt-3 rounded-xl bg-amber-500/20 p-3 border border-amber-500/30 text-xs font-semibold text-amber-950 dark:text-amber-100">
                      🔒 <strong>Official Owner Check-In Required:</strong> For real properties, your check-in must be approved by the hostel owner or scanned via reception QR code.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : submitted ? (
            /* ── Success state ── */
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <span className="text-5xl">🎉</span>
              <p className="text-base font-bold text-foreground">
                Thanks for rating!
              </p>
              <p className="text-sm text-muted-foreground">
                Your feedback helps improve mess quality at {hostelName}.
              </p>
            </div>
          ) : alreadyRated ? (
            /* ── Already rated state ── */
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <span className="text-4xl">✅</span>
              <p className="text-base font-bold text-foreground">
                Already Rated!
              </p>
              <p className="text-sm text-muted-foreground">
                You've already rated {selectedMeal} today. Come back tomorrow!
              </p>
              <button
                onClick={() => setAlreadyRated(false)}
                className="mt-1 text-xs text-primary underline"
              >
                Rate a different meal
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Your Name
                </label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => {
                    setStudentName(e.target.value);
                    setAlreadyRated(false);
                  }}
                  onBlur={checkAlreadyRated}
                  placeholder="e.g. Ravi Kumar"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
                />
              </div>

              {/* Meal selector */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Which Meal?
                </label>
                <div className="flex gap-2">
                  {MEALS.map((meal) => (
                    <button
                      key={meal}
                      type="button"
                      onClick={() => {
                        setSelectedMeal(meal);
                        setAlreadyRated(false);
                      }}
                      className={`flex flex-1 flex-col items-center gap-1 rounded-xl border py-2.5 text-xs font-semibold transition-all ${
                        selectedMeal === meal
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-secondary/50 text-foreground hover:border-primary/40"
                      }`}
                    >
                      <span className="text-xl">{MEAL_EMOJI[meal]}</span>
                      {meal}
                    </button>
                  ))}
                </div>
              </div>

              {/* Star rating */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Star Rating
                </label>
                <StarRow rating={rating} onRate={setRating} />
              </div>

              {/* Reaction emoji */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Quick Reaction
                </label>
                <div className="flex gap-2">
                  {REACTION_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setSelectedEmoji(emoji)}
                      className={`flex h-10 w-10 items-center justify-center rounded-xl border text-xl transition-all ${
                        selectedEmoji === emoji
                          ? "border-primary bg-primary/10 scale-110"
                          : "border-border bg-secondary/50 hover:scale-105"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional comment */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Comment{" "}
                  <span className="normal-case font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="e.g. Sambar was great today!"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/20"
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!canSubmit || loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
              >
                {loading ? (
                  <span className="animate-pulse">Submitting…</span>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit Rating
                  </>
                )}
              </button>
            </div>
          )}

          {/* ── 7-day Trend ── */}
          {overallAvg > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setShowTrend((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-semibold text-primary"
              >
                <TrendingUp className="h-3.5 w-3.5" />
                {showTrend ? "Hide" : "Show"} 7-day food trend
              </button>

              {showTrend && (
                <div className="mt-3 rounded-xl bg-secondary/50 p-3">
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">
                    Daily Average (last 7 days)
                  </p>
                  <div className="flex items-end gap-1.5 h-16">
                    {trend.map((day) => {
                      const heightPct =
                        day.avgRating > 0
                          ? Math.round((day.avgRating / trendMax) * 100)
                          : 4;
                      const isToday = day.date === getTodayString();
                      return (
                        <div
                          key={day.date}
                          className="flex flex-1 flex-col items-center gap-1"
                        >
                          <div
                            className={`w-full rounded-t-md transition-all ${
                              isToday ? "bg-primary" : "bg-primary/30"
                            }`}
                            style={{ height: `${heightPct}%` }}
                            title={
                              day.avgRating > 0
                                ? `⭐ ${day.avgRating} (${day.totalVotes} votes)`
                                : "No ratings"
                            }
                          />
                          <span className="text-[9px] text-muted-foreground">
                            {formatDate(day.date).split(" ")[0]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-1 text-right text-xs text-muted-foreground">
                    Overall avg: ⭐ {overallAvg}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MessRatingWidget;