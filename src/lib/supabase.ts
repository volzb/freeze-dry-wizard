
import { supabase as supabaseClient } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

// Export the initialized Supabase client
export const supabase = supabaseClient;

// Define database types
export type FreezeDryerConfig = Database['public']['Tables']['freeze_dryer_configs']['Row'];

// Helper function to check if Supabase is correctly initialized
export const isSupabaseInitialized = () => {
  return !!supabase;
};

// Create a SQL migration first to ensure the table exists
export const ensureFreezeDryerConfigTable = async () => {
  try {
    // Check if the table exists
    const { error } = await supabase
      .from('freeze_dryer_configs')
      .select('id')
      .limit(1);
    
    // If there's no error, the table exists
    if (!error) return true;
    
    console.log("freeze_dryer_configs table may not exist");
    return false;
  } catch (e) {
    console.error("Error checking freeze_dryer_configs table:", e);
    return false;
  }
};
