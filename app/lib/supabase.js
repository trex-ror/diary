import { createClient } from '@supabase/supabase-js';

// Fallback ke dummy URL agar build Vercel tidak crash jika ENV belum diset
const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co';
const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key';

export const supabase = createClient(supabaseUrl, supabaseKey);
