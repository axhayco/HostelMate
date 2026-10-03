// ─── Mess / Food Daily Rating — Data Model ───────────────────────────────────
// Drop this file at:  src/data/messRatings.ts

export type MealType = "Breakfast" | "Lunch" | "Dinner";

export interface MessRating {
  id: string;
  hostelId: string;
  studentName: string;
  meal: MealType;
  rating: number;       // 1–5
  emoji: string;        // quick reaction
  comment?: string;
  date: string;         // "YYYY-MM-DD"
  createdAt: string;    // ISO
}

export interface DailyMessScore {
  date: string;
  hostelId: string;
  avgRating: number;
  totalVotes: number;
}

export const MEAL_EMOJI: Record<MealType, string> = {
  Breakfast: "🌅",
  Lunch:     "☀️",
  Dinner:    "🌙",
};

export const REACTION_EMOJIS = ["😍", "😊", "😐", "😕", "🤢"];

// ─── localStorage helpers ─────────────────────────────────────────────────────
const PRIMARY_STORAGE_KEY = "hozztl-mess-ratings";
const LEGACY_STORAGE_KEY = "hostelmate-mess-ratings";

export function loadMessRatings(): MessRating[] {
  try {
    const raw = localStorage.getItem(PRIMARY_STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY) || "[]";
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveMessRatings(ratings: MessRating[]): void {
  localStorage.setItem(PRIMARY_STORAGE_KEY, JSON.stringify(ratings));
}

export function getMessRatingsForHostel(hostelId: string): MessRating[] {
  return loadMessRatings().filter((r) => r.hostelId === hostelId);
}

export function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

/** Returns true if this student already rated this meal today for this hostel */
export function hasRatedToday(
  hostelId: string,
  studentName: string,
  meal: MealType
): boolean {
  const today = getTodayString();
  return loadMessRatings().some(
    (r) =>
      r.hostelId === hostelId &&
      r.studentName === studentName &&
      r.meal === meal &&
      r.date === today
  );
}

/** Average rating for a hostel across all time */
export function getHostelAvgMessRating(hostelId: string): number {
  const ratings = getMessRatingsForHostel(hostelId);
  if (ratings.length === 0) return 0;
  const sum = ratings.reduce((a, r) => a + r.rating, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
}

/** Last 7 days daily averages for trend display */
export function getLast7DaysScores(hostelId: string): DailyMessScore[] {
  const ratings = getMessRatingsForHostel(hostelId);
  const days: DailyMessScore[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = d.toISOString().split("T")[0];
    const dayRatings = ratings.filter((r) => r.date === date);
    days.push({
      date,
      hostelId,
      avgRating: dayRatings.length
        ? Math.round(
            (dayRatings.reduce((a, r) => a + r.rating, 0) / dayRatings.length) * 10
          ) / 10
        : 0,
      totalVotes: dayRatings.length,
    });
  }
  return days;
}