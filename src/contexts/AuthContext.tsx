
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
      localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(configurations));
      console.log(`Saved ${configurations.length} configurations for user ${userId}`);
    } catch (error) {
      console.error('Error saving configurations to storage:', error);
    }
  };

  const getConfigurationsFromStorage = (userId: string) => {
    try {
      const configs = localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
      if (configs) {
        const parsedConfigs = JSON.parse(configs);
        console.log(`Retrieved ${parsedConfigs.length} configurations for user ${userId}`);
        return parsedConfigs;
      }
    } catch (error) {
      console.error('Error retrieving configurations from storage:', error);
    }
    return [];
  };

  const login = (userData: User) => {
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem('user', JSON.stringify(userData));
    
    // Ensure any previously anonymous saved settings are migrated to the user account
    migrateAnonymousSettings(userData.id);
  };
  
  const migrateAnonymousSettings = (userId: string) => {
    try {
      const anonymousSettings = localStorage.getItem(`${STORAGE_PREFIX}anonymous`);
      if (anonymousSettings) {
        // Save anonymous settings to the user's storage
        localStorage.setItem(`${STORAGE_PREFIX}${userId}`, anonymousSettings);
        console.log('Migrated anonymous settings to user account', userId);
      }
    } catch (error) {
      console.error('Error migrating anonymous settings:', error);
    }
  };

  const logout = () => {
    // We're not going to delete saved configurations when logging out
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
