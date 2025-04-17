
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  FreezeDryerSettings, 
  estimateHeatInputRate, 
  calculateWaterWeight 
} from "@/utils/freezeDryerCalculations";
import { Separator } from "@/components/ui/separator";
import { FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CalculationSettingsProps {
  settings: Partial<FreezeDryerSettings>;
  onSettingsChange: (settings: Partial<FreezeDryerSettings>) => void;
  displayUnit: 'C' | 'F';
  onDisplayUnitChange: (unit: 'C' | 'F') => void;
}

// Freeze dryer model configurations
const freezeDryerModels = {
  "cryodry-cd8": { traySizeCm2: 900, numberOfTrays: 9, label: "CryoDry CD8", width: 20, length: 45 },
  "custom": { traySizeCm2: 500, numberOfTrays: 3, label: "Custom", width: 22.36, length: 22.36 }
};

export function CalculationSettings({ 
  settings, 
  onSettingsChange,
  displayUnit,
  onDisplayUnitChange
}: CalculationSettingsProps) {
  
  const [selectedModel, setSelectedModel] = useState<string>("custom");
  const [trayLength, setTrayLength] = useState<number>(22.36);
  const [trayWidth, setTrayWidth] = useState<number>(22.36);
  const [hashPerTray, setHashPerTray] = useState<number>(settings.hashPerTray || 0.15); // Initialize from settings
  const [waterPercentage, setWaterPercentage] = useState<number>(settings.waterPercentage || 75); // Initialize from settings
  
  // Update local state when settings change (e.g., when loading saved config)
  useEffect(() => {
    if (settings.hashPerTray !== undefined && settings.hashPerTray !== hashPerTray) {
      console.log("Updating hashPerTray from settings:", settings.hashPerTray);
      setHashPerTray(settings.hashPerTray);
    }
    
    if (settings.waterPercentage !== undefined && settings.waterPercentage !== waterPercentage) {
      setWaterPercentage(settings.waterPercentage);
    }
  }, [settings.hashPerTray, settings.waterPercentage]);
  
  // Calculate area when length or width changes
  useEffect(() => {
    const area = trayLength * trayWidth;
    handleSettingChange("traySizeCm2", area);
  }, [trayLength, trayWidth]);
  
  // Calculate total ice weight when hash per tray, water percentage, or number of trays changes
  useEffect(() => {
    const totalHashWeight = hashPerTray * (settings.numberOfTrays || 1);
    const waterWeight = calculateWaterWeight(totalHashWeight, waterPercentage);
    
    // Log values to debug
    console.log("hashPerTray in effect:", hashPerTray);
    console.log("calculated water weight:", waterWeight);
    
    // Update settings with these values
    handleSettingChange("hashPerTray", hashPerTray);
    handleSettingChange("waterPercentage", waterPercentage);
    handleSettingChange("iceWeight", waterWeight);
  }, [hashPerTray, waterPercentage, settings.numberOfTrays]);
  
  const handleSettingChange = (field: keyof FreezeDryerSettings, value: any) => {
    // Log the change for debugging
    console.log(`Changing setting ${field} to:`, value);
    
    const updatedSettings = {
      ...settings,
      [field]: value
    };
    
    if (field === "numberOfTrays" || field === "traySizeCm2") {
      const tempC = settings.steps?.[0]?.temperature || 20;
      const pressureMbar = settings.steps?.[0]?.pressure || 300;
      const calculatedHeatRate = estimateHeatInputRate(
        tempC,
        pressureMbar,
        (updatedSettings.traySizeCm2 || 0) / 10000 * (updatedSettings.numberOfTrays || 1)
      );
      updatedSettings.heatInputRate = Math.round(calculatedHeatRate);
    }
    
    onSettingsChange(updatedSettings);
  };
  
  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    
    if (model !== "custom") {
      const modelConfig = freezeDryerModels[model as keyof typeof freezeDryerModels];
      setTrayLength(modelConfig.length);
      setTrayWidth(modelConfig.width);
      handleSettingChange("traySizeCm2", modelConfig.traySizeCm2);
      handleSettingChange("numberOfTrays", modelConfig.numberOfTrays);
    }
  };
  
  // Calculate total hash being processed
  const totalHashWeight = hashPerTray * (settings.numberOfTrays || 1);
  const totalArea = (settings.traySizeCm2 || 0) * (settings.numberOfTrays || 1);
  const hashDensity = totalHashWeight > 0 && totalArea > 0 ? (totalHashWeight * 1000) / totalArea : 0;
  
  // Calculate water weight
  const waterWeight = calculateWaterWeight(totalHashWeight, waterPercentage);
  
  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div>
          <h3 className="text-2xl font-semibold leading-none tracking-tight mb-4">Freeze Dryer Parameters</h3>
        </div>
        
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid grid-cols-2 mb-2">
            <TabsTrigger value="basic">Basic Settings</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="freezeDryerModel">Freeze Dryer Model</Label>
              <Select value={selectedModel} onValueChange={handleModelChange}>
                <SelectTrigger id="freezeDryerModel">
                  <SelectValue placeholder="Select Model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom</SelectItem>
                  <SelectItem value="cryodry-cd8">CryoDry CD8</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {selectedModel !== "custom" && (
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  {freezeDryerModels[selectedModel as keyof typeof freezeDryerModels].numberOfTrays} Trays
                </Badge>
                <Badge variant="outline">
                  {freezeDryerModels[selectedModel as keyof typeof freezeDryerModels].width} × {freezeDryerModels[selectedModel as keyof typeof freezeDryerModels].length} cm Trays
                </Badge>
                <Badge variant="outline">
                  {freezeDryerModels[selectedModel as keyof typeof freezeDryerModels].traySizeCm2} cm² Per Tray
                </Badge>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hashPerTray">Hash Per Tray</Label>
                <div className="flex items-center">
                  <Input
                    id="hashPerTray"
                    type="number"
                    value={hashPerTray || ""}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      console.log("Setting hashPerTray to:", value);
                      setHashPerTray(value);
                    }}
                    placeholder="0.15"
                    step="0.05"
                    min="0.01"
                  />
                  <span className="ml-2 text-sm text-muted-foreground w-10">kg</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="waterPercentage">Water Content</Label>
                <div className="flex items-center">
                  <Input
                    id="waterPercentage"
                    type="number"
                    value={waterPercentage || ""}
                    onChange={(e) => setWaterPercentage(parseFloat(e.target.value))}
                    placeholder="75"
                    min="1"
                    max="99"
                    step="1"
                  />
                  <span className="ml-2 text-sm text-muted-foreground w-10">%</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numberOfTrays">Number of Trays</Label>
                <div className="flex items-center">
                  <Input
                    id="numberOfTrays"
                    type="number"
                    value={settings.numberOfTrays || ""}
                    onChange={(e) => handleSettingChange("numberOfTrays", parseInt(e.target.value))}
                    placeholder="1"
                    min="1"
                    step="1"
                  />
                  <span className="ml-2 text-sm text-muted-foreground w-10">trays</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Total Water to Remove</Label>
                <div className="flex items-center">
                  <Input 
                    type="text"
                    value={waterWeight.toFixed(3)}
                    readOnly
                    className="bg-muted"
                  />
                  <span className="ml-2 text-sm text-muted-foreground w-10">kg</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Total Hash Weight</Label>
              <div className="flex items-center">
                <Input 
                  type="text"
                  value={totalHashWeight.toFixed(2)}
                  readOnly
                  className="bg-muted"
                />
                <span className="ml-2 text-sm text-muted-foreground w-10">kg</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="heatInputRate">Heat Input Rate</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="w-64">Auto-calculated based on tray size, number of trays, and initial temperature/pressure settings</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex items-center">
                <Input
                  id="heatInputRate"
                  type="number"
                  value={settings.heatInputRate || ""}
                  onChange={(e) => handleSettingChange("heatInputRate", parseFloat(e.target.value))}
                  placeholder="1000"
                  min="100"
                />
                <span className="ml-2 text-sm text-muted-foreground w-10">kJ/hr</span>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="advanced" className="space-y-4">
            {selectedModel === "custom" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="trayLength">Tray Length</Label>
                  <div className="flex items-center">
                    <Input
                      id="trayLength"
                      type="number"
                      value={trayLength || ""}
                      onChange={(e) => setTrayLength(parseFloat(e.target.value))}
                      placeholder="22.36"
                      step="0.1"
                      min="1"
                    />
                    <span className="ml-2 text-sm text-muted-foreground w-10">cm</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="trayWidth">Tray Width</Label>
                  <div className="flex items-center">
                    <Input
                      id="trayWidth"
                      type="number"
                      value={trayWidth || ""}
                      onChange={(e) => setTrayWidth(parseFloat(e.target.value))}
                      placeholder="22.36"
                      step="0.1"
                      min="1"
                    />
                    <span className="ml-2 text-sm text-muted-foreground w-10">cm</span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="traySizeCm2">Tray Area</Label>
                <div className="flex items-center">
                  <Input
                    id="traySizeCm2"
                    type="number"
                    value={settings.traySizeCm2 || ""}
                    onChange={(e) => handleSettingChange("traySizeCm2", parseFloat(e.target.value))}
                    className={selectedModel === "custom" ? "bg-muted" : ""}
                    readOnly={selectedModel !== "custom"}
                  />
                  <span className="ml-2 text-sm text-muted-foreground w-10">cm²</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="hashDensity">Hash Density</Label>
                <div className="flex items-center">
                  <Input
                    id="hashDensity"
                    type="text"
                    value={hashDensity.toFixed(2)}
                    className="bg-muted"
                    readOnly
                  />
                  <span className="ml-2 text-sm text-muted-foreground w-16">g/m²</span>
                </div>
                {hashDensity > 3 && (
                  <p className="text-xs text-amber-500">
                    Density exceeds 3 g/m², consider using more trays for better drying efficiency
                  </p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="waterRatio">Water to Hash Ratio</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="w-64">Ratio of water to total hash weight</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center">
                  <Input
                    id="waterRatio"
                    type="text"
                    value={(waterWeight / totalHashWeight).toFixed(2)}
                    className="bg-muted"
                    readOnly
                  />
                  <span className="ml-2 text-sm text-muted-foreground w-10">ratio</span>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <Separator />
        
        <div className="space-y-2">
          <Label>Temperature Display Unit</Label>
          <RadioGroup 
            value={displayUnit} 
            onValueChange={(value) => onDisplayUnitChange(value as 'C' | 'F')} 
            className="flex space-x-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="C" id="celsius" />
              <Label htmlFor="celsius">Celsius (°C)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="F" id="fahrenheit" />
              <Label htmlFor="fahrenheit">Fahrenheit (°F)</Label>
            </div>
          </RadioGroup>
        </div>
      </CardContent>
    </Card>
  );
}
