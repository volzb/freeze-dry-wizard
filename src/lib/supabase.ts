
import { supabase as supabaseClient } from "@/integrations/supabase/client";

// Export the initialized Supabase client
export const supabase = supabaseClient;

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
