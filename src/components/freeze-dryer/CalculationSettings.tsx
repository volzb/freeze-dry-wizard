
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FreezeDryerSettings, estimateHeatInputRate } from "@/utils/freezeDryerCalculations";
import { Separator } from "@/components/ui/separator";
import { FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  
  const handleSettingChange = (field: keyof FreezeDryerSettings, value: any) => {
    const updatedSettings = {
      ...settings,
      [field]: value
    };
    
    // Auto-calculate heat input rate when tray parameters change
    if (field === "numberOfTrays" || field === "traySizeCm2") {
      // Use first step temperature and pressure as reference if available
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
  
  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div>
          <h3 className="text-2xl font-semibold leading-none tracking-tight mb-4">Freeze Dryer Parameters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="iceWeight">Ice Weight</Label>
            <div className="flex items-center">
              <Input
                id="iceWeight"
                type="number"
                value={settings.iceWeight || ""}
                onChange={(e) => handleSettingChange("iceWeight", parseFloat(e.target.value))}
                placeholder="0.5"
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
              />
              <span className="ml-2 text-sm text-muted-foreground w-10">kJ/hr</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="traySizeCm2">Tray Size</Label>
            <div className="flex items-center">
              <Input
                id="traySizeCm2"
                type="number"
                value={settings.traySizeCm2 || ""}
                onChange={(e) => handleSettingChange("traySizeCm2", parseFloat(e.target.value))}
                placeholder="500"
              />
              <span className="ml-2 text-sm text-muted-foreground w-10">cm²</span>
            </div>
          </div>
          
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
