import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Save, Trash2, Loader2 } from "lucide-react";
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
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [configName, setConfigName] = useState("");
  const [selectedConfig, setSelectedConfig] = useState<SavedSettingsRecord | null>(null);
  const { isAuthenticated, user, saveConfigurationToStorage, getConfigurationsFromStorage } = useAuth();

  useEffect(() => {
    const settingsInput = document.getElementById('current-settings') as HTMLInputElement;
    const stepsInput = document.getElementById('current-steps') as HTMLInputElement;
    
    if (settingsInput && stepsInput) {
      settingsInput.value = JSON.stringify(currentSettings);
      stepsInput.value = JSON.stringify(currentSteps);
    }
  }, [currentSettings, currentSteps]);

  useEffect(() => {
    console.log("Auth state changed or component mounted, loading configurations. User:", user?.id || "anonymous");
    if (isAuthenticated && user) {
      loadSavedConfigurations();
    } else {
      setSavedConfigs([]);
    }
  }, [isAuthenticated, user]);

  const loadSavedConfigurations = async () => {
    if (!isAuthenticated || !user?.id) {
      console.log("User not authenticated, skipping configuration load");
      return;
    }

    setIsLoading(true);
    try {
      console.log(`Loading configurations for user: ${user.id}`);
      const configs = await getConfigurationsFromStorage(user.id);
      
      if (configs && configs.length > 0) {
        console.log(`Found ${configs.length} saved configurations for ${user.id}`);
        setSavedConfigs(configs);
      } else {
        console.log(`No saved configurations found for ${user.id}`);
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

    if (!isAuthenticated || !user?.id) {
      toast.error("Please login to save settings");
      return;
    }

    setIsLoading(true);
    
    try {
      const settingsCopy = JSON.parse(JSON.stringify(currentSettings));
      const stepsCopy = JSON.parse(JSON.stringify(currentSteps));
      
      if (currentSettings.hashPerTray !== undefined) {
        settingsCopy.hashPerTray = Number(currentSettings.hashPerTray);
      } else {
        settingsCopy.hashPerTray = 0.15;
      }
      
      settingsCopy.hashPerTray = Number(settingsCopy.hashPerTray);
      
      if (currentSettings.waterPercentage !== undefined) {
        settingsCopy.waterPercentage = Number(currentSettings.waterPercentage);
      } else {
        settingsCopy.waterPercentage = 75;
      }
      
      let updatedConfigs: SavedSettingsRecord[];
      
      if (selectedConfig) {
        updatedConfigs = savedConfigs.map(config => 
          config.id === selectedConfig.id 
            ? {
                ...config,
                name: configName,
                settings: settingsCopy,
                steps: stepsCopy,
                updatedAt: new Date().toISOString()
              }
            : config
        );
        toast.success("Configuration updated successfully");
      } else {
        const newConfig: SavedSettingsRecord = {
          id: crypto.randomUUID(),
          name: configName,
          settings: settingsCopy,
          steps: stepsCopy,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        updatedConfigs = [...savedConfigs, newConfig];
        toast.success("Configuration saved successfully");
      }

      setSavedConfigs(updatedConfigs);
      await saveConfigurationToStorage(user.id, updatedConfigs);
      
      setConfigName("");
      setSelectedConfig(null);
      setSaveDialogOpen(false);
    } catch (error) {
      console.error("Error saving configuration:", error);
      toast.error("Failed to save configuration");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConfig = async (id: string) => {
    if (!isAuthenticated || !user?.id) {
      toast.error("Please login to delete settings");
      return;
    }

    setIsLoading(true);
    
    try {
      const updatedConfigs = savedConfigs.filter(config => config.id !== id);
      setSavedConfigs(updatedConfigs);
      await saveConfigurationToStorage(user.id, updatedConfigs);
      toast.success("Configuration deleted successfully");
    } catch (error) {
      console.error("Error deleting configuration:", error);
      toast.error("Failed to delete configuration");
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
      
      const settingsCopy = JSON.parse(JSON.stringify(config.settings || {}));
      const stepsCopy = JSON.parse(JSON.stringify(config.steps || []));
      
      if (config.settings.hashPerTray !== undefined) {
        console.log("Loading saved hashPerTray value:", config.settings.hashPerTray);
        settingsCopy.hashPerTray = Number(config.settings.hashPerTray);
      } else {
        console.warn("hashPerTray is missing in saved configuration, using default");
        settingsCopy.hashPerTray = 0.15;
      }
      
      settingsCopy.hashPerTray = Number(settingsCopy.hashPerTray);
      console.log("Final hashPerTray value after load processing:", settingsCopy.hashPerTray);
      
      if (config.settings.waterPercentage === undefined) {
        settingsCopy.waterPercentage = 75;
      }
      
      console.log("Full settings being loaded:", settingsCopy);
      
      onLoadSettings(settingsCopy, stepsCopy);
      setLoadDialogOpen(false);
      toast.success(`Loaded settings: ${config.name}`);
    } catch (error) {
      console.error("Error loading configuration:", error);
      toast.error("Failed to load configuration");
    }
  };

  return (
    <div className="space-y-4">
      <input 
        type="hidden" 
        id="current-settings" 
        value={JSON.stringify(currentSettings)} 
      />
      <input 
        type="hidden" 
        id="current-steps" 
        value={JSON.stringify(currentSteps)} 
      />
      
      <button 
        id="load-config-trigger" 
        className="hidden"
        onClick={(e) => {
          const target = e.currentTarget;
          try {
            const settingsJson = target.getAttribute('data-settings');
            const stepsJson = target.getAttribute('data-steps');
            
            if (settingsJson && stepsJson) {
              const settings = JSON.parse(settingsJson);
              const steps = JSON.parse(stepsJson);
              onLoadSettings(settings, steps);
            }
          } catch (error) {
            console.error("Error loading configuration:", error);
          }
        }}
      />

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogTrigger asChild>
          <Button id="save-settings-trigger" variant="outline" size="sm" className="hidden">
            Save Current Settings
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedConfig ? "Update Configuration" : "Save Configuration"}</DialogTitle>
            <DialogDescription>
              {selectedConfig 
                ? "Update your existing freeze dryer settings configuration."
                : "Save your current freeze dryer settings to access them later."}
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
            <Button 
              variant="outline" 
              onClick={() => {
                setSaveDialogOpen(false);
                setSelectedConfig(null);
                setConfigName("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveConfig} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                  {selectedConfig ? "Updating..." : "Saving..."}
                </>
              ) : (
                selectedConfig ? "Update" : "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
        <DialogTrigger asChild>
          <Button id="load-settings-trigger" variant="outline" size="sm" className="hidden">
            Load Settings
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Load Configuration</DialogTitle>
            <DialogDescription>
              Select a configuration to load
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            {savedConfigs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No saved configurations</p>
            ) : (
              savedConfigs.map((config) => (
                <div key={config.id} className="flex items-center justify-between p-2 rounded-md hover:bg-accent">
                  <span className="flex-1">{config.name}</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedConfig(config);
                        setConfigName(config.name);
                        setLoadDialogOpen(false);
                        setSaveDialogOpen(true);
                      }}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteConfig(config.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleLoadConfig(config)}
                    >
                      Load
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
