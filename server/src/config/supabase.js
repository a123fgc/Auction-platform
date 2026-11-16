const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

// Service-role client — server only. Never expose to the browser.
const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

module.exports = supabase;