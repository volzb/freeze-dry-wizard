
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Settings as SettingsIcon, Trash2, Loader2 } from "lucide-react";
import { FreezeDryerSettings, DryingStep } from "@/utils/freezeDryerCalculations";
import { SavedSettingsRecord } from "./SavedSettings";

interface SettingsProps {
  currentSettings: Partial<FreezeDryerSettings>;
  currentSteps: DryingStep[];
  onLoadSettings: (settings: Partial<FreezeDryerSettings>, steps: DryingStep[]) => void;
}

export function Settings({
  currentSettings,
  currentSteps,
  onLoadSettings,
}: SettingsProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [savedConfigs, setSavedConfigs] = useState<SavedSettingsRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [configName, setConfigName] = useState("");
  const [selectedConfig, setSelectedConfig] = useState<SavedSettingsRecord | null>(null);
  const { isAuthenticated, user, saveConfigurationToStorage, getConfigurationsFromStorage } = useAuth();

  useEffect(() => {
    if (dialogOpen && isAuthenticated && user) {
      loadSavedConfigurations();
    }
  }, [dialogOpen, isAuthenticated, user]);

  const loadSavedConfigurations = async () => {
    if (!isAuthenticated || !user?.id) return;

    setIsLoading(true);
    try {
      const configs = await getConfigurationsFromStorage(user.id);
      setSavedConfigs(configs || []);
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
      
      const existingConfigs = await getConfigurationsFromStorage(user.id) || [];
      let updatedConfigs: SavedSettingsRecord[];
      
      if (selectedConfig) {
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
    } catch (error) {
      console.error("Error saving configuration:", error);
      toast.error("Failed to save configuration");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConfig = async (id: string) => {
    if (!isAuthenticated || !user?.id) return;

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
      onLoadSettings(config.settings, config.steps);
      toast.success(`Loaded configuration: ${config.name}`);
    } catch (error) {
      console.error("Error loading configuration:", error);
      toast.error("Failed to load configuration");
    }
  };

  return (
    <div>
      <Button 
        variant="outline" 
        size="sm" 
        className="flex items-center gap-2"
        onClick={() => setDialogOpen(true)}
      >
        <SettingsIcon className="h-4 w-4" />
        <span>Settings</span>
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Save and manage your freeze dryer configurations
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Input
                placeholder="Configuration name"
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
              />
              <Button 
                className="w-full" 
                onClick={handleSaveConfig}
                disabled={isLoading || !configName.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {selectedConfig ? "Updating..." : "Saving..."}
                  </>
                ) : (
                  selectedConfig ? "Update Configuration" : "Save Configuration"
                )}
              </Button>
            </div>

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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
