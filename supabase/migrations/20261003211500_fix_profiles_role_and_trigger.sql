-- ============================================================================
-- Migration: Fix Profiles Schema, Enforce Role RLS Security & Backfill Orphans
-- ============================================================================

-- 1. Ensure all expected columns exist on public.profiles idempotently
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'student',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Handle legacy user_id column constraint if present on remote DB
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='user_id') THEN
    ALTER TABLE public.profiles ALTER COLUMN user_id DROP NOT NULL;
    UPDATE public.profiles SET user_id = id WHERE user_id IS NULL;
  END IF;
END $$;

-- Migrate data from legacy column names if present (e.g. name -> full_name, profile_photo -> avatar_url)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='name') THEN
    UPDATE public.profiles SET full_name = COALESCE(full_name, name) WHERE full_name IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='profile_photo') THEN
    UPDATE public.profiles SET avatar_url = COALESCE(avatar_url, profile_photo) WHERE avatar_url IS NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_check CHECK (role IN ('student', 'owner'));
  END IF;
END $$;

-- 2. Recreate public.handle_new_user() without swallowing errors
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  assigned_role text;
  has_user_id boolean;
BEGIN
  -- Strict allow-list: only 'owner' is permitted, fallback everything else to 'student'
  IF (NEW.raw_user_meta_data->>'role') = 'owner' THEN
    assigned_role := 'owner';
  ELSE
    assigned_role := 'student';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='profiles' AND column_name='user_id'
  ) INTO has_user_id;

  IF has_user_id THEN
    EXECUTE 'INSERT INTO public.profiles (id, user_id, email, role, full_name, avatar_url) VALUES ($1, $1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING'
    USING NEW.id, COALESCE(NEW.email, ''), assigned_role, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''), NEW.raw_user_meta_data->>'avatar_url';
  ELSE
    INSERT INTO public.profiles (id, email, role, full_name, avatar_url)
    VALUES (
      NEW.id,
      COALESCE(NEW.email, ''),
      assigned_role,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
      NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Re-create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. RLS Security: Prevent users from updating their own `role` column
REVOKE UPDATE (role) ON public.profiles FROM authenticated, anon;

CREATE OR REPLACE FUNCTION public.prevent_profile_role_update()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Modifying profile role is not permitted.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_prevent_profile_role_update ON public.profiles;
CREATE TRIGGER tr_prevent_profile_role_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_role_update();

-- 4. Idempotent Backfill: Create missing profiles for orphan auth.users
DO $$
DECLARE
  has_user_id boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='profiles' AND column_name='user_id'
  ) INTO has_user_id;

  IF has_user_id THEN
    EXECUTE '
      INSERT INTO public.profiles (id, user_id, email, role, full_name, avatar_url)
      SELECT
        u.id,
        u.id,
        COALESCE(u.email, ''''),
        CASE WHEN (u.raw_user_meta_data->>''role'') = ''owner'' THEN ''owner'' ELSE ''student'' END,
        COALESCE(u.raw_user_meta_data->>''full_name'', u.raw_user_meta_data->>''name'', ''''),
        u.raw_user_meta_data->>''avatar_url''
      FROM auth.users u
      LEFT JOIN public.profiles p ON p.id = u.id
      WHERE p.id IS NULL
      ON CONFLICT (id) DO NOTHING;
    ';
  ELSE
    INSERT INTO public.profiles (id, email, role, full_name, avatar_url)
    SELECT
      u.id,
      COALESCE(u.email, ''),
      CASE WHEN (u.raw_user_meta_data->>'role') = 'owner' THEN 'owner' ELSE 'student' END,
      COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''),
      u.raw_user_meta_data->>'avatar_url'
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE p.id IS NULL
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
