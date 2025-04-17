import React, { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DryingStepForm } from "@/components/freeze-dryer/DryingStepForm";
import { TerpeneChart } from "@/components/freeze-dryer/TerpeneChart";
import { TerpeneSelector } from "@/components/freeze-dryer/TerpeneSelector";
import { CalculationSettings } from "@/components/freeze-dryer/CalculationSettings";
import { ResultSummary } from "@/components/freeze-dryer/ResultSummary";
import { SavedSettings } from "@/components/freeze-dryer/SavedSettings";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { terpenes } from "@/utils/terpeneData";
import { useAuth } from "@/contexts/AuthContext";
import { 
  DryingStep, 
  FreezeDryerSettings, 
  calculateProgressCurve,
  SubTimePoint,
  normalizeTemperature,
  normalizePressure,
  estimateHeatInputRate,
  calculateWaterWeight
} from "@/utils/freezeDryerCalculations";
import { InfoIcon } from "lucide-react";
import { v4 as uuidv4 } from "@/utils/uuid";

// Default values for the calculator - these will be used as initial values
// and will update when the user saves their settings to localStorage
const defaultSettings = {
  // Default tray dimensions (typical lab freeze dryer tray)
  trayLength: 45, // 45 cm
  trayWidth: 20, // 20 cm
  traySizeCm2: 45 * 20, // 900 cm²
  numberOfTrays: 5,
  hashPerTray: 0.5, // Default hash per tray in kg
  waterPercentage: 50, // Default water percentage  
  heatingPowerWatts: 50, // Default heating power in watts per tray
  iceWeight: 1.25 // Will be recalculated based on hash and water percentage
};

// Try to load saved defaults from localStorage
const loadSavedDefaults = (): Partial<FreezeDryerSettings> => {
  try {
    const savedDefaultsString = localStorage.getItem('freezeDryerDefaults');
    if (savedDefaultsString) {
      const savedDefaults = JSON.parse(savedDefaultsString);
      console.log("Loaded saved defaults:", savedDefaults);
      return savedDefaults;
    }
  } catch (error) {
    console.error("Error loading saved defaults:", error);
  }
  return defaultSettings;
};

// Save current settings as defaults
const saveAsDefaults = (settings: Partial<FreezeDryerSettings>) => {
  try {
    localStorage.setItem('freezeDryerDefaults', JSON.stringify(settings));
    console.log("Saved current settings as defaults:", settings);
  } catch (error) {
    console.error("Error saving defaults:", error);
  }
};

export default function FreezeDryerCalculator() {
  // Temperature unit for display
  const [displayUnit, setDisplayUnit] = useState<'C' | 'F'>('C');
  const { isAuthenticated, user } = useAuth();
  
  // Reference to savedSettings component for reloading
  const [savedSettingsKey, setSavedSettingsKey] = useState<number>(0);
  
  // Load saved defaults when component mounts
  const initialSettings = useMemo(() => loadSavedDefaults(), []);
  
  // Initialize heat input rate based on first step and loaded defaults
  const initialHeatRate = useMemo(() => estimateHeatInputRate(
    -30, // Initial temperature from first step
    200, // Initial pressure from first step
    ((initialSettings.traySizeCm2 || defaultSettings.traySizeCm2) / 10000) * 
    (initialSettings.numberOfTrays || defaultSettings.numberOfTrays) // Convert to m²
  ), [initialSettings]);
  
  // Drying steps
  const [steps, setSteps] = useState<DryingStep[]>([
    {
      id: uuidv4(),
      temperature: -30,
      pressure: 200,
      duration: 180,
      tempUnit: 'C',
      pressureUnit: 'mBar'
    },
    {
      id: uuidv4(),
      temperature: -10,
      pressure: 150,
      duration: 180,
      tempUnit: 'C',
      pressureUnit: 'mBar'
    },
    {
      id: uuidv4(),
      temperature: 10,
      pressure: 100,
      duration: 180,
      tempUnit: 'C',
      pressureUnit: 'mBar'
    }
  ]);
  
  // Calculation settings
  const [settings, setSettings] = useState<Partial<FreezeDryerSettings>>({
    iceWeight: initialSettings.iceWeight || defaultSettings.iceWeight,
    heatInputRate: initialSettings.heatInputRate || Math.round(initialHeatRate),
    traySizeCm2: initialSettings.traySizeCm2 || defaultSettings.traySizeCm2,
    trayLength: initialSettings.trayLength || defaultSettings.trayLength,
    trayWidth: initialSettings.trayWidth || defaultSettings.trayWidth,
    numberOfTrays: initialSettings.numberOfTrays || defaultSettings.numberOfTrays,
    waterPercentage: initialSettings.waterPercentage || defaultSettings.waterPercentage,
    hashPerTray: initialSettings.hashPerTray || defaultSettings.hashPerTray,
    heatingPowerWatts: initialSettings.heatingPowerWatts || defaultSettings.heatingPowerWatts
  });
  
  // Force reload of saved settings when authentication state changes
  useEffect(() => {
    // Increment key to force component remount/reload when auth state changes
    setSavedSettingsKey(prev => prev + 1);
    console.log("Auth state changed in calculator, triggering saved settings reload");
  }, [isAuthenticated, user]);
  
  // Save current settings as defaults when they change
  useEffect(() => {
    // Only save after initial mount to avoid overwriting with empty values
    if (Object.keys(settings).length > 0) {
      saveAsDefaults(settings);
    }
  }, [settings]);
  
  // Selected terpenes to display
  const [selectedTerpenes, setSelectedTerpenes] = useState<string[]>(
    terpenes.slice(0, 5).map(t => t.name)
  );
  
  // Load settings and steps
  const handleLoadSavedSettings = (savedSettings: Partial<FreezeDryerSettings>, savedSteps: DryingStep[]) => {
    try {
      console.log("Loading saved settings:", savedSettings);
      console.log("Loading saved steps:", savedSteps);
      
      if (!savedSettings) {
        console.error("Saved settings is undefined or null");
        return;
      }
      
      // Force hashPerTray to be a number and log it
      if (savedSettings.hashPerTray !== undefined) {
        savedSettings.hashPerTray = Number(savedSettings.hashPerTray);
      }
      
      // Create a deep copy of saved settings to avoid reference issues
      const savedSettingsCopy = JSON.parse(JSON.stringify(savedSettings));
      
      // Ensure hashPerTray is explicitly handled and converted to a number
      if (savedSettingsCopy.hashPerTray !== undefined) {
        savedSettingsCopy.hashPerTray = Number(savedSettingsCopy.hashPerTray);
      } else {
        savedSettingsCopy.hashPerTray = defaultSettings.hashPerTray;
      }
      
      // Ensure waterPercentage is explicitly handled
      if (savedSettingsCopy.waterPercentage === undefined) {
        savedSettingsCopy.waterPercentage = defaultSettings.waterPercentage;
      }
      
      // Ensure trayLength and trayWidth are explicitly handled
      if (savedSettingsCopy.trayLength === undefined) {
        savedSettingsCopy.trayLength = defaultSettings.trayLength;
      }
      if (savedSettingsCopy.trayWidth === undefined) {
        savedSettingsCopy.trayWidth = defaultSettings.trayWidth;
      }
      
      // Ensure heatingPowerWatts is explicitly handled
      if (savedSettingsCopy.heatingPowerWatts === undefined) {
        savedSettingsCopy.heatingPowerWatts = defaultSettings.heatingPowerWatts;
      }
      
      // Make sure steps have IDs
      const completeSteps = savedSteps.map(step => ({
        ...step,
        id: step.id || uuidv4()
      }));
      
      // Update settings state with the complete settings
      setSettings(savedSettingsCopy);
      setSteps(completeSteps);
      
      // Save these loaded settings as new defaults
      saveAsDefaults(savedSettingsCopy);
    } catch (error) {
      console.error("Error loading saved settings:", error);
    }
  };
  
  // Calculate progress curve data
  const progressCurve = useMemo(() => {
    if (!steps.length || !settings.iceWeight) return [] as SubTimePoint[];
    
    return calculateProgressCurve({
      steps,
      iceWeight: settings.iceWeight || 0,
      heatInputRate: settings.heatInputRate || 0,
      traySizeCm2: settings.traySizeCm2 || defaultSettings.traySizeCm2,
      numberOfTrays: settings.numberOfTrays || defaultSettings.numberOfTrays,
      trayLength: settings.trayLength || defaultSettings.trayLength,
      trayWidth: settings.trayWidth || defaultSettings.trayWidth,
      hashPerTray: settings.hashPerTray || defaultSettings.hashPerTray,
      waterPercentage: settings.waterPercentage || defaultSettings.waterPercentage,
      heatingPowerWatts: settings.heatingPowerWatts || defaultSettings.heatingPowerWatts
    } as FreezeDryerSettings);
  }, [
    steps, 
    settings.iceWeight, 
    settings.heatInputRate, 
    settings.traySizeCm2, 
    settings.numberOfTrays,
    settings.trayLength,
    settings.trayWidth,
    settings.hashPerTray,
    settings.waterPercentage,
    settings.heatingPowerWatts
  ]);
  
  // Calculate water weight based on hash per tray, number of trays, and water percentage
  const waterWeight = useMemo(() => {
    const hashPerTrayValue = settings.hashPerTray !== undefined ? settings.hashPerTray : defaultSettings.hashPerTray;
    const totalHashWeight = hashPerTrayValue * (settings.numberOfTrays || defaultSettings.numberOfTrays);
    const waterPercentageValue = settings.waterPercentage !== undefined ? settings.waterPercentage : defaultSettings.waterPercentage;
    
    return calculateWaterWeight(totalHashWeight, waterPercentageValue);
  }, [settings.hashPerTray, settings.numberOfTrays, settings.waterPercentage]);
  
  // Update ice weight when water weight calculation changes
  useEffect(() => {
    setSettings(prevSettings => ({
      ...prevSettings,
      iceWeight: waterWeight
    }));
  }, [waterWeight]);
  
  // Check for potentially risky conditions
  const riskAssessment = useMemo(() => {
    if (!steps.length) return [];
    
    const risks = [];
    
    // Check for high hash density
    const totalArea = (settings.traySizeCm2 || 0) * (settings.numberOfTrays || 1) / 100; // convert to m²
    const hashDensity = settings.hashPerTray && totalArea ? (settings.hashPerTray * (settings.numberOfTrays || 1) * 1000) / totalArea : 0;
    
    if (hashDensity > 3) {
      risks.push({
        type: "density",
        message: `Hash density is ${hashDensity.toFixed(1)} g/m². Values above 3 g/m² may result in uneven drying.`
      });
    }
    
    // Check water content risks
    if (settings.waterPercentage && settings.waterPercentage > 90) {
      risks.push({
        type: "water",
        message: `Water content is ${settings.waterPercentage}%. Very high water content may extend drying time significantly.`
      });
    }
    
    // Check temperature and pressure risks
    steps.forEach((step, index) => {
      const tempC = normalizeTemperature(step.temperature, step.tempUnit);
      const pressureMbar = normalizePressure(step.pressure, step.pressureUnit);
      
      // High temperature risk (above 30°C)
      const tempRisk = tempC > 30;
      
      // Low pressure risk (below 50 mBar)
      const pressureRisk = pressureMbar < 50;
      
      if (tempRisk || pressureRisk) {
        risks.push({
          type: "step",
          stepIndex: index,
          tempRisk,
          pressureRisk,
          message: tempRisk && pressureRisk
            ? "High temperature and low pressure may cause significant terpene loss."
            : tempRisk 
              ? "High temperature may accelerate terpene evaporation."
              : "Very low pressure may extract some terpenes."
        });
      }
    });
    
    return risks;
  }, [steps, settings.hashPerTray, settings.traySizeCm2, settings.numberOfTrays, settings.waterPercentage]);
  
  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Freeze Dryer Calculator</h1>
          <p className="text-lg text-muted-foreground mt-2">
            Optimize your freeze drying process and preserve terpenes
          </p>
        </div>
        
        {riskAssessment.length > 0 && (
          <Alert variant="destructive">
            <InfoIcon className="h-4 w-4" />
            <AlertTitle>Potential Issues Detected</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside mt-2 space-y-1">
                {riskAssessment.map((risk, idx) => (
                  <li key={idx}>
                    {risk.type === "step" ? `Step ${(risk as any).stepIndex + 1}: ` : ""}
                    {risk.message}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-6 md:col-span-2">
            <Card>
              <CardContent className="p-4">
                <SavedSettings 
                  key={savedSettingsKey}
                  currentSettings={settings}
                  currentSteps={steps}
                  onLoadSettings={handleLoadSavedSettings}
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Drying and Terpene Visualization</CardTitle>
                <CardDescription>
                  Monitor sublimation progress and terpene preservation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="chart" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <TabsList>
                      <TabsTrigger value="chart">Chart</TabsTrigger>
                      <TabsTrigger value="info">Information</TabsTrigger>
                    </TabsList>
                    
                    <div className="w-80">
                      <TerpeneSelector
                        selectedTerpenes={selectedTerpenes}
                        onChange={setSelectedTerpenes}
                      />
                    </div>
                  </div>
                  
                  <TabsContent value="chart" className="space-y-4">                    
                    <TerpeneChart 
                      dryingData={progressCurve}
                      steps={steps}
                      displayUnit={displayUnit}
                      showTerpenes={selectedTerpenes}
                    />
                    
                    <div className="pt-4 text-sm text-muted-foreground">
                      <p>
                        <strong>How to read this chart:</strong> Solid blue line shows temperature profile. Purple line shows sublimation progress. Dotted lines represent terpene boiling points at the current pressure. If the temperature line crosses a terpene's boiling point line, that terpene is at risk of loss.
                      </p>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="info">
                    <div className="prose max-w-none">
                      <h4>Understanding Freeze Drying and Terpene Preservation</h4>
                      <p>
                        Freeze drying works by sublimating ice directly from solid to vapor state without going through the liquid phase. This process is ideal for preserving terpenes, which are volatile compounds that would otherwise evaporate during conventional drying methods.
                      </p>
                      <h4>Key Factors</h4>
                      <ul>
                        <li><strong>Temperature:</strong> Lower temperatures help preserve terpenes but slow the drying process.</li>
                        <li><strong>Pressure:</strong> Low pressure enables sublimation at lower temperatures.</li>
                        <li><strong>Time:</strong> Each step's duration affects both energy transfer and terpene preservation.</li>
                      </ul>
                      <h4>Calculation Method</h4>
                      <p>
                        This calculator uses the formula: Time = (m × L<sub>f</sub>) / Q where:
                        <br />m = ice mass (kg)
                        <br />L<sub>f</sub> = latent heat of sublimation (2835 kJ/kg)
                        <br />Q = heat input rate (kJ/hr)
                      </p>
                      <p>
                        Terpene boiling points are calculated using the Antoine equation with pressure adjustments.
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Freeze Drying Program</CardTitle>
                <CardDescription>
                  Configure your drying steps to optimize for terpene preservation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <DryingStepForm 
                    steps={steps}
                    onChange={setSteps}
                    maxSteps={8}
                  />
                </div>
              </CardContent>
            </Card>
            
          </div>
          
          <div className="space-y-6">
            <ResultSummary 
              progressCurve={progressCurve}
              displayUnit={displayUnit}
              waterWeight={waterWeight}
              waterPercentage={settings.waterPercentage}
            />
            
            <CalculationSettings
              settings={settings}
              onSettingsChange={setSettings}
            />
            
            <Card>
              <CardHeader>
                <CardTitle>Terpene Guide</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="text-sm space-y-1">
                  <p className="font-semibold">Terpene Boiling Points (at atmospheric pressure):</p>
                  <ul className="space-y-1 text-sm">
                    {terpenes.map((terpene) => (
                      <li key={terpene.name} className="flex justify-between items-center">
                        <span className="flex items-center">
                          <span 
                            className="h-3 w-3 rounded-full mr-2" 
                            style={{ backgroundColor: terpene.color }}
                          />
                          {terpene.name}
                        </span>
                        <span>{terpene.boilingPoint}°C</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
