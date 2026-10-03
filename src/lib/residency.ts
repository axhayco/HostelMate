// ─── Resident Verification Gate Service ──────────────────────────────────────
// Manages student check-in status and controls access to hostel mess ratings,
// property reviews, and private resident community channels.

export type ResidencyStatus = "unverified" | "booking_confirmed" | "active_resident" | "past_resident";

export interface ResidencyRecord {
  userId: string;
  hostelId: string;
  status: ResidencyStatus;
  verifiedAt: string;
}

const RESIDENCY_STORAGE_KEY = "hozztl-resident-verifications";

const getVerifications = (): ResidencyRecord[] => {
  try {
    const raw = localStorage.getItem(RESIDENCY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveVerifications = (records: ResidencyRecord[]): void => {
  try {
    localStorage.setItem(RESIDENCY_STORAGE_KEY, JSON.stringify(records));
  } catch {
    /* localStorage fallback */
  }
};

/**
 * Checks whether a user is an active or past verified resident of a specific hostel.
 */
export const getResidencyStatus = (
  userId: string | undefined,
  hostelId: string
): { status: ResidencyStatus; isVerified: boolean } => {
  if (!userId) {
    return { status: "unverified", isVerified: false };
  }

  const verifications = getVerifications();
  const match = verifications.find(
    (v) => v.userId === userId && v.hostelId === hostelId
  );

  if (match) {
    const isVerified = match.status === "active_resident" || match.status === "past_resident";
    return { status: match.status, isVerified };
  }

  // Check if student has a confirmed booking for this hostel in local storage
  try {
    const bookingsRaw = localStorage.getItem(`hozztl-bookings-${userId}`);
    if (bookingsRaw) {
      const bookings: Array<{ hostelId: string; status?: string }> = JSON.parse(bookingsRaw);
      const booking = bookings.find((b) => b.hostelId === hostelId);
      if (booking) {
        return { status: "booking_confirmed", isVerified: false };
      }
    }
  } catch {
    /* ignore parse errors */
  }

  return { status: "unverified", isVerified: false };
};

/**
 * Convenience check returning true if user is a verified resident of the hostel.
 */
export const isVerifiedResident = (
  userId: string | undefined,
  hostelId: string
): boolean => {
  return getResidencyStatus(userId, hostelId).isVerified;
};

/**
 * Determines whether a hostel is a mock/demo listing or a real property.
 */
export const isMockHostel = (hostelId: string): boolean => {
  if (!hostelId) return false;
  // Mock hostels use short IDs like b1..b10, g1..g10, or 'mock-' prefix
  return /^(b|g)\d+$/i.test(hostelId) || hostelId.startsWith("mock-");
};

/**
 * Simulates owner/digital QR check-in verification for a student (Demo access allowed on mock hostels only).
 */
export const verifyStudentCheckIn = (
  userId: string,
  hostelId: string,
  status: ResidencyStatus = "active_resident"
): ResidencyRecord => {
  const records = getVerifications();
  const existingIdx = records.findIndex(
    (r) => r.userId === userId && r.hostelId === hostelId
  );

  const newRecord: ResidencyRecord = {
    userId,
    hostelId,
    status,
    verifiedAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    records[existingIdx] = newRecord;
  } else {
    records.push(newRecord);
  }

  saveVerifications(records);
  return newRecord;
};
