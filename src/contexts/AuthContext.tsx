
import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { supabase, isSupabaseInitialized, FreezeDryerConfig } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';

type AuthUser = {
  id: string;
  email?: string;
  name?: string;
  authProvider?: 'email' | 'apple';
};

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithApple: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  saveConfigurationToStorage: (userId: string, configurations: any[]) => Promise<void>;
  getConfigurationsFromStorage: (userId: string) => Promise<any[]>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [session, setSession] = useState<Session | null>(null);
  
  useEffect(() => {
    if (!isSupabaseInitialized()) {
      console.warn("Supabase is not initialized. Authentication features will not work.");
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log("Supabase auth event:", event);
        setSession(currentSession);
        
        if (currentSession && currentSession.user) {
          const supabaseUser = currentSession.user;
          const authUser: AuthUser = {
            id: supabaseUser.id,
            email: supabaseUser.email || undefined,
            name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
            authProvider: (supabaseUser.app_metadata.provider === 'apple' ? 'apple' : 'email') as 'email' | 'apple',
          };
          setUser(authUser);
          setIsAuthenticated(true);
          console.log("User authenticated:", authUser);
        } else {
          setUser(null);
          setIsAuthenticated(false);
          console.log("User signed out");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (initialSession && initialSession.user) {
        const supabaseUser = initialSession.user;
        const authUser: AuthUser = {
          id: supabaseUser.id,
          email: supabaseUser.email || undefined,
          name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
          authProvider: (supabaseUser.app_metadata.provider === 'apple' ? 'apple' : 'email') as 'email' | 'apple',
        };
        setUser(authUser);
        setIsAuthenticated(true);
        setSession(initialSession);
        console.log("Initial session loaded:", authUser);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const saveConfigurationToStorage = async (userId: string, configurations: any[]) => {
    if (!isSupabaseInitialized()) {
      toast.error("Authentication is not available. Please set up Supabase credentials.");
      return;
    }

    try {
      if (!userId || userId === 'anonymous') {
        console.log("Not saving configurations for anonymous user");
        return;
      }

      console.log(`Saving ${configurations.length} configurations for user ${userId}`);
      
      // Get existing configurations to compare and determine updates/inserts
      const { data: existingConfigs, error: fetchError } = await supabase
        .from('freeze_dryer_configs')
        .select('*')
        .eq('user_id', userId);
        
      if (fetchError) {
        console.error("Error fetching existing configurations:", fetchError);
        throw fetchError;
      }
      
      console.log("Existing configs in database:", existingConfigs);
      
      // Process each configuration
      for (const config of configurations) {
        const configData = {
          user_id: userId,
          name: config.name,
          settings: config.settings || {},
          steps: config.steps || [],
        };
        
        // Ensure numeric values are properly formatted
        if (configData.settings && typeof configData.settings === 'object') {
          if ('hashPerTray' in configData.settings) {
            configData.settings.hashPerTray = Number(configData.settings.hashPerTray);
          }
          if ('waterPercentage' in configData.settings) {
            configData.settings.waterPercentage = Number(configData.settings.waterPercentage);
          }
        }
        
        // Check if this configuration exists by name
        const existingConfig = existingConfigs?.find(ec => ec.id === config.id);
        
        if (existingConfig) {
          // Update existing configuration
          console.log(`Updating configuration ${config.name} with ID ${config.id}`);
          const { error: updateError } = await supabase
            .from('freeze_dryer_configs')
            .update(configData)
            .eq('id', config.id);
            
          if (updateError) {
            console.error("Error updating configuration:", updateError);
            throw updateError;
          }
        } else {
          // Insert new configuration
          console.log(`Inserting new configuration ${config.name}`);
          const { error: insertError } = await supabase
            .from('freeze_dryer_configs')
            .insert({
              ...configData,
              id: config.id // Include the UUID that was generated client-side
            });
            
          if (insertError) {
            console.error("Error inserting configuration:", insertError);
            throw insertError;
          }
        }
      }
      
      // Handle deletion - identify configs that exist in DB but not in current list
      if (existingConfigs) {
        const currentIds = configurations.map(c => c.id);
        const configsToDelete = existingConfigs.filter(ec => !currentIds.includes(ec.id));
        
        if (configsToDelete.length > 0) {
          console.log(`Deleting ${configsToDelete.length} removed configurations`);
          for (const configToDelete of configsToDelete) {
            const { error: deleteError } = await supabase
              .from('freeze_dryer_configs')
              .delete()
              .eq('id', configToDelete.id);
              
            if (deleteError) {
              console.error("Error deleting configuration:", deleteError);
              // Continue with other deletions even if one fails
            }
          }
        }
      }
      
      console.log(`Successfully saved configurations for user ${userId}`);
    } catch (error) {
      console.error('Error saving configurations to Supabase:', error);
      toast.error("Failed to save configurations");
      throw error;
    }
  };

  const getConfigurationsFromStorage = async (userId: string) => {
    if (!isSupabaseInitialized()) {
      toast.error("Authentication is not available. Please set up Supabase credentials.");
      return [];
    }

    try {
      if (!userId || userId === 'anonymous') {
        console.log("Not loading configurations for anonymous user");
        return [];
      }

      console.log(`Loading configurations for user: ${userId}`);
      
      const { data, error } = await supabase
        .from('freeze_dryer_configs')
        .select('*')
        .eq('user_id', userId);
        
      if (error) {
        console.error("Error fetching configurations:", error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        console.log(`No configurations found for user ${userId}`);
        return [];
      }
      
      const configurations = data.map(record => {
        let settings = record.settings || {};
        
        // Ensure hashPerTray is a number
        if ('hashPerTray' in settings) {
          settings.hashPerTray = Number(settings.hashPerTray);
          console.log(`Loaded hashPerTray for config '${record.name}':`, settings.hashPerTray);
        } else {
          console.log(`Setting default hashPerTray for config '${record.name}' during load`);
          settings.hashPerTray = 0.15;
        }
        
        // Ensure waterPercentage is a number
        if ('waterPercentage' in settings) {
          settings.waterPercentage = Number(settings.waterPercentage);
        } else {
          settings.waterPercentage = 75;
        }
        
        return {
          id: record.id,
          name: record.name,
          settings: settings,
          steps: record.steps || [],
          createdAt: record.created_at,
          updatedAt: record.updated_at
        };
      });
      
      console.log(`Retrieved ${configurations.length} configurations for user ${userId}:`, configurations);
      return configurations;
    } catch (error) {
      console.error(`Error retrieving configurations from Supabase for ${userId}:`, error);
      toast.error("Failed to load configurations");
      return [];
    }
  };

  const login = async (email: string, password: string) => {
    if (!isSupabaseInitialized()) {
      toast.error("Authentication is not available. Please set up Supabase credentials.");
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Login error:", error.message);
        toast.error(error.message);
        throw error;
      }

      console.log("Login successful:", data);
      toast.success("Login successful!");
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };
  
  const loginWithApple = async () => {
    if (!isSupabaseInitialized()) {
      toast.error("Authentication is not available. Please set up Supabase credentials.");
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: window.location.origin + '/calculator'
        }
      });
      
      if (error) {
        console.error("Apple login error:", error.message);
        toast.error(error.message);
        throw error;
      }
      
      console.log("Apple login initiated:", data);
    } catch (error) {
      console.error("Apple login failed:", error);
      throw error;
    }
  };
  
  const register = async (email: string, password: string, name: string) => {
    if (!isSupabaseInitialized()) {
      toast.error("Authentication is not available. Please set up Supabase credentials.");
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          },
        }
      });

      if (error) {
        console.error("Registration error:", error.message);
        toast.error(error.message);
        throw error;
      }

      console.log("Registration successful:", data);
      toast.success("Account created successfully!");
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    }
  };

  const logout = async () => {
    if (!isSupabaseInitialized()) {
      toast.error("Authentication is not available. Please set up Supabase credentials.");
      return;
    }

    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Logout error:", error.message);
        toast.error(error.message);
        throw error;
      }
      
      console.log("Logout successful");
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      login, 
      loginWithApple,
      register,
      logout,
      saveConfigurationToStorage,
      getConfigurationsFromStorage
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
