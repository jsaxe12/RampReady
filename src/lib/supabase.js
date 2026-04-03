import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
}

// Each tab gets a unique ID (persists on refresh via sessionStorage).
// This isolates both the auth storage key AND the BroadcastChannel name
// so tabs cannot interfere with each other's sessions.
let tabId = sessionStorage.getItem('rr_tab_id')
if (!tabId) {
  tabId = crypto.randomUUID()
  sessionStorage.setItem('rr_tab_id', tabId)
}

const projectRef = new URL(supabaseUrl).hostname.split('.')[0]

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: sessionStorage,
    storageKey: `sb-${projectRef}-auth-${tabId}`,
  },
})
