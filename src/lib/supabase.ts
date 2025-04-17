
import { createClient } from "@supabase/supabase-js";

// Replace these with your actual Supabase URL and anon key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Define database types
export type FreezeDryerConfig = {
  id: string;
  user_id: string;
  name: string;
  settings: any;
  steps: any[];
  created_at: string;
  updated_at: string;
};
