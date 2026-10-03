
-- ============================================
-- HostelMate Database Schema Migration
-- ============================================

-- Clean Teardown (Safe Re-execution)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.has_role(_user_id UUID, _role public.app_role) CASCADE;

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

DROP TYPE IF EXISTS public.app_role CASCADE;

-- 1. Custom Role Enum
CREATE TYPE public.app_role AS ENUM ('guest', 'owner', 'admin');

-- 2. Profiles Table (Linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT,
  profile_photo TEXT,
  phone TEXT,
  loyalty_points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. User Roles Table (Role-based Access Control)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 4. Security Definer Helper for Role Checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- 5. Hostels Table
CREATE TABLE public.hostels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT,
  vibe_type TEXT,
  amenities TEXT[] DEFAULT '{}',
  verified_status BOOLEAN NOT NULL DEFAULT false,
  rating NUMERIC(2,1) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Rooms Table
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id UUID REFERENCES public.hostels(id) ON DELETE CASCADE NOT NULL,
  room_type TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  beds_available INTEGER NOT NULL DEFAULT 0,
  max_occupancy INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Bookings Table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  hostel_id UUID REFERENCES public.hostels(id) ON DELETE CASCADE NOT NULL,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Reviews Table
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  hostel_id UUID REFERENCES public.hostels(id) ON DELETE CASCADE NOT NULL,
  cleanliness_rating INTEGER CHECK (cleanliness_rating BETWEEN 1 AND 5),
  staff_rating INTEGER CHECK (staff_rating BETWEEN 1 AND 5),
  location_rating INTEGER CHECK (location_rating BETWEEN 1 AND 5),
  atmosphere_rating INTEGER CHECK (atmosphere_rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Events Table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id UUID REFERENCES public.hostels(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Chat Messages Table
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id UUID REFERENCES public.hostels(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Complaints & Maintenance Tracker Table
CREATE TABLE public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id UUID REFERENCES public.hostels(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  student_name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved')),
  owner_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. Daily Mess Ratings Table
CREATE TABLE public.mess_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostel_id UUID REFERENCES public.hostels(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  student_name TEXT NOT NULL,
  meal TEXT NOT NULL CHECK (meal IN ('Breakfast', 'Lunch', 'Dinner')),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5) NOT NULL,
  emoji TEXT,
  comment TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hostel_id, user_id, meal, date)
);

-- ============================================
-- Enable Row Level Security (RLS) on all tables
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hostels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mess_ratings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies
-- ============================================

-- Profiles Policies
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- User Roles Policies
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Hostels Policies
CREATE POLICY "Hostels are viewable by everyone" ON public.hostels FOR SELECT USING (true);
CREATE POLICY "Owners can insert hostels" ON public.hostels FOR INSERT WITH CHECK (auth.uid() = owner_id AND public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can update own hostels" ON public.hostels FOR UPDATE USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners can delete own hostels" ON public.hostels FOR DELETE USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

-- Rooms Policies
CREATE POLICY "Rooms are viewable by everyone" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Owners can insert rooms" ON public.rooms FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.hostels WHERE id = hostel_id AND owner_id = auth.uid())
);
CREATE POLICY "Owners can update rooms" ON public.rooms FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.hostels WHERE id = hostel_id AND owner_id = auth.uid())
);
CREATE POLICY "Owners can delete rooms" ON public.rooms FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.hostels WHERE id = hostel_id AND owner_id = auth.uid())
);

-- Bookings Policies
CREATE POLICY "Guests can view own bookings" ON public.bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owners can view hostel bookings" ON public.bookings FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.hostels WHERE id = hostel_id AND owner_id = auth.uid())
);
CREATE POLICY "Admins can view all bookings" ON public.bookings FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Guests can create bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Guests can update own bookings" ON public.bookings FOR UPDATE USING (auth.uid() = user_id);

-- Reviews Policies
CREATE POLICY "Reviews are viewable by everyone" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Guests can create reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Guests can update own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Guests can delete own reviews" ON public.reviews FOR DELETE USING (auth.uid() = user_id);

-- Events Policies
CREATE POLICY "Events are viewable by everyone" ON public.events FOR SELECT USING (true);
CREATE POLICY "Owners can create events" ON public.events FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.hostels WHERE id = hostel_id AND owner_id = auth.uid()) OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Owners can update events" ON public.events FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.hostels WHERE id = hostel_id AND owner_id = auth.uid()) OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Owners can delete events" ON public.events FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.hostels WHERE id = hostel_id AND owner_id = auth.uid()) OR public.has_role(auth.uid(), 'admin')
);

-- Chat Messages Policies
CREATE POLICY "Booked users and owners can view chat" ON public.chat_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.bookings
    WHERE bookings.hostel_id = chat_messages.hostel_id
    AND bookings.user_id = auth.uid()
    AND bookings.status = 'confirmed'
    AND bookings.check_in - INTERVAL '5 days' <= now()
    AND bookings.check_out + INTERVAL '2 days' >= now()
  )
  OR EXISTS (SELECT 1 FROM public.hostels WHERE id = chat_messages.hostel_id AND owner_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Booked users and owners can send chat" ON public.chat_messages FOR INSERT WITH CHECK (
  auth.uid() = user_id
  AND (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.hostel_id = chat_messages.hostel_id
      AND bookings.user_id = auth.uid()
      AND bookings.status = 'confirmed'
      AND bookings.check_in - INTERVAL '5 days' <= now()
      AND bookings.check_out + INTERVAL '2 days' >= now()
    )
    OR EXISTS (SELECT 1 FROM public.hostels WHERE id = chat_messages.hostel_id AND owner_id = auth.uid())
  )
);

CREATE POLICY "Owners and admins can delete chat" ON public.chat_messages FOR DELETE USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.hostels WHERE id = chat_messages.hostel_id AND owner_id = auth.uid())
);

-- Complaints Policies
CREATE POLICY "Users can view own complaints" ON public.complaints FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owners can view hostel complaints" ON public.complaints FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.hostels WHERE id = hostel_id AND owner_id = auth.uid())
);
CREATE POLICY "Admins can view all complaints" ON public.complaints FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create complaints" ON public.complaints FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners and admins can update complaint status" ON public.complaints FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.hostels WHERE id = hostel_id AND owner_id = auth.uid()) OR public.has_role(auth.uid(), 'admin') OR auth.uid() = user_id
);

-- Mess Ratings Policies
CREATE POLICY "Mess ratings are viewable by everyone" ON public.mess_ratings FOR SELECT USING (true);
CREATE POLICY "Users can insert own mess rating" ON public.mess_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own mess rating" ON public.mess_ratings FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- Performance B-Tree Indexes
-- ============================================
CREATE INDEX idx_hostels_location ON public.hostels USING btree (location);
CREATE INDEX idx_hostels_rating ON public.hostels USING btree (rating);
CREATE INDEX idx_hostels_vibe_type ON public.hostels USING btree (vibe_type);
CREATE INDEX idx_rooms_hostel ON public.rooms USING btree (hostel_id);
CREATE INDEX idx_rooms_price ON public.rooms USING btree (price);
CREATE INDEX idx_bookings_user ON public.bookings USING btree (user_id);
CREATE INDEX idx_bookings_hostel ON public.bookings USING btree (hostel_id);
CREATE INDEX idx_chat_messages_hostel ON public.chat_messages USING btree (hostel_id, created_at);
CREATE INDEX idx_reviews_hostel ON public.reviews USING btree (hostel_id);
CREATE INDEX idx_complaints_hostel ON public.complaints USING btree (hostel_id, status);
CREATE INDEX idx_complaints_user ON public.complaints USING btree (user_id);
CREATE INDEX idx_mess_ratings_hostel_date ON public.mess_ratings USING btree (hostel_id, date);

-- ============================================
-- Realtime Subscriptions
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mess_ratings;

-- ============================================
-- Auto-create profile on signup (Exception-Safe)
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (user_id, name, email)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', ''), NEW.email)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      INSERT INTO public.profiles (id, email, full_name)
      VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''))
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'handle_new_user profiles insert failed: %', SQLERRM;
    END;
  END;

  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'guest')
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- user_roles table optional
    NULL;
  END;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user trigger encountered an error: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


