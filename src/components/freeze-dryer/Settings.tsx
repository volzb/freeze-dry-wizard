
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/lib/supabase";

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
      const stepsToSave = currentSteps.map(step => ({
        ...JSON.parse(JSON.stringify(step))
      }));
      
      const settingsToSave = { ...JSON.parse(JSON.stringify(currentSettings)) };
      
      // Ensure we're saving all required data
      console.log("Saving settings:", settingsToSave);
      console.log("Saving steps:", stepsToSave);
      
      if (!stepsToSave || stepsToSave.length === 0) {
        toast.error("No drying steps to save");
        setIsLoading(false);
        return;
      }
      
      const existingConfigs = await getConfigurationsFromStorage(user.id) || [];
      let updatedConfigs: SavedSettingsRecord[];
      
      if (selectedConfig) {
        updatedConfigs = existingConfigs.map(config => 
          config.id === selectedConfig.id 
            ? {
                ...config,
                name: configName,
                settings: settingsToSave,
                steps: stepsToSave,
                updatedAt: new Date().toISOString()
              }
            : config
        );
        toast.success("Configuration updated successfully");
      } else {
        const newConfig: SavedSettingsRecord = {
          id: crypto.randomUUID(),
          name: configName,
          settings: settingsToSave,
          steps: stepsToSave,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        updatedConfigs = [...existingConfigs, newConfig];
        toast.success("Configuration saved successfully");
      }

      if (isAuthenticated && user) {
        await saveConfigurationToStorage(user.id, updatedConfigs);
        
        // Double check that the data was saved correctly
        const savedData = await getConfigurationsFromStorage(user.id);
        const savedConfig = selectedConfig 
          ? savedData?.find(c => c.id === selectedConfig.id)
          : savedData?.[savedData.length - 1];
          
        console.log("Saved configuration verified:", savedConfig);
        
        if (!savedConfig?.steps || savedConfig.steps.length === 0) {
          console.warn("Steps may not have saved correctly");
        }
      }
      
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
      
      // If the deleted config was selected, clear selection
      if (selectedConfig?.id === id) {
        setSelectedConfig(null);
        setConfigName("");
      }
    } catch (error) {
      console.error("Error deleting configuration:", error);
      toast.error("Failed to delete configuration");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadConfig = (config: SavedSettingsRecord) => {
    try {
      console.log("Loading configuration:", config);
      
      // Validate we have all needed data
      if (!config.settings) {
        throw new Error("Configuration settings are missing");
      }
      
      if (!config.steps || !Array.isArray(config.steps) || config.steps.length === 0) {
        throw new Error("Configuration steps are missing or invalid");
      }
      
      // Set the config name in the input field for easier updating
      setConfigName(config.name);
      setSelectedConfig(config);
      
      // Load the configuration
      onLoadSettings(config.settings, config.steps);
      toast.success(`Loaded configuration: ${config.name}`);
      
      // Close the dialog after loading
      setDialogOpen(false);
    } catch (error) {
      console.error("Error loading configuration:", error);
      toast.error(`Failed to load configuration: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handleSelectConfig = (config: SavedSettingsRecord) => {
    setSelectedConfig(config);
    setConfigName(config.name);
  };

  // For debugging purposes, add direct DB query capability
  const handleVerifyDbData = async () => {
    if (!isAuthenticated || !user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('freeze_dryer_configs')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
        
      if (error) throw error;
      
      console.log("Data directly from DB:", data);
      if (data && data.length > 0) {
        console.log("First config steps:", data[0].steps);
        console.log("First config settings:", data[0].settings);
      }
    } catch (err) {
      console.error("Error querying DB directly:", err);
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

            <div className="max-h-[300px] overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : savedConfigs.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">No saved configurations</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Steps</TableHead>
                      <TableHead className="w-[100px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {savedConfigs.map((config) => (
                      <TableRow 
                        key={config.id} 
                        className={selectedConfig?.id === config.id ? "bg-accent" : ""}
                        onClick={() => handleSelectConfig(config)}
                      >
                        <TableCell className="font-medium cursor-pointer">
                          {config.name}
                        </TableCell>
                        <TableCell>
                          {config.steps && Array.isArray(config.steps) ? 
                            `${config.steps.length} steps` : 
                            'No steps'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteConfig(config.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLoadConfig(config);
                              }}
                            >
                              Load
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
            
            {isAuthenticated && process.env.NODE_ENV === 'development' && (
              <div className="pt-2 text-xs text-muted-foreground">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleVerifyDbData} 
                  className="text-xs"
                >
                  Debug: Verify DB Data
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
