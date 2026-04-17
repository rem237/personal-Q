// --------------------------------------------------
// Replace these with your Supabase project values.
// Found at: https://supabase.com/dashboard → your project → Settings → API
// --------------------------------------------------
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
