
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";

// Replace these with your actual Supabase URL and anon key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Check if the credentials are available
const hasValidCredentials = supabaseUrl && supabaseAnonKey;

if (!hasValidCredentials) {
  console.warn("Missing Supabase credentials. Authentication features will not work.");
}

// Create the Supabase client only if we have valid credentials
export const supabase = hasValidCredentials 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

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

// Helper function to check if Supabase is correctly initialized
export const isSupabaseInitialized = () => {
  return !!supabase;
};
