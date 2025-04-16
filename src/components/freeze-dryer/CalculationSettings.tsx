import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FreezeDryerSettings } from "@/utils/freezeDryerCalculations";
import { Separator } from "@/components/ui/separator";

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
    onSettingsChange({
      ...settings,
      [field]: value
    });
  };
  
  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div>
          <h3 className="text-2xl font-semibold leading-none tracking-tight mb-4">Freeze Parameters</h3>
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
            <Label htmlFor="heatInputRate">Heat Input Rate</Label>
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
