
import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
}

export function CalculationSettings({ 
  settings, 
  onSettingsChange 
}: CalculationSettingsProps) {
  
  const [trayLength, setTrayLength] = useState<number | ''>(settings.trayLength || 22.36);
  const [trayWidth, setTrayWidth] = useState<number | ''>(settings.trayWidth || 22.36);
  const [hashPerTray, setHashPerTray] = useState<number | ''>(settings.hashPerTray !== undefined ? Number(settings.hashPerTray) : 0.15);
  const [waterPercentage, setWaterPercentage] = useState<number | ''>(settings.waterPercentage || 75);
  const [heatingPowerWatts, setHeatingPowerWatts] = useState<number | ''>(settings.heatingPowerWatts || 250);
  const [numberOfTrays, setNumberOfTrays] = useState<number | ''>(settings.numberOfTrays || 3);
  
  // Update local state when settings change (e.g., when loading saved config)
  useEffect(() => {
    if (settings.trayLength !== undefined) {
      setTrayLength(settings.trayLength);
    }
    
    if (settings.trayWidth !== undefined) {
      setTrayWidth(settings.trayWidth);
    }
    
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
  }, [settings]);
  
  // Calculate area when length or width changes
  useEffect(() => {
    if (trayLength !== '' && trayWidth !== '') {
      const area = trayLength * trayWidth;
      handleSettingChange("traySizeCm2", area);
      handleSettingChange("trayLength", trayLength);
      handleSettingChange("trayWidth", trayWidth);
    }
  }, [trayLength, trayWidth]);
  
  // When number of trays changes
  useEffect(() => {
    if (numberOfTrays !== '') {
      handleSettingChange("numberOfTrays", numberOfTrays);
    }
  }, [numberOfTrays]);
  
  // Calculate total ice weight when hash per tray, water percentage, or number of trays changes
  useEffect(() => {
    if (hashPerTray !== '' && waterPercentage !== '' && numberOfTrays !== '') {
      const totalHashWeight = hashPerTray * numberOfTrays;
      const waterWeight = calculateWaterWeight(totalHashWeight, waterPercentage);
      
      handleSettingChange("hashPerTray", hashPerTray);
      handleSettingChange("waterPercentage", waterPercentage);
      handleSettingChange("iceWeight", waterWeight);
    }
  }, [hashPerTray, waterPercentage, numberOfTrays]);
  
  // Calculate heat input rate based on heating power
  useEffect(() => {
    if (heatingPowerWatts !== '' && numberOfTrays !== '') {
      const tempC = 20; // Default temperature
      const pressureMbar = 300; // Default pressure
      
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
    }
  }, [heatingPowerWatts, numberOfTrays]);
  
  const handleSettingChange = (field: keyof FreezeDryerSettings, value: any) => {
    // Ensure value is valid
    if (value === null || (typeof value === 'number' && isNaN(value))) {
      console.error(`Invalid value for ${field}:`, value);
      return;
    }
    
    // Handle numeric conversion for specific fields
    if ((field === 'hashPerTray' || field === 'heatingPowerWatts') && value !== '') {
      value = Number(value);
    }
    
    const updatedSettings = {
      ...settings,
      [field]: value
    };
    
    onSettingsChange(updatedSettings);
  };
  
  // Calculate summarized values
  const totalHashWeight = (hashPerTray !== '' && numberOfTrays !== '') ? hashPerTray * numberOfTrays : 0;
  const totalWaterWeight = (hashPerTray !== '' && waterPercentage !== '' && numberOfTrays !== '') ? 
    calculateWaterWeight(totalHashWeight, waterPercentage) : 0;
  const totalArea = (trayLength !== '' && trayWidth !== '' && numberOfTrays !== '') ? 
    (trayLength * trayWidth) * numberOfTrays : 0;
  const hashDensity = totalHashWeight > 0 && totalArea > 0 ? (totalHashWeight * 1000) / (totalArea / 100) : 0;
  
  // Helper function to safely format numbers with toFixed
  const formatNumber = (value: number | '', decimals: number = 2): string => {
    return typeof value === 'number' ? value.toFixed(decimals) : '0';
  };
  
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
                  type="text"
                  value={formatNumber(trayLength)}
                  readOnly
                  className="bg-muted cursor-not-allowed"
                />
                <span className="ml-2 text-sm text-muted-foreground w-10">cm</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="trayWidth">Tray Width</Label>
              <div className="flex items-center">
                <Input
                  id="trayWidth"
                  type="text"
                  value={formatNumber(trayWidth)}
                  readOnly
                  className="bg-muted cursor-not-allowed"
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
                  type="text"
                  value={numberOfTrays !== '' ? String(numberOfTrays) : '0'}
                  readOnly
                  className="bg-muted cursor-not-allowed"
                />
                <span className="ml-2 text-sm text-muted-foreground w-10">trays</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="heatingPowerWatts">Heating Power Per Tray</Label>
              <div className="flex items-center">
                <Input
                  id="heatingPowerWatts"
                  type="text"
                  value={heatingPowerWatts !== '' ? String(heatingPowerWatts) : '0'}
                  readOnly
                  className="bg-muted cursor-not-allowed"
                />
                <span className="ml-2 text-sm text-muted-foreground w-16">watts</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                <p>Total heating power: {heatingPowerWatts !== '' && numberOfTrays !== '' ? 
                  (heatingPowerWatts * numberOfTrays).toFixed(0) : '0'} watts</p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hashPerTray">Hash Per Tray</Label>
              <div className="flex items-center">
                <Input
                  id="hashPerTray"
                  type="text"
                  value={formatNumber(hashPerTray)}
                  readOnly
                  className="bg-muted cursor-not-allowed"
                />
                <span className="ml-2 text-sm text-muted-foreground w-10">kg</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="waterPercentage">Water Content</Label>
              <div className="flex items-center">
                <Input
                  id="waterPercentage"
                  type="text"
                  value={waterPercentage !== '' ? String(waterPercentage) : '0'}
                  readOnly
                  className="bg-muted cursor-not-allowed"
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
                  type="text"
                  value={settings.heatInputRate || "0"}
                  className="bg-muted"
                  readOnly
                />
                <span className="ml-2 text-sm text-muted-foreground w-10">kJ/hr</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
