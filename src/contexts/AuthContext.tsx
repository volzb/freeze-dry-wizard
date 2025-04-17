
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
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('user');
      }
    }
  }, []);

  const saveConfigurationToStorage = (userId: string, configurations: any[]) => {
    try {
      const key = `${STORAGE_PREFIX}${userId}`;
      localStorage.setItem(key, JSON.stringify(configurations));
      console.log(`Saved ${configurations.length} configurations for user ${userId} to ${key}`);
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
        console.log(`Retrieved ${parsedConfigs.length} configurations for user ${userId}`);
        return parsedConfigs;
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
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem('user', JSON.stringify(userData));
    
    // Ensure any previously anonymous saved settings are migrated to the user account
    if (userData && userData.id) {
      migrateAnonymousSettings(userData.id);
    } else {
      console.error("Login attempted with invalid user data:", userData);
    }
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
        } else {
          console.log('User already has settings, no migration needed');
        }
      } else {
        console.log('No anonymous settings found to migrate');
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
