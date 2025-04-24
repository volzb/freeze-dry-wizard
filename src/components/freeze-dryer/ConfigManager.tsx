
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Save, Trash2, Loader2, Settings } from "lucide-react";
import { FreezeDryerSettings, DryingStep } from "@/utils/freezeDryerCalculations";
import { SavedSettingsRecord } from "./SavedSettings";

interface ConfigManagerProps {
  currentSettings: Partial<FreezeDryerSettings>;
  currentSteps: DryingStep[];
  onLoadSettings: (settings: Partial<FreezeDryerSettings>, steps: DryingStep[]) => void;
}

export function ConfigManager({
  currentSettings,
  currentSteps,
  onLoadSettings,
}: ConfigManagerProps) {
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("load");
  const [savedConfigs, setSavedConfigs] = useState<SavedSettingsRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [configName, setConfigName] = useState("");
  const [selectedConfig, setSelectedConfig] = useState<SavedSettingsRecord | null>(null);
  const { isAuthenticated, user, saveConfigurationToStorage, getConfigurationsFromStorage } = useAuth();

  // Load saved configurations when auth state changes
  useEffect(() => {
    if (isAuthenticated && user) {
      loadSavedConfigurations();
    } else {
      setSavedConfigs([]);
    }
  }, [isAuthenticated, user]);

  // Update hidden input fields when settings or steps change
  useEffect(() => {
    const settingsInput = document.getElementById('current-settings') as HTMLInputElement;
    const stepsInput = document.getElementById('current-steps') as HTMLInputElement;
    
    if (settingsInput && stepsInput) {
      settingsInput.value = JSON.stringify(currentSettings || {});
      stepsInput.value = JSON.stringify(currentSteps || []);
    }
  }, [currentSettings, currentSteps]);

  const loadSavedConfigurations = async () => {
    if (!isAuthenticated || !user?.id) {
      return;
    }

    setIsLoading(true);
    try {
      console.log(`Loading configurations for user: ${user.id}`);
      const configs = await getConfigurationsFromStorage(user.id);
      
      if (configs && configs.length > 0) {
        setSavedConfigs(configs);
      } else {
        setSavedConfigs([]);
      }
    } catch (error) {
      console.error("Error loading configurations:", error);
      toast.error("Failed to load configurations");
    } finally {
      setIsLoading(false);
    }
  };

  const openConfigDialog = async (initialTab: string = "save") => {
    if (!isAuthenticated) {
      toast.error("Please login to manage settings");
      return;
    }
    
    setConfigName("");
    setSelectedConfig(null);
    setActiveTab(initialTab);
    
    if (initialTab === "load") {
      await loadSavedConfigurations();
    }
    
    setConfigDialogOpen(true);
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

    const settingsInput = document.getElementById('current-settings') as HTMLInputElement;
    const stepsInput = document.getElementById('current-steps') as HTMLInputElement;
    
    if (!settingsInput?.value || !stepsInput?.value) {
      toast.error("Settings data not found");
      return;
    }
    
    const currentSettings = JSON.parse(settingsInput.value);
    const currentSteps = JSON.parse(stepsInput.value);
    
    setIsLoading(true);
    
    try {
      const settingsCopy = JSON.parse(JSON.stringify(currentSettings));
      const stepsCopy = JSON.parse(JSON.stringify(currentSteps));
      
      // Ensure numeric values are properly typed
      if (settingsCopy.hashPerTray !== undefined) {
        settingsCopy.hashPerTray = Number(settingsCopy.hashPerTray);
      } else {
        settingsCopy.hashPerTray = 0.15;
      }
      
      if (settingsCopy.waterPercentage !== undefined) {
        settingsCopy.waterPercentage = Number(settingsCopy.waterPercentage);
      } else {
        settingsCopy.waterPercentage = 75;
      }
      
      const existingConfigs = await getConfigurationsFromStorage(user.id) || [];
      let updatedConfigs: SavedSettingsRecord[];
      
      if (selectedConfig) {
        // Update existing configuration
        updatedConfigs = existingConfigs.map(config => 
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
        // Create new configuration
        const newConfig: SavedSettingsRecord = {
          id: crypto.randomUUID(),
          name: configName,
          settings: settingsCopy,
          steps: stepsCopy,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        updatedConfigs = [...existingConfigs, newConfig];
        toast.success("Configuration saved successfully");
      }

      await saveConfigurationToStorage(user.id, updatedConfigs);
      setSavedConfigs(updatedConfigs);
      setConfigName("");
      setSelectedConfig(null);
      setActiveTab("load");
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
      
      const settingsCopy = JSON.parse(JSON.stringify(config.settings || {}));
      const stepsCopy = JSON.parse(JSON.stringify(config.steps || []));
      
      // Ensure numeric values are properly typed
      if (config.settings.hashPerTray !== undefined) {
        settingsCopy.hashPerTray = Number(config.settings.hashPerTray);
      } else {
        settingsCopy.hashPerTray = 0.15;
      }
      
      if (config.settings.waterPercentage === undefined) {
        settingsCopy.waterPercentage = 75;
      }
      
      onLoadSettings(settingsCopy, stepsCopy);
      setConfigDialogOpen(false);
      toast.success(`Loaded settings: ${config.name}`);
    } catch (error) {
      console.error("Error loading configuration:", error);
      toast.error("Cannot load configuration");
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

  const editConfig = (config: SavedSettingsRecord) => {
    setSelectedConfig(config);
    setConfigName(config.name);
    setActiveTab("save");
  };

  return (
    <div>
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
      
      {isAuthenticated ? (
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-2"
          onClick={() => openConfigDialog("load")}
        >
          <Settings className="h-4 w-4" />
          <span>Configurations</span>
        </Button>
      ) : (
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-2"
          onClick={() => toast.error("Please login to manage configurations")}
        >
          <Settings className="h-4 w-4" />
          <span>Configurations</span>
        </Button>
      )}

      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configurations</DialogTitle>
            <DialogDescription>
              Save, load, and manage your freeze dryer configurations
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="load">Load</TabsTrigger>
              <TabsTrigger value="save">Save</TabsTrigger>
            </TabsList>
            
            <TabsContent value="load" className="mt-4">
              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {isLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : savedConfigs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No saved configurations
                  </p>
                ) : (
                  savedConfigs.map((config) => (
                    <div key={config.id} className="flex items-center justify-between p-2 rounded-md hover:bg-accent border">
                      <span className="flex-1 font-medium truncate">{config.name}</span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => editConfig(config)}
                          title="Edit configuration"
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteConfig(config.id)}
                          title="Delete configuration"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
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
            </TabsContent>
            
            <TabsContent value="save" className="mt-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="configName">Configuration Name</Label>
                  <Input
                    id="configName"
                    value={configName}
                    onChange={(e) => setConfigName(e.target.value)}
                    placeholder="My Freeze Dryer Config"
                    className="mt-1"
                  />
                </div>
                
                <DialogFooter className="mt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSelectedConfig(null);
                      setConfigName("");
                      setActiveTab("load");
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
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
