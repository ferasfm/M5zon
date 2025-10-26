// lib/supabaseClient.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Exporting the type for use in context
export type { SupabaseClient };

let supabase: SupabaseClient | null = null;
let currentSupabaseUrl: string | null = null;

export const createSupabaseClient = (supabaseUrl: string, supabaseKey: string): SupabaseClient => {
  // FIX: The `supabaseUrl` property is protected. Stored the URL in a module-level variable to check if the client needs re-initialization.
  if (!supabase || currentSupabaseUrl !== supabaseUrl) {
    supabase = createClient(supabaseUrl, supabaseKey);
    currentSupabaseUrl = supabaseUrl;
  }
  return supabase;
};

export const getSupabaseClient = (): SupabaseClient | null => {
    return supabase;
}