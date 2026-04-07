// Supabase client using service_role key (bypasses RLS).
// The key is stored in environment variables — never commit it.

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = supabase;
