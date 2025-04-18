
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

interface CalculationSettingsProps {
  settings: Partial<FreezeDryerSettings>;
  onSettingsChange: (settings: Partial<FreezeDryerSettings>) => void;
}

export function CalculationSettings({ 
  settings, 
  onSettingsChange 
}: CalculationSettingsProps) {
  
  // Generate a unique render ID to help with debugging
  const renderInstanceId = React.useId();
  
  // Create state for all form fields
  const [trayLength, setTrayLength] = useState<number | ''>(settings.trayLength || 45);
  const [trayWidth, setTrayWidth] = useState<number | ''>(settings.trayWidth || 20);
  const [hashPerTray, setHashPerTray] = useState<number | ''>(settings.hashPerTray !== undefined ? Number(settings.hashPerTray) : 0.5);
  const [waterPercentage, setWaterPercentage] = useState<number | ''>(settings.waterPercentage !== undefined ? Number(settings.waterPercentage) : 50);
  const [heatingPowerWatts, setHeatingPowerWatts] = useState<number | ''>(settings.heatingPowerWatts || 50);
  const [numberOfTrays, setNumberOfTrays] = useState<number | ''>(settings.numberOfTrays || 1);
  
  // Flag to track if the initial values have been loaded from settings
  const [initialSettingsLoaded, setInitialSettingsLoaded] = useState(false);

  // Log initial render for debugging
  useEffect(() => {
    console.log(`CalculationSettings initialized (ID: ${renderInstanceId})`, {
      initialSettings: settings,
      trayLength,
      trayWidth,
      hashPerTray,
      waterPercentage,
      heatingPowerWatts,
      numberOfTrays
    });
  }, []);
  
  // Update local state when settings change (e.g., when loading saved config)
  useEffect(() => {
    if (!initialSettingsLoaded) {
      console.log(`Loading initial settings (ID: ${renderInstanceId})`, settings);
      
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
      
      setInitialSettingsLoaded(true);
    }
  }, [settings, initialSettingsLoaded]);
  
  // Calculate area when length or width changes
  useEffect(() => {
    if (trayLength !== '' && trayWidth !== '') {
      const area = Number(trayLength) * Number(trayWidth);
      console.log(`Recalculating tray area (ID: ${renderInstanceId}):`, {
        trayLength,
        trayWidth,
        area
      });
      handleSettingChange("traySizeCm2", area);
      handleSettingChange("trayLength", trayLength);
      handleSettingChange("trayWidth", trayWidth);
    }
  }, [trayLength, trayWidth]);
  
  // When number of trays changes
  useEffect(() => {
    if (numberOfTrays !== '') {
      console.log(`Number of trays changed (ID: ${renderInstanceId}):`, numberOfTrays);
      handleSettingChange("numberOfTrays", numberOfTrays);
      
      // Force recalculate water weight when number of trays changes
      if (hashPerTray !== '' && waterPercentage !== '') {
        const totalHashWeight = Number(hashPerTray) * Number(numberOfTrays);
        const waterWeight = calculateWaterWeight(totalHashWeight, waterPercentage);
        console.log(`Updating ice weight due to tray count change (ID: ${renderInstanceId}):`, {
          hashPerTray,
          numberOfTrays,
          totalHashWeight,
          waterWeight
        });
        handleSettingChange("iceWeight", waterWeight);
      }
    }
  }, [numberOfTrays]);
  
  // Calculate total ice weight when hash per tray, water percentage, or number of trays changes
  useEffect(() => {
    if (hashPerTray !== '' && waterPercentage !== '' && numberOfTrays !== '') {
      const totalHashWeight = Number(hashPerTray) * Number(numberOfTrays);
      const waterWeight = calculateWaterWeight(totalHashWeight, waterPercentage);
      
      console.log(`Water calculation parameters changed (ID: ${renderInstanceId}):`, {
        hashPerTray,
        numberOfTrays,
        waterPercentage, 
        totalHashWeight,
        calculatedWaterWeight: waterWeight
      });
      
      // Update hashPerTray and waterPercentage values
      handleSettingChange("hashPerTray", Number(hashPerTray));
      handleSettingChange("waterPercentage", Number(waterPercentage));
      
      // Update ice weight - this is critical for the progress curve calculation
      handleSettingChange("iceWeight", waterWeight);
    }
  }, [hashPerTray, waterPercentage, numberOfTrays]);
  
  // Calculate heat input rate based on heating power
  useEffect(() => {
    if (heatingPowerWatts !== '' && numberOfTrays !== '') {
      const tempC = 20; // Default temperature
      const pressureMbar = 300; // Default pressure
      
      console.log(`Heating power changed (ID: ${renderInstanceId}):`, {
        heatingPowerWatts,
        numberOfTrays
      });
      
      // Update heating power
      handleSettingChange("heatingPowerWatts", Number(heatingPowerWatts));
      
      // Calculate efficiency based on temperature and pressure
      const efficiency = estimateHeatTransferEfficiency(tempC, pressureMbar);
      
      // Calculate heat input rate from heating power and efficiency
      const heatRate = calculateHeatInputFromPower(
        Number(heatingPowerWatts), 
        Number(numberOfTrays),
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
    if ((field === 'hashPerTray' || field === 'waterPercentage' || field === 'heatingPowerWatts') && value !== '') {
      value = Number(value);
    }
    
    const updatedSettings = {
      ...settings,
      [field]: value
    };
    
    console.log(`Updating setting ${field} (ID: ${renderInstanceId}):`, {
      oldValue: settings[field],
      newValue: value
    });
    onSettingsChange(updatedSettings);
  };
  
  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<number | ''>>, fieldName: string) => {
    const value = e.target.value;
    if (value === '') {
      setter('');
    } else {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        console.log(`Input value changed for ${fieldName} (ID: ${renderInstanceId}):`, {
          oldValue: fieldName === 'trayLength' ? trayLength : 
                   fieldName === 'trayWidth' ? trayWidth :
                   fieldName === 'hashPerTray' ? hashPerTray :
                   fieldName === 'waterPercentage' ? waterPercentage :
                   fieldName === 'heatingPowerWatts' ? heatingPowerWatts :
                   fieldName === 'numberOfTrays' ? numberOfTrays : 'unknown',
          newValue: numValue
        });
        setter(numValue);
      }
    }
  };
  
  // Calculate summarized values
  const totalHashWeight = (hashPerTray !== '' && numberOfTrays !== '') ? 
    Number(hashPerTray) * Number(numberOfTrays) : 0;
  const totalWaterWeight = (hashPerTray !== '' && waterPercentage !== '' && numberOfTrays !== '') ? 
    calculateWaterWeight(totalHashWeight, waterPercentage) : 0;
  const totalArea = (trayLength !== '' && trayWidth !== '' && numberOfTrays !== '') ? 
    (Number(trayLength) * Number(trayWidth)) * Number(numberOfTrays) : 0;
  const hashDensity = totalHashWeight > 0 && totalArea > 0 ? 
    (totalHashWeight * 1000) / (totalArea / 100) : 0;
  
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
                  value={trayLength === '' ? '' : trayLength.toString()}
                  onChange={(e) => handleInputChange(e, setTrayLength, 'trayLength')}
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
                  value={trayWidth === '' ? '' : trayWidth.toString()}
                  onChange={(e) => handleInputChange(e, setTrayWidth, 'trayWidth')}
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
                  value={numberOfTrays === '' ? '' : numberOfTrays.toString()}
                  onChange={(e) => handleInputChange(e, setNumberOfTrays, 'numberOfTrays')}
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
                  value={heatingPowerWatts === '' ? '' : heatingPowerWatts.toString()}
                  onChange={(e) => handleInputChange(e, setHeatingPowerWatts, 'heatingPowerWatts')}
                />
                <span className="ml-2 text-sm text-muted-foreground w-16">watts</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                <p>Total heating power: {heatingPowerWatts !== '' && numberOfTrays !== '' ? 
                  (Number(heatingPowerWatts) * Number(numberOfTrays)).toFixed(0) : '0'} watts</p>
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
                  value={hashPerTray === '' ? '' : hashPerTray.toString()}
                  onChange={(e) => handleInputChange(e, setHashPerTray, 'hashPerTray')}
                  step="0.01"
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
                  value={waterPercentage === '' ? '' : waterPercentage.toString()}
                  onChange={(e) => handleInputChange(e, setWaterPercentage, 'waterPercentage')}
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
                  value={formatNumber(totalHashWeight, 2)}
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
                  value={formatNumber(totalWaterWeight, 3)}
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
                  value={formatNumber(hashDensity, 2)}
                  className="bg-muted"
                  readOnly
                />
                <span className="ml-2 text-sm text-muted-foreground w-16">g/m²</span>
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
