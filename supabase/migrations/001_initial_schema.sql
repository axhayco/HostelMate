-- ============================================
-- Supabase Schema Migration: 001_initial_schema.sql
-- Description: Production Database Setup for HostelMate
-- ============================================

-- --------------------------------------------
-- 0. Clean Teardown (Safe Re-execution & Reset)
-- --------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.has_role(_user_id UUID, _role TEXT) CASCADE;

-- Drop all current & legacy tables safely
DROP TABLE IF EXISTS public.mess_ratings CASCADE;
DROP TABLE IF EXISTS public.complaints CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.rooms CASCADE;
DROP TABLE IF EXISTS public.hostels CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop all custom enum types
DROP TYPE IF EXISTS public.booking_status CASCADE;
DROP TYPE IF EXISTS public.gender_preference CASCADE;
DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.app_role CASCADE;

-- --------------------------------------------
-- 1. Custom Types & Enums
-- --------------------------------------------
CREATE TYPE public.user_role AS ENUM ('student', 'owner');
CREATE TYPE public.gender_preference AS ENUM ('boys', 'girls', 'any');
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'cancelled');

-- --------------------------------------------
-- 2. Core Database Tables
-- --------------------------------------------

-- 1. Profiles Table (Links 1:1 with auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.user_role NOT NULL DEFAULT 'student',
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Hostels Table
CREATE TABLE public.hostels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  area TEXT NOT NULL,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  amenities TEXT[] DEFAULT '{}',
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Rooms Table
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id UUID REFERENCES public.hostels(id) ON DELETE CASCADE NOT NULL,
  room_type TEXT NOT NULL,
  gender_preference public.gender_preference NOT NULL DEFAULT 'any',
  total_beds INTEGER NOT NULL DEFAULT 1 CHECK (total_beds >= 0),
  available_beds INTEGER NOT NULL DEFAULT 1 CHECK (available_beds >= 0),
  price_per_month INTEGER NOT NULL CHECK (price_per_month >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Bookings Table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status public.booking_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT check_booking_dates CHECK (end_date >= start_date)
);

-- 5. Reviews Table
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id UUID REFERENCES public.hostels(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------
-- 3. Enable Row Level Security (RLS)
-- --------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hostels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------
-- 4. RLS Security Policies
-- --------------------------------------------

-- Profiles Policies
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id OR
    EXISTS (SELECT 1 FROM public.hostels WHERE owner_id = profiles.id)
  );

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Hostels Policies
CREATE POLICY "Public read access for hostels"
  ON public.hostels FOR SELECT
  USING (true);

CREATE POLICY "Owners can insert own hostels"
  ON public.hostels FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update own hostels"
  ON public.hostels FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete own hostels"
  ON public.hostels FOR DELETE
  USING (auth.uid() = owner_id);

-- Rooms Policies
CREATE POLICY "Public read access for rooms"
  ON public.rooms FOR SELECT
  USING (true);

CREATE POLICY "Owners can insert rooms for their hostels"
  ON public.rooms FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.hostels WHERE id = hostel_id AND owner_id = auth.uid())
  );

CREATE POLICY "Owners can update rooms for their hostels"
  ON public.rooms FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.hostels WHERE id = hostel_id AND owner_id = auth.uid())
  );

CREATE POLICY "Owners can delete rooms for their hostels"
  ON public.rooms FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.hostels WHERE id = hostel_id AND owner_id = auth.uid())
  );

-- Bookings Policies
CREATE POLICY "Students can view own bookings"
  ON public.bookings FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Owners can view bookings for their hostels"
  ON public.bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.rooms
      JOIN public.hostels ON rooms.hostel_id = hostels.id
      WHERE rooms.id = bookings.room_id AND hostels.owner_id = auth.uid()
    )
  );

CREATE POLICY "Students can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own bookings"
  ON public.bookings FOR UPDATE
  USING (auth.uid() = student_id);

CREATE POLICY "Owners can update status for hostel bookings"
  ON public.bookings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.rooms
      JOIN public.hostels ON rooms.hostel_id = hostels.id
      WHERE rooms.id = bookings.room_id AND hostels.owner_id = auth.uid()
    )
  );

-- Reviews Policies
CREATE POLICY "Public read access for reviews"
  ON public.reviews FOR SELECT
  USING (true);

CREATE POLICY "Students can insert review for booked hostels"
  ON public.reviews FOR INSERT
  WITH CHECK (
    auth.uid() = student_id AND
    EXISTS (
      SELECT 1 FROM public.bookings
      JOIN public.rooms ON bookings.room_id = rooms.id
      WHERE rooms.hostel_id = reviews.hostel_id
        AND bookings.student_id = auth.uid()
    )
  );

-- --------------------------------------------
-- 5. Performance Indexes
-- --------------------------------------------
CREATE INDEX idx_hostels_city_area ON public.hostels (city, area);
CREATE INDEX idx_rooms_hostel_id ON public.rooms (hostel_id);
CREATE INDEX idx_bookings_room_id ON public.bookings (room_id);
CREATE INDEX idx_bookings_student_id ON public.bookings (student_id);
CREATE INDEX idx_reviews_hostel_id ON public.reviews (hostel_id);

-- --------------------------------------------
-- 6. Supabase Auth Integration Trigger
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  assigned_role public.user_role;
BEGIN
  IF (NEW.raw_user_meta_data->>'role') = 'owner' THEN
    assigned_role := 'owner'::public.user_role;
  ELSE
    assigned_role := 'student'::public.user_role;
  END IF;

  INSERT INTO public.profiles (id, email, role, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    assigned_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
