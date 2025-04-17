
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  FreezeDryerSettings, 
  calculateWaterWeight 
} from "@/utils/freezeDryerCalculations";
import { 
  estimateHeatInputRate, 
  calculateHeatInputFromPower,
  estimateHeatTransferEfficiency 
} from "@/utils/heatTransferCalculations";
import { Separator } from "@/components/ui/separator";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface CalculationSettingsProps {
  settings: Partial<FreezeDryerSettings>;
  onSettingsChange: (settings: Partial<FreezeDryerSettings>) => void;
  displayUnit: 'C' | 'F';
  onDisplayUnitChange: (unit: 'C' | 'F') => void;
}

export function CalculationSettings({ 
  settings, 
  onSettingsChange,
  displayUnit,
  onDisplayUnitChange
}: CalculationSettingsProps) {
  
  const [trayLength, setTrayLength] = useState<number>(settings.trayLength || 22.36);
  const [trayWidth, setTrayWidth] = useState<number>(settings.trayWidth || 22.36);
  const [hashPerTray, setHashPerTray] = useState<number>(settings.hashPerTray !== undefined ? Number(settings.hashPerTray) : 0.15);
  const [waterPercentage, setWaterPercentage] = useState<number>(settings.waterPercentage || 75);
  const [heatingPowerWatts, setHeatingPowerWatts] = useState<number>(settings.heatingPowerWatts || 250);
  const [numberOfTrays, setNumberOfTrays] = useState<number>(settings.numberOfTrays || 3);
  
  // Update local state when settings change (e.g., when loading saved config)
  useEffect(() => {
    if (settings.hashPerTray !== undefined) {
      const numericValue = Number(settings.hashPerTray);
      if (!isNaN(numericValue)) {
        setHashPerTray(numericValue);
      }
    }
    
    if (settings.waterPercentage !== undefined) {
      setWaterPercentage(settings.waterPercentage);
    }
    
    if (settings.heatingPowerWatts !== undefined) {
      setHeatingPowerWatts(settings.heatingPowerWatts);
    }
    
    if (settings.numberOfTrays !== undefined) {
      setNumberOfTrays(settings.numberOfTrays);
    }
    
    if (settings.trayLength !== undefined) {
      setTrayLength(settings.trayLength);
    }
    
    if (settings.trayWidth !== undefined) {
      setTrayWidth(settings.trayWidth);
    }
  }, [settings]);
  
  // Calculate area when length or width changes
  useEffect(() => {
    const area = trayLength * trayWidth;
    handleSettingChange("traySizeCm2", area);
    handleSettingChange("trayLength", trayLength);
    handleSettingChange("trayWidth", trayWidth);
  }, [trayLength, trayWidth]);
  
  // When number of trays changes
  useEffect(() => {
    handleSettingChange("numberOfTrays", numberOfTrays);
  }, [numberOfTrays]);
  
  // Calculate total ice weight when hash per tray, water percentage, or number of trays changes
  useEffect(() => {
    if (hashPerTray > 0) {
      const totalHashWeight = hashPerTray * numberOfTrays;
      const waterWeight = calculateWaterWeight(totalHashWeight, waterPercentage);
      
      handleSettingChange("hashPerTray", hashPerTray);
      handleSettingChange("waterPercentage", waterPercentage);
      handleSettingChange("iceWeight", waterWeight);
    }
  }, [hashPerTray, waterPercentage, numberOfTrays]);
  
  // Calculate heat input rate based on heating power
  useEffect(() => {
    const tempC = 
      settings.steps && settings.steps.length > 0 
        ? settings.steps[0].temperature
        : 20;
        
    const pressureMbar = 
      settings.steps && settings.steps.length > 0 
        ? settings.steps[0].pressure
        : 300;
    
    // Update heating power
    handleSettingChange("heatingPowerWatts", heatingPowerWatts);
    
    // Calculate efficiency based on temperature and pressure
    const efficiency = estimateHeatTransferEfficiency(tempC, pressureMbar);
    
    // Calculate heat input rate from heating power and efficiency
    const heatRate = calculateHeatInputFromPower(
      heatingPowerWatts, 
      numberOfTrays,
      efficiency
    );
    handleSettingChange("heatInputRate", Math.round(heatRate));
    
  }, [
    heatingPowerWatts,
    numberOfTrays,
    settings.steps,
  ]);
  
  const handleSettingChange = (field: keyof FreezeDryerSettings, value: any) => {
    // Ensure value is valid
    if (value === null || value === undefined || (typeof value === 'number' && isNaN(value))) {
      console.error(`Invalid value for ${field}:`, value);
      return;
    }
    
    // Handle numeric conversion for specific fields
    if (field === 'hashPerTray' || field === 'heatingPowerWatts') {
      value = Number(value);
    }
    
    const updatedSettings = {
      ...settings,
      [field]: value
    };
    
    onSettingsChange(updatedSettings);
  };
  
  // Calculate summarized values
  const totalHashWeight = hashPerTray * numberOfTrays;
  const totalWaterWeight = calculateWaterWeight(totalHashWeight, waterPercentage);
  const totalArea = (trayLength * trayWidth) * numberOfTrays;
  const hashDensity = totalHashWeight > 0 && totalArea > 0 ? (totalHashWeight * 1000) / (totalArea / 100) : 0;
  
  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div>
          <h3 className="text-2xl font-semibold leading-none tracking-tight mb-4">Freeze Dryer Parameters</h3>
        </div>
        
        <div className="space-y-4">
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numberOfTrays">Number of Trays</Label>
              <div className="flex items-center">
                <Input
                  id="numberOfTrays"
                  type="number"
                  value={numberOfTrays || ""}
                  onChange={(e) => setNumberOfTrays(parseInt(e.target.value))}
                  placeholder="3"
                  min="1"
                  step="1"
                />
                <span className="ml-2 text-sm text-muted-foreground w-10">trays</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="heatingPowerWatts">Heating Power Per Tray</Label>
              <div className="flex items-center">
                <Input
                  id="heatingPowerWatts"
                  type="number"
                  value={heatingPowerWatts || ""}
                  onChange={(e) => setHeatingPowerWatts(parseFloat(e.target.value))}
                  placeholder="250"
                  min="50"
                  step="10"
                />
                <span className="ml-2 text-sm text-muted-foreground w-16">watts</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                <p>Total heating power: {(heatingPowerWatts * numberOfTrays).toFixed(0)} watts</p>
              </div>
            </div>
          </div>
          
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
                    if (!isNaN(value)) {
                      setHashPerTray(value);
                    }
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
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    setWaterPercentage(value);
                  }}
                  placeholder="75"
                  min="1"
                  max="99"
                  step="1"
                />
                <span className="ml-2 text-sm text-muted-foreground w-10">%</span>
              </div>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Label>Total Water to Remove</Label>
              <div className="flex items-center">
                <Input 
                  type="text"
                  value={totalWaterWeight.toFixed(3)}
                  readOnly
                  className="bg-muted"
                />
                <span className="ml-2 text-sm text-muted-foreground w-10">kg</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="hashDensity">Hash Density</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="w-64">Amount of hash per unit of shelf area. Lower values typically result in more even drying.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
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
            
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="heatInputRate">Heat Input Rate</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="w-64">
                      Calculated based on heating element power, adjusted for temperature and pressure efficiency
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex items-center">
                <Input
                  id="heatInputRate"
                  type="number"
                  value={settings.heatInputRate || ""}
                  className="bg-muted"
                  readOnly
                />
                <span className="ml-2 text-sm text-muted-foreground w-10">kJ/hr</span>
              </div>
            </div>
          </div>
        </div>
        
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
