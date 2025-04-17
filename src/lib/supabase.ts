
import { createClient } from "@supabase/supabase-js";

// Replace these with your actual Supabase URL and anon key
// If environment variables aren't available, use fallback values for development
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://your-project-id.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "your-anon-key";

// Ensure we have valid values for the client
if (!supabaseUrl.includes("supabase.co") || supabaseAnonKey === "your-anon-key") {
  console.warn("Using placeholder Supabase credentials. Please set proper environment variables.");
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
