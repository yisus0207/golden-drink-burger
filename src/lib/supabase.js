import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';

console.log('DEBUG: Supabase URL configured as:', supabaseUrl);
if (supabaseUrl.includes('placeholder')) {
  console.warn('CRITICAL: Using placeholder Supabase URL! Environment variables not loaded.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
