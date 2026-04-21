-- 1. Expand orbit_segment enum to include the 7 canonical segments
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'orbit_segment') THEN
    CREATE TYPE public.orbit_segment AS ENUM ('youth','founder','expert','investor','diaspora','partner','researcher');
  END IF;
END$$;

-- Add any missing values (safe if already present)
ALTER TYPE public.orbit_segment ADD VALUE IF NOT EXISTS 'youth';
ALTER TYPE public.orbit_segment ADD VALUE IF NOT EXISTS 'founder';
ALTER TYPE public.orbit_segment ADD VALUE IF NOT EXISTS 'expert';
ALTER TYPE public.orbit_segment ADD VALUE IF NOT EXISTS 'investor';
ALTER TYPE public.orbit_segment ADD VALUE IF NOT EXISTS 'diaspora';
ALTER TYPE public.orbit_segment ADD VALUE IF NOT EXISTS 'partner';
ALTER TYPE public.orbit_segment ADD VALUE IF NOT EXISTS 'researcher';

-- 2. Add new columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by UUID,
  ADD COLUMN IF NOT EXISTS segment_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS region TEXT,        -- e.g. "South Asia", "North America"
  ADD COLUMN IF NOT EXISTS timezone TEXT;      -- IANA tz captured at signup

-- 3. Trigger: prevent non-admin self-verification.
-- A user updating their own profile cannot flip is_verified or change verified_* fields.
CREATE OR REPLACE FUNCTION public.guard_profile_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the actor is an admin, allow anything
  IF public.has_role(auth.uid(), 'admin') THEN
    -- Stamp verified_at / verified_by automatically when admin flips is_verified to true
    IF NEW.is_verified = true AND (OLD.is_verified = false OR OLD.is_verified IS NULL) THEN
      NEW.verified_at := now();
      NEW.verified_by := auth.uid();
    ELSIF NEW.is_verified = false AND OLD.is_verified = true THEN
      NEW.verified_at := NULL;
      NEW.verified_by := NULL;
    END IF;
    RETURN NEW;
  END IF;

  -- Non-admin: cannot change verification fields
  IF NEW.is_verified IS DISTINCT FROM OLD.is_verified
     OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
     OR NEW.verified_by IS DISTINCT FROM OLD.verified_by THEN
    RAISE EXCEPTION 'Only admins can change verification status';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_verification ON public.profiles;
CREATE TRIGGER profiles_guard_verification
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.guard_profile_verification();

-- 4. Trigger: keep updated_at fresh on profiles
DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 5. RLS: admins need full UPDATE on profiles (already exists from earlier policy "Admins can update any profile") — leave as-is.
-- Add an INSERT policy for admins so they can insert role rows for other users (already exists too).

-- 6. Public directory needs to surface verification — already covered by "Public profiles viewable by everyone" (is_public = true).

-- 7. Helpful index for directory filtering
CREATE INDEX IF NOT EXISTS profiles_public_segment_idx
  ON public.profiles (is_public, orbit_segment)
  WHERE is_public = true;

CREATE INDEX IF NOT EXISTS profiles_segment_idx
  ON public.profiles (orbit_segment);