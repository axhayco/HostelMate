// ─── Complaint & Maintenance Tracker — Data Model ───────────────────────────
// Drop this file at:  src/data/complaints.ts

export type ComplaintCategory =
  | "Maintenance / Plumbing"
  | "Food Quality"
  | "Noise"
  | "Cleanliness"
  | "Security"
  | "Electricity"
  | "Internet / Wi-Fi"
  | "Other";

export type ComplaintStatus = "Open" | "In Progress" | "Resolved";

export interface Complaint {
  id: string;
  hostelId: string;
  hostelName: string;
  studentName: string;
  category: ComplaintCategory;
  description: string;
  status: ComplaintStatus;
  createdAt: string;   // ISO date string
  updatedAt: string;
  ownerNote?: string;  // owner's reply / resolution note
}

export const COMPLAINT_CATEGORIES: ComplaintCategory[] = [
  "Maintenance / Plumbing",
  "Food Quality",
  "Noise",
  "Cleanliness",
  "Security",
  "Electricity",
  "Internet / Wi-Fi",
  "Other",
];

export const CATEGORY_EMOJI: Record<ComplaintCategory, string> = {
  "Maintenance / Plumbing": "🔧",
  "Food Quality":           "🍛",
  "Noise":                  "🔊",
  "Cleanliness":            "🧹",
  "Security":               "🔒",
  "Electricity":            "⚡",
  "Internet / Wi-Fi":       "📶",
  "Other":                  "📝",
};

export const STATUS_COLOR: Record<ComplaintStatus, string> = {
  "Open":        "bg-destructive/10 text-destructive",
  "In Progress": "bg-warning/10 text-warning",
  "Resolved":    "bg-success/10 text-success",
};

// ─── localStorage helpers ─────────────────────────────────────────────────────
const PRIMARY_STORAGE_KEY = "hozztl-complaints";
const LEGACY_STORAGE_KEY = "hostelmate-complaints";

export function loadComplaints(): Complaint[] {
  try {
    const raw = localStorage.getItem(PRIMARY_STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY) || "[]";
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveComplaints(complaints: Complaint[]): void {
  localStorage.setItem(PRIMARY_STORAGE_KEY, JSON.stringify(complaints));
}

export function getComplaintsForHostel(hostelId: string): Complaint[] {
  return loadComplaints().filter((c) => c.hostelId === hostelId);
}

export function getComplaintsForOwner(ownerHostelIds: string[]): Complaint[] {
  return loadComplaints().filter((c) => ownerHostelIds.includes(c.hostelId));
}

export function updateComplaintStatus(
  id: string,
  status: ComplaintStatus,
  ownerNote?: string
): void {
  const all = loadComplaints();
  const updated = all.map((c) =>
    c.id === id
      ? { ...c, status, ownerNote: ownerNote ?? c.ownerNote, updatedAt: new Date().toISOString() }
      : c
  );
  saveComplaints(updated);
}