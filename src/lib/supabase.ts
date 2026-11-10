import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 
  (typeof window !== 'undefined' && import.meta.env.PROD)
    ? window.location.origin + '/supabase'
    : 'https://fuqqhvqqgogggcttshlz.supabase.co';

export const SUPABASE_ANON_KEY = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || 
  'sb_publishable_foV3RGiEE7d-Usq0kWUqGQ_CrI_pI19';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
