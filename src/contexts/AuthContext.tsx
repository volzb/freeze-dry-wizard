
import { createContext, useState, useContext, useEffect, ReactNode } from 'react';

type User = {
  id: string;
  email?: string;
  name?: string;
  authProvider?: 'email' | 'apple';
};

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
  saveConfigurationToStorage: (userId: string, configurations: any[]) => void;
  getConfigurationsFromStorage: (userId: string) => any[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_PREFIX = 'freezedryer-configs-';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  
  useEffect(() => {
    // Check localStorage for existing user session
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
        console.log("Restored user session from localStorage:", parsedUser.id);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('user');
      }
    }
  }, []);

  const saveConfigurationToStorage = (userId: string, configurations: any[]) => {
    try {
      const key = `${STORAGE_PREFIX}${userId}`;
      
      // Make a deep copy to ensure we don't store any references
      const configsCopy = JSON.parse(JSON.stringify(configurations));
      
      // Log before saving to verify complete data
      console.log(`Saving configurations for ${userId}:`, configsCopy);
      
      // Ensure all required settings fields are present in each configuration
      configsCopy.forEach((config: any) => {
        if (!config.settings) {
          config.settings = {};
        }
        
        // Explicitly ensure hashPerTray exists for each configuration
        if (config.settings.hashPerTray !== undefined) {
          // Explicitly log the hashPerTray value before saving
          console.log(`Config '${config.name}' hashPerTray before save:`, config.settings.hashPerTray);
        } else {
          console.log(`Setting default hashPerTray for config '${config.name}'`);
          config.settings.hashPerTray = 0.15; // Default value
        }
        
        // Ensure other important settings have defaults
        if (config.settings.waterPercentage === undefined) {
          config.settings.waterPercentage = 75;
        }
      });
      
      // Stringify and save to localStorage
      localStorage.setItem(key, JSON.stringify(configsCopy));
      console.log(`Saved ${configurations.length} configurations for user ${userId} to ${key}:`, configsCopy);
      
      // Verify what was actually saved
      const savedConfigs = localStorage.getItem(key);
      if (savedConfigs) {
        const parsed = JSON.parse(savedConfigs);
        parsed.forEach((config: any) => {
          console.log(`Verified saved config '${config.name}' hashPerTray:`, config.settings.hashPerTray);
        });
      }
    } catch (error) {
      console.error('Error saving configurations to storage:', error);
    }
  };

  const getConfigurationsFromStorage = (userId: string) => {
    try {
      const key = `${STORAGE_PREFIX}${userId}`;
      const configs = localStorage.getItem(key);
      console.log(`Looking for configurations in ${key}`);
      
      if (configs) {
        const parsedConfigs = JSON.parse(configs);
        
        // Verify all configuration objects have required fields
        const validatedConfigs = parsedConfigs.map((config: any) => {
          // Create a deep copy
          const fullConfig = JSON.parse(JSON.stringify(config));
          
          // Ensure settings object exists
          if (!fullConfig.settings) {
            fullConfig.settings = {};
          }
          
          // Log the hashPerTray value we're loading
          console.log(`Loading hashPerTray for config '${fullConfig.name}':`, fullConfig.settings.hashPerTray);
          
          // Ensure hashPerTray exists
          if (fullConfig.settings.hashPerTray === undefined) {
            console.log(`Setting default hashPerTray for config '${fullConfig.name}' during load`);
            fullConfig.settings.hashPerTray = 0.15;
          }
          
          // Ensure waterPercentage exists
          if (fullConfig.settings.waterPercentage === undefined) {
            fullConfig.settings.waterPercentage = 75;
          }
          
          return fullConfig;
        });
        
        console.log(`Retrieved ${validatedConfigs.length} configurations for user ${userId}:`, validatedConfigs);
        return validatedConfigs;
      } else {
        console.log(`No configurations found for user ${userId} at key ${key}`);
      }
    } catch (error) {
      console.error(`Error retrieving configurations from storage for ${userId}:`, error);
    }
    return [];
  };

  const login = (userData: User) => {
    console.log("Login called with user:", userData);
    
    if (!userData || !userData.id) {
      console.error("Login attempted with invalid user data:", userData);
      return;
    }
    
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem('user', JSON.stringify(userData));
    
    // Ensure any previously anonymous saved settings are migrated to the user account
    migrateAnonymousSettings(userData.id);
  };
  
  const migrateAnonymousSettings = (userId: string) => {
    try {
      const anonymousKey = `${STORAGE_PREFIX}anonymous`;
      const userKey = `${STORAGE_PREFIX}${userId}`;
      
      console.log(`Attempting to migrate settings from ${anonymousKey} to ${userKey}`);
      const anonymousSettings = localStorage.getItem(anonymousKey);
      
      if (anonymousSettings) {
        // Check if user already has settings
        const existingUserSettings = localStorage.getItem(userKey);
        
        if (!existingUserSettings) {
          // Save anonymous settings to the user's storage
          localStorage.setItem(userKey, anonymousSettings);
          console.log('Successfully migrated anonymous settings to user account', userId);
          
          // Verify migration was successful
          const migratedSettings = localStorage.getItem(userKey);
          if (migratedSettings) {
            const parsedSettings = JSON.parse(migratedSettings);
            console.log('Verified migrated settings:', parsedSettings);
          }
        } else {
          console.log('User already has settings, no migration needed');
          console.log('Existing user settings:', JSON.parse(existingUserSettings));
        }
      } else {
        console.log('No anonymous settings found to migrate');
      }
      
      // Verify all settings in local storage for debugging
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          console.log(`Found storage key: ${key}`);
        }
      }
    } catch (error) {
      console.error('Error migrating anonymous settings:', error);
    }
  };

  const logout = () => {
    // We're not going to delete saved configurations when logging out
    console.log("Logging out user:", user?.id);
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      login, 
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
