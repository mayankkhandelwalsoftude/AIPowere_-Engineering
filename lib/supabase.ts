import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hjitstijzpppwoepragj.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_FGCrD7EXl687Rk15zOGk5w_AVEu0Jzp'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
