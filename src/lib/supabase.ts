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

// Ensure the table exists (this runs when the module is imported)
(async () => {
  try {
    if (isSupabaseInitialized()) {
      await ensureFreezeDryerConfigTable();
    }
  } catch (e) {
    console.error("Error checking/creating freeze_dryer_configs table:", e);
  }
})();

// Create a SQL migration first to ensure the table exists
export const ensureFreezeDryerConfigTable = async () => {
  try {
    // Check if the table exists
    const { error } = await supabase
      .from('freeze_dryer_configs')
      .select('id')
      .limit(1);
    
    // If there's no error, the table exists
    if (!error) {
      console.log("freeze_dryer_configs table exists");
      return true;
    }
    
    console.log("freeze_dryer_configs table may not exist, checking further...");
    
    // If there's an error in the select query, check if it's because the table doesn't exist
    if (error.message?.includes('relation "public.freeze_dryer_configs" does not exist')) {
      console.error("Table does not exist:", error);
      return false;
    }
    
    // Other errors
    console.error("Error checking for table:", error);
    return false;
  } catch (e) {
    console.error("Exception checking freeze_dryer_configs table:", e);
    return false;
  }
};
