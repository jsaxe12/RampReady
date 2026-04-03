import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Use sessionStorage so each browser tab has its own independent session.
    // This allows logging in as FBO in one tab and Pilot in another without
    // one overwriting the other. Refresh preserves the session within each tab.
    storage: sessionStorage,
    // Disable cross-tab session sync — we want tabs to be independent
    storageKey: `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`,
  },
})
