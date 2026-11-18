-- Add profile fields to users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS website text;

-- Constraint: bio max 500 chars, avatar_url must be valid URL
ALTER TABLE public.users
  ADD CONSTRAINT chk_bio_length CHECK (bio IS NULL OR char_length(bio) <= 500);

-- Index for avatar (optional but useful for profile pages)
CREATE INDEX IF NOT EXISTS idx_users_avatar ON public.users (avatar_url) WHERE avatar_url IS NOT NULL;