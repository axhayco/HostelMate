# HostelMate — Complete Marketplace Product Roadmap & Implementation Spec

This document outlines the full product architecture, access control rules, verification flows, and feature specifications required to evolve **HostelMate** into a full-fledged, trusted **"Airbnb for Hostels"** marketplace application.

---

## 1. 🛡️ Verification & Review Architecture

### A. Mess Rating & Property Review Access Rules
- **Public Reader View**: Guests, prospective students, and owners can view ratings, average mess scores, photos, and verified student reviews.
- **Verified Resident Gate**:
  - Only users with an `active_resident` or `past_resident` status associated with a specific `hostel_id` can write, edit, or delete reviews/ratings for that hostel.
  - **Unverified Attempt Prevention**: Non-residents who attempt to rate mess food or leave property reviews are shown an informational banner:  
    > *"Reviews & Mess Ratings are restricted to verified residents of this hostel to maintain authentic feedback."*

### B. Verification Mechanism
- **Digital Check-In**: Owners approve check-ins upon student arrival, or students scan a unique **Hostel QR Code** at the property to verify their residency.
- **Verification Statuses**:
  - `unverified`: Default guest/student account.
  - `booking_confirmed`: Token paid, check-in pending.
  - `active_resident`: Checked in; unlocks private chat, mess reviews, maintenance tickets.
  - `past_resident`: Checked out; retains review editing for 30 days.

---

## 2. 💬 Multi-Tiered Community Chat Architecture

To balance community networking with resident privacy and security, chat is structured into two distinct tiers:

### Tier 1: Public Locality Lounge (Open Access)
- **Scope**: Area-level channels (e.g., `#kukatpally-students`, `#gachibowli-hub`).
- **Access**: Open to all registered student accounts.
- **Use Cases**:
  - Looking for roommates or flatmates.
  - Buying/selling secondhand textbooks or furniture.
  - Locality & campus Q&A.

### Tier 2: Private Resident Group (Gated Access)
- **Scope**: Specific Hostel Channels (e.g., `JNTU Boys Residency - Residents Only`).
- **Access**: Restricted to verified `active_resident` users of that exact property.
- **Use Cases**:
  - Internal warden & owner announcements.
  - Daily mess menu polls.
  - Washing machine / study room slot coordination.
  - Emergency alerts.
- **Auto-Revocation**: When a student checks out, their token expires, and access is revoked automatically.

---

## 3. 💳 Booking, Escrow & Payment Engine

### A. Bed-Level Inventory Tracking
Hostel inventory is tracked per **Bed** rather than per room:
- **Room Types**: Single Sharing, 2-Sharing, 3-Sharing, 4-Sharing, Dormitory.
- **Bed Allocation**: Each booking locks a specific bed slot (e.g., Room 102 - Bed B) to prevent double-booking.

### B. Escrow Token System
1. **Student Booking**: Student pays a booking token (e.g., ₹1,000 – ₹2,000) via gateway.
2. **Escrow Hold**: Funds are held securely in platform escrow.
3. **Check-In Release**: Money is released to the hostel owner only upon verified check-in on Day 1.
4. **Cancellation Policy**: Full refund if cancelled 48 hours prior to check-in; forfeited token to owner if cancelled last minute.

### C. Recurring Monthly Rent & Security Deposits
- Auto-generated digital rent invoices due on the 1st of every month.
- Automated WhatsApp & in-app payment reminders.
- Security deposit vault tracking with checkout refund receipts.

---

## 4. 🧰 Resident Services & Maintenance Ticketing

### A. Maintenance Ticket Flow
- Residents can raise maintenance requests with category selection:
  - 🚿 Plumbing / Hot Water
  - ⚡ Electrical / Power Backup
  - 📶 Wi-Fi / Network
  - 🧹 Cleaning / Housekeeping
  - 🍽️ Mess / Food Quality
- **SLA Timers**: Owners receive real-time push alerts with SLA countdowns (e.g., 24-hour resolution window).
- **Status Pipeline**: `Open` ➔ `In Progress` ➔ `Resolved` (Resident confirms resolution).

### B. Notice Period & Smart Vacancy Forecasting
- **Digital Notice**: Students submit 30-day move-out notices through the app.
- **Pre-Listing**: The system marks the bed as *"Available from [Date]"*, allowing prospective students to pre-book before the current resident vacates.

---

## 5. 🗄️ Database Schema & RLS Policy Additions

### Required Database Tables

```sql
-- 1. Bookings & Residency
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  hostel_id UUID REFERENCES public.hostels(id) ON DELETE CASCADE,
  bed_number TEXT,
  room_type TEXT NOT NULL,
  token_amount NUMERIC NOT NULL,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'checked_in', 'cancelled', 'completed')) DEFAULT 'pending',
  check_in_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Resident Verifications
CREATE TABLE public.resident_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  hostel_id UUID REFERENCES public.hostels(id) ON DELETE CASCADE,
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  UNIQUE(student_id, hostel_id)
);

-- 3. Verified Mess Ratings
CREATE TABLE public.mess_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id UUID REFERENCES public.hostels(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  food_quality_score INT CHECK (food_quality_score BETWEEN 1 AND 5),
  hygiene_score INT CHECK (hygiene_score BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Maintenance Tickets
CREATE TABLE public.maintenance_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id UUID REFERENCES public.hostels(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT CHECK (status IN ('open', 'in_progress', 'resolved')) DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Essential Row Level Security (RLS) Rules
- **Mess Ratings Write RLS**:
  `ONLY ALLOW INSERT IF EXISTS (SELECT 1 FROM resident_verifications WHERE student_id = auth.uid() AND hostel_id = mess_ratings.hostel_id AND is_verified = true)`
- **Private Resident Chat RLS**:
  `ONLY ALLOW SELECT/INSERT IF EXISTS (SELECT 1 FROM resident_verifications WHERE student_id = auth.uid() AND hostel_id = channel.hostel_id AND is_verified = true)`

---

## 6. 🚀 Phase-by-Phase Rollout Plan

- [x] **Phase 1 (Completed)**: UI/UX Redesign, Security Hardening, Motion Graphics, Role Profiles, RLS Base.
- [x] **Phase 2 (Completed)**: Resident Verification Gate & Verified Mess Reviews.
- [x] **Phase 3 (Completed)**: 2-Tiered Community Chat (Public Lounge vs Resident Group).
- [ ] **Phase 4 (Next Step)**: Escrow Token Booking System & Razorpay/UPI Integration.
- [ ] **Phase 5**: Maintenance Ticket Portal & Smart Vacancy Forecasting.
