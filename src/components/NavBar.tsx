import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, User, Save, Download, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { SavedSettingsRecord } from "@/components/freeze-dryer/SavedSettings";

export function NavBar() {
  const { isAuthenticated, user, logout, saveConfigurationToStorage, getConfigurationsFromStorage } = useAuth();
  const navigate = useNavigate();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [configName, setConfigName] = useState("");
  const [savedConfigs, setSavedConfigs] = useState<SavedSettingsRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<SavedSettingsRecord | null>(null);
  
  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const openSaveDialog = () => {
    if (!isAuthenticated) {
      toast.error("Please login to save settings");
      return;
    }
    
    setSaveDialogOpen(true);
    setConfigName("");
    setSelectedConfig(null);
  };

  const openLoadDialog = async () => {
    if (!isAuthenticated) {
      toast.error("Please login to load settings");
      return;
    }
    
    setIsLoading(true);
    try {
      const configs = await getConfigurationsFromStorage(user!.id);
      setSavedConfigs(configs || []);
      setLoadDialogOpen(true);
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

    const currentSettingsElem = document.getElementById('current-settings') as HTMLInputElement;
    const currentStepsElem = document.getElementById('current-steps') as HTMLInputElement;
    
    if (!currentSettingsElem || !currentStepsElem) {
      toast.error("Settings data not found");
      return;
    }
    
    const currentSettings = JSON.parse(currentSettingsElem.value || '{}');
    const currentSteps = JSON.parse(currentStepsElem.value || '[]');
    
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
      setSaveDialogOpen(false);
    } catch (error) {
      console.error("Error saving configuration:", error);
      toast.error("Failed to save configuration");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadConfig = (config: SavedSettingsRecord) => {
    if (!config.settings) {
      toast.error("Invalid configuration");
      return;
    }
    
    try {
      const loadTriggerElem = document.getElementById('load-config-trigger') as HTMLButtonElement;
      
      if (!loadTriggerElem) {
        toast.error("Cannot load configuration");
        return;
      }
      
      loadTriggerElem.setAttribute('data-settings', JSON.stringify(config.settings));
      loadTriggerElem.setAttribute('data-steps', JSON.stringify(config.steps));
      
      loadTriggerElem.click();
      
      setLoadDialogOpen(false);
      toast.success(`Loaded settings: ${config.name}`);
    } catch (error) {
      console.error("Error loading configuration:", error);
      toast.error("Failed to load configuration");
    }
  };
  
  const handleDeleteConfig = async (id: string) => {
    if (!isAuthenticated || !user?.id) {
      toast.error("Please login to delete settings");
      return;
    }

    setIsLoading(true);
    
    try {
      const existingConfigs = await getConfigurationsFromStorage(user.id) || [];
      const updatedConfigs = existingConfigs.filter(config => config.id !== id);
      
      await saveConfigurationToStorage(user.id, updatedConfigs);
      setSavedConfigs(updatedConfigs);
      toast.success("Configuration deleted successfully");
    } catch (error) {
      console.error("Error deleting configuration:", error);
      toast.error("Failed to delete configuration");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <header className="border-b">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6 text-lg font-semibold">
          <Link to="/" className="hover:text-primary">Freeze Dryer Calculator</Link>
        </div>
        <nav className="flex items-center gap-4">
          <Link to="/" className="text-sm font-medium hover:text-primary">
            Home
          </Link>
          
          {isAuthenticated && (
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-2"
                onClick={openSaveDialog}
              >
                <Save className="h-4 w-4" />
                <span>Save</span>
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-2"
                onClick={openLoadDialog}
              >
                <Download className="h-4 w-4" />
                <span>Load</span>
              </Button>
            </div>
          )}
          
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">{user?.name || user?.email}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout}
                className="flex items-center gap-2"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </Button>
            </div>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate("/login")}
              className="flex items-center gap-2"
            >
              <User size={16} />
              <span>Login</span>
            </Button>
          )}
        </nav>
      </div>
      
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
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
                  <span className="loading loading-spinner loading-sm mr-2"></span>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Load Configuration</DialogTitle>
            <DialogDescription>
              Select a configuration to load
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2 max-h-[300px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <span className="loading loading-spinner loading-md"></span>
              </div>
            ) : savedConfigs.length === 0 ? (
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
                      title="Save as new or update"
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
        </DialogContent>
      </Dialog>
    </header>
  );
}
