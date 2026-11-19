-- Password reset tokens table
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prt_token_hash
  ON public.password_reset_tokens (token_hash);

CREATE INDEX IF NOT EXISTS idx_prt_user_id
  ON public.password_reset_tokens (user_id);

CREATE INDEX IF NOT EXISTS idx_prt_expires_at
  ON public.password_reset_tokens (expires_at);

-- Optional: auto-cleanup of expired tokens (run manually or via cron)
-- DELETE FROM password_reset_tokens WHERE expires_at < now() - interval '1 day';