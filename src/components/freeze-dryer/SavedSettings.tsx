
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronDown, Save, Trash2, Loader2 } from "lucide-react";
import { FreezeDryerSettings, DryingStep } from "@/utils/freezeDryerCalculations";

export type SavedSettingsRecord = {
  id: string;
  name: string;
  settings: Partial<FreezeDryerSettings>;
  steps: DryingStep[];
  createdAt: string;
  updatedAt: string;
};

interface SavedSettingsProps {
  currentSettings: Partial<FreezeDryerSettings>;
  currentSteps: DryingStep[];
  onLoadSettings: (settings: Partial<FreezeDryerSettings>, steps: DryingStep[]) => void;
}

export function SavedSettings({
  currentSettings,
  currentSteps,
  onLoadSettings,
}: SavedSettingsProps) {
  const [savedConfigs, setSavedConfigs] = useState<SavedSettingsRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [configName, setConfigName] = useState("");
  const { isAuthenticated, user, saveConfigurationToStorage, getConfigurationsFromStorage } = useAuth();

  // Load saved configurations when component mounts and when auth state changes
  useEffect(() => {
    console.log("Auth state changed or component mounted, loading configurations. User:", user?.id || "anonymous");
    if (isAuthenticated && user) {
      loadSavedConfigurations();
    } else {
      // Clear saved configs when not authenticated
      setSavedConfigs([]);
    }
  }, [isAuthenticated, user]);

  const loadSavedConfigurations = async () => {
    setIsLoading(true);
    try {
      // Get the current user ID or use 'anonymous' for non-authenticated sessions
      const userId = user?.id;
      
      console.log(`Loading configurations for user: ${userId || 'anonymous'}`);
      
      if (!userId || !isAuthenticated) {
        toast.error("Please login to save and load settings");
        setIsLoading(false);
        return;
      }
      
      const configs = await getConfigurationsFromStorage(userId);
      
      if (configs && configs.length > 0) {
        console.log(`Found ${configs.length} saved configurations for ${userId}`);
        setSavedConfigs(configs);
      } else {
        console.log(`No saved configurations found for ${userId}`);
        setSavedConfigs([]);
      }
    } catch (error) {
      console.error("Error loading configurations:", error);
      toast.error("Failed to load configurations");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!configName.trim()) {
      toast.error("Please enter a name for your configuration");
      return;
    }

    if (!isAuthenticated) {
      toast.error("Please login to save settings");
      return;
    }

    setIsLoading(true);
    
    try {
      // Deep clone all current settings to ensure no references are stored
      const settingsCopy = JSON.parse(JSON.stringify(currentSettings));
      const stepsCopy = JSON.parse(JSON.stringify(currentSteps));
      
      // Explicitly log hashPerTray value we're saving
      console.log("Current hashPerTray before save:", currentSettings.hashPerTray);
      
      // Ensure hashPerTray is properly set in the settings copy
      if (currentSettings.hashPerTray !== undefined) {
        console.log("Setting explicit hashPerTray value for save:", currentSettings.hashPerTray);
        settingsCopy.hashPerTray = Number(currentSettings.hashPerTray);
      } else {
        console.log("Setting default hashPerTray value in save");
        settingsCopy.hashPerTray = 0.15; // Default value
      }
      
      // Force numeric conversion to ensure we have a proper number
      settingsCopy.hashPerTray = Number(settingsCopy.hashPerTray);
      
      // Ensure waterPercentage is explicitly saved
      if (currentSettings.waterPercentage !== undefined) {
        settingsCopy.waterPercentage = Number(currentSettings.waterPercentage);
      } else {
        settingsCopy.waterPercentage = 75; // Default value
      }
      
      // Log what we're saving for debugging
      console.log("Saving settings with hashPerTray:", settingsCopy.hashPerTray);
      console.log("Full settings being saved:", settingsCopy);
      
      // Create a new configuration
      const newConfig: SavedSettingsRecord = {
        id: crypto.randomUUID(),
        name: configName,
        settings: settingsCopy,
        steps: stepsCopy,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Get the current user ID
      const userId = user?.id;
      
      if (!userId) {
        throw new Error("User ID not found");
      }
      
      console.log(`Saving configuration "${configName}" for user ${userId}`, newConfig);
      
      // Add to the list
      const updatedConfigs = [...savedConfigs, newConfig];
      setSavedConfigs(updatedConfigs);
      
      // Save to Supabase
      await saveConfigurationToStorage(userId, updatedConfigs);
      
      // Debug log to confirm what was saved
      console.log(`Updated configurations for ${userId}:`, updatedConfigs);

      // Reset and close dialog
      setConfigName("");
      setSaveDialogOpen(false);
      toast.success("Configuration saved successfully");
    } catch (error) {
      console.error("Error saving configuration:", error);
      toast.error("Failed to save configuration");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadConfig = (config: SavedSettingsRecord) => {
    try {
      console.log(`Loading configuration: ${config.name}`, config);
      
      if (!config.settings) {
        console.error("Configuration has no settings:", config);
        toast.error("Invalid configuration");
        return;
      }
      
      // Deep clone the settings and steps to avoid reference issues
      const settingsCopy = JSON.parse(JSON.stringify(config.settings || {}));
      const stepsCopy = JSON.parse(JSON.stringify(config.steps || []));
      
      // Ensure hashPerTray is present and properly converted to a number
      if (config.settings.hashPerTray !== undefined) {
        console.log("Loading saved hashPerTray value:", config.settings.hashPerTray);
        settingsCopy.hashPerTray = Number(config.settings.hashPerTray);
      } else {
        console.warn("hashPerTray is missing in saved configuration, using default");
        settingsCopy.hashPerTray = 0.15; // Default value
      }
      
      // Force numeric conversion to ensure we have a proper number
      settingsCopy.hashPerTray = Number(settingsCopy.hashPerTray);
      console.log("Final hashPerTray value after load processing:", settingsCopy.hashPerTray);
      
      // Ensure waterPercentage is present
      if (config.settings.waterPercentage === undefined) {
        settingsCopy.waterPercentage = 75; // Default value
      }
      
      // Log full settings being loaded
      console.log("Full settings being loaded:", settingsCopy);
      
      onLoadSettings(settingsCopy, stepsCopy);
      toast.success(`Loaded settings: ${config.name}`);
    } catch (error) {
      console.error("Error loading configuration:", error);
      toast.error("Failed to load configuration");
    }
  };

  const handleDeleteConfig = async (id: string) => {
    if (!isAuthenticated) {
      toast.error("Please login to delete settings");
      return;
    }

    setIsLoading(true);
    
    try {
      // Get the current user ID
      const userId = user?.id;
      
      if (!userId) {
        throw new Error("User ID not found");
      }
      
      console.log(`Deleting configuration for user ${userId} with id ${id}`);
      
      const updatedConfigs = savedConfigs.filter(config => config.id !== id);
      setSavedConfigs(updatedConfigs);
      
      // Save the updated configs to Supabase
      await saveConfigurationToStorage(userId, updatedConfigs);
      
      toast.success("Configuration deleted");
    } catch (error) {
      console.error("Error deleting configuration:", error);
      toast.error("Failed to delete configuration");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-1"
              disabled={!isAuthenticated}
            >
              <Save className="h-4 w-4" />
              Save Current Settings
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Configuration</DialogTitle>
              <DialogDescription>
                Save your current freeze dryer settings to access them later.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="configName">Configuration Name</Label>
              <Input
                id="configName"
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                placeholder="My Freeze Dryer Config"
                className="mt-2"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveConfig} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={savedConfigs.length === 0 || !isAuthenticated}>
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Load Settings
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {savedConfigs.map((config) => (
              <div key={config.id} className="flex items-center justify-between px-2 py-1.5 hover:bg-muted">
                <button
                  onClick={() => handleLoadConfig(config)}
                  className="text-left flex-1 px-2"
                >
                  {config.name}
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteConfig(config.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {!isAuthenticated && (
        <p className="text-sm text-muted-foreground">
          Please <Link to="/login" className="text-primary hover:underline">login</Link> to save and load settings
        </p>
      )}
      
      {isAuthenticated && savedConfigs.length === 0 && (
        <p className="text-sm text-muted-foreground">No saved configurations</p>
      )}
    </div>
  );
}
