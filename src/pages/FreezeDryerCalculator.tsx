
import { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DryingStep, FreezeDryerSettings, calculateProgressCurve } from "@/utils/freezeDryerCalculations";
import { DryingStepForm } from "@/components/freeze-dryer/DryingStepForm";
import { TerpeneChart } from "@/components/freeze-dryer/TerpeneChart";
import { CalculationSettings } from "@/components/freeze-dryer/CalculationSettings";
import { TerpeneSelector } from "@/components/freeze-dryer/TerpeneSelector";
import { ResultSummary } from "@/components/freeze-dryer/ResultSummary";
import { ConfigManager } from "@/components/freeze-dryer/ConfigManager";
import { terpenes } from "@/utils/terpeneData";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SavedSettingsRecord } from "@/components/freeze-dryer/SavedSettings";

export default function FreezeDryerCalculator() {
  // State for settings and steps
  const [settings, setSettings] = useState<Partial<FreezeDryerSettings>>({});
  const [steps, setSteps] = useState<DryingStep[]>([]);
  
  // Display unit state (Celsius or Fahrenheit)
  const [displayUnit, setDisplayUnit] = useState<'C' | 'F'>('C');
  
  // Selected terpenes for visualization
  const [selectedTerpenes, setSelectedTerpenes] = useState<string[]>(
    terpenes.filter(t => t.group === "major").map(t => t.name)
  );

  // Load saved settings from localStorage on initial render
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('freezeDryerSettings');
      const savedSteps = localStorage.getItem('freezeDryerSteps');
      const savedDisplayUnit = localStorage.getItem('freezeDryerDisplayUnit');
      const savedTerpenes = localStorage.getItem('freezeDryerTerpenes');
      
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
      
      if (savedSteps) {
        setSteps(JSON.parse(savedSteps));
      }
      
      if (savedDisplayUnit && (savedDisplayUnit === 'C' || savedDisplayUnit === 'F')) {
        setDisplayUnit(savedDisplayUnit as 'C' | 'F');
      }
      
      if (savedTerpenes) {
        setSelectedTerpenes(JSON.parse(savedTerpenes));
      }
    } catch (error) {
      console.error("Error loading saved settings:", error);
    }
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('freezeDryerSettings', JSON.stringify(settings));
      localStorage.setItem('freezeDryerSteps', JSON.stringify(steps));
      localStorage.setItem('freezeDryerDisplayUnit', displayUnit);
      localStorage.setItem('freezeDryerTerpenes', JSON.stringify(selectedTerpenes));
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  }, [settings, steps, displayUnit, selectedTerpenes]);
  
  // Calculate progress curve for visualization
  const progressCurve = useMemo(() => {
    if (settings && steps.length > 0) {
      return calculateProgressCurve(settings, steps);
    }
    return [];
  }, [settings, steps]);

  // Handle loading saved settings - Supports both component interfaces
  const handleLoadSettings = (
    configOrSettings: SavedSettingsRecord | Partial<FreezeDryerSettings>, 
    stepsArg?: DryingStep[]
  ) => {
    if (stepsArg !== undefined) {
      // Handle two-argument pattern (settings, steps)
      setSettings(configOrSettings as Partial<FreezeDryerSettings>);
      setSteps(stepsArg);
    } else {
      // Handle single-argument pattern (SavedSettingsRecord)
      const config = configOrSettings as SavedSettingsRecord;
      setSettings(config.settings);
      setSteps(config.steps);
    }
  };

  console.log("Rendering FreezeDryerCalculator with:", {
    settingsKeys: Object.keys(settings),
    stepsCount: steps.length,
    progressCurveLength: progressCurve.length
  });

  return (
    <TooltipProvider>
      <div className="container max-w-screen-xl mx-auto p-4">
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h1 className="text-3xl font-bold tracking-tight">Freeze Dryer Calculator</h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="temperature-unit" 
                  checked={displayUnit === 'F'}
                  onCheckedChange={(checked) => setDisplayUnit(checked ? 'F' : 'C')} 
                />
                <Label htmlFor="temperature-unit">°F</Label>
              </div>
              
              <ConfigManager
                currentSettings={settings}
                currentSteps={steps}
                onLoadSettings={handleLoadSettings}
              />
            </div>
          </div>

          <Tabs defaultValue="settings" className="space-y-4">
            <TabsList>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="visualization">Visualization</TabsTrigger>
            </TabsList>
            
            <TabsContent value="settings" className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <CalculationSettings 
                  settings={settings} 
                  onSettingsChange={setSettings} 
                />
                
                <DryingStepForm 
                  steps={steps} 
                  onChange={setSteps} 
                />
                
                {progressCurve.length > 0 && (
                  <ResultSummary 
                    progressCurve={progressCurve}
                    displayUnit={displayUnit}
                    waterWeight={settings.iceWeight}
                    waterPercentage={settings.waterPercentage}
                  />
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="visualization" className="space-y-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Select Terpenes</CardTitle>
                </CardHeader>
                <CardContent>
                  <TerpeneSelector 
                    selectedTerpenes={selectedTerpenes}
                    onChange={setSelectedTerpenes}
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Drying Progress Chart</CardTitle>
                </CardHeader>
                <CardContent>
                  {progressCurve.length > 0 ? (
                    <TerpeneChart 
                      dryingData={progressCurve}
                      steps={steps}
                      displayUnit={displayUnit}
                      showTerpenes={selectedTerpenes}
                    />
                  ) : (
                    <div className="text-center p-8 text-muted-foreground">
                      Add drying steps and configure settings to see the visualization
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </TooltipProvider>
  );
}
