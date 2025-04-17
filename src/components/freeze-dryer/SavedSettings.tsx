
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
  const { isAuthenticated, user } = useAuth();

  // Load saved configurations from localStorage
  useEffect(() => {
    if (isAuthenticated && user) {
      const savedConfigsStr = localStorage.getItem(`freezedryer-configs-${user.id}`);
      if (savedConfigsStr) {
        try {
          const configs = JSON.parse(savedConfigsStr);
          setSavedConfigs(configs);
        } catch (error) {
          console.error("Error loading saved configurations:", error);
        }
      }
    }
  }, [isAuthenticated, user]);

  const handleSaveConfig = () => {
    if (!configName.trim()) {
      toast.error("Please enter a name for your configuration");
      return;
    }

    setIsLoading(true);
    // Create a new configuration
    const newConfig: SavedSettingsRecord = {
      id: crypto.randomUUID(),
      name: configName,
      settings: { ...currentSettings },
      steps: [...currentSteps],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add to the list
    const updatedConfigs = [...savedConfigs, newConfig];
    setSavedConfigs(updatedConfigs);

    // Save to localStorage
    if (user) {
      localStorage.setItem(`freezedryer-configs-${user.id}`, JSON.stringify(updatedConfigs));
    }

    // Reset and close dialog
    setConfigName("");
    setSaveDialogOpen(false);
    setIsLoading(false);
    toast.success("Configuration saved successfully");
  };

  const handleLoadConfig = (config: SavedSettingsRecord) => {
    onLoadSettings(config.settings, config.steps);
    toast.success(`Loaded settings: ${config.name}`);
  };

  const handleDeleteConfig = (id: string) => {
    const updatedConfigs = savedConfigs.filter(config => config.id !== id);
    setSavedConfigs(updatedConfigs);
    
    // Save to localStorage
    if (user) {
      localStorage.setItem(`freezedryer-configs-${user.id}`, JSON.stringify(updatedConfigs));
    }
    
    toast.success("Configuration deleted");
  };

  if (!isAuthenticated) {
    return (
      <Card>
        <CardContent className="p-4 text-center">
          <p className="text-muted-foreground">Please log in to save your settings</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <Save className="h-4 w-4" />
              Save Current Settings
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Configuration</DialogTitle>
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
          <DropdownMenuTrigger asChild disabled={savedConfigs.length === 0}>
            <Button variant="outline" size="sm" className="flex items-center gap-1">
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
      
      {savedConfigs.length === 0 && (
        <p className="text-sm text-muted-foreground">No saved configurations</p>
      )}
    </div>
  );
}
