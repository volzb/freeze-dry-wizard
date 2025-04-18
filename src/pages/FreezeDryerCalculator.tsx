import React, { useState, useEffect, useMemo, useId } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DryingStepForm } from "@/components/freeze-dryer/DryingStepForm";
import { TerpeneChart } from "@/components/freeze-dryer/TerpeneChart";
import { TerpeneSelector } from "@/components/freeze-dryer/TerpeneSelector";
import { CalculationSettings } from "@/components/freeze-dryer/CalculationSettings";
import { ResultSummary } from "@/components/freeze-dryer/ResultSummary";
import { SavedSettings } from "@/components/freeze-dryer/SavedSettings";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { terpenes, celsiusToFahrenheit } from "@/utils/terpeneData";
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
import { Toggle } from "@/components/ui/toggle";

const defaultSettings = {
  trayLength: 45, // 45 cm
  trayWidth: 20, // 20 cm
  traySizeCm2: 45 * 20, // 900 cm²
  numberOfTrays: 5,
  hashPerTray: 0.5, // Default hash per tray in kg
  waterPercentage: 50, // Default water percentage  
  heatingPowerWatts: 50, // Default heating power in watts per tray
  iceWeight: 1.25 // Will be recalculated based on hash and water percentage
};

const defaultDryingSteps: DryingStep[] = [
  {
    id: "61521471-d2bc-4f08-a723-4512a48599da",
    temperature: -20,
    pressure: 0.1,
    duration: 300,
    tempUnit: 'C' as 'C' | 'F',
    pressureUnit: 'mBar' as 'mBar' | 'Torr'
  },
  {
    id: "5d37bf6e-061b-481a-a620-ef7856c1f3a1",
    temperature: -10,
    pressure: 0.25,
    duration: 180,
    tempUnit: 'C' as 'C' | 'F',
    pressureUnit: 'mBar' as 'mBar' | 'Torr'
  },
  {
    id: "85c4f7e4-f38f-4a99-be17-dc5840eb9952",
    temperature: 3,
    pressure: 0.23,
    duration: 180,
    tempUnit: 'C' as 'C' | 'F',
    pressureUnit: 'mBar' as 'mBar' | 'Torr'
  },
  {
    id: "0c819d88-3f11-440b-94d6-830eeb5d1004",
    temperature: 4,
    pressure: 3,
    duration: 60,
    tempUnit: 'C' as 'C' | 'F',
    pressureUnit: 'mBar' as 'mBar' | 'Torr'
  },
  {
    id: "ad16ed28-921f-4995-a7aa-1c6f1ec00f0f",
    temperature: 5,
    pressure: 0.2,
    duration: 60,
    tempUnit: 'C' as 'C' | 'F',
    pressureUnit: 'mBar' as 'mBar' | 'Torr'
  }
];

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

const saveAsDefaults = (settings: Partial<FreezeDryerSettings>) => {
  try {
    localStorage.setItem('freezeDryerDefaults', JSON.stringify(settings));
    console.log("Saved current settings as defaults:", settings);
  } catch (error) {
    console.error("Error saving defaults:", error);
  }
};

export default function FreezeDryerCalculator() {
  const [displayUnit, setDisplayUnit] = useState<'C' | 'F'>('C');
  const { isAuthenticated, user } = useAuth();
  const forceUpdateKey = useId();
  
  const [savedSettingsKey, setSavedSettingsKey] = useState<number>(0);
  
  const initialSettings = useMemo(() => loadSavedDefaults(), []);
  
  const initialHeatRate = useMemo(() => estimateHeatInputRate(
    -20, // Initial temperature from first step (updated to match new default)
    0.1, // Initial pressure from first step (updated to match new default)
    ((initialSettings.traySizeCm2 || defaultSettings.traySizeCm2) / 10000) * 
    (initialSettings.numberOfTrays || defaultSettings.numberOfTrays)
  ), [initialSettings]);
  
  const [steps, setSteps] = useState<DryingStep[]>(defaultDryingSteps);
  
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
  
  useEffect(() => {
    setSavedSettingsKey(prev => prev + 1);
    console.log("Auth state changed in calculator, triggering saved settings reload");
  }, [isAuthenticated, user]);
  
  useEffect(() => {
    if (Object.keys(settings).length > 0) {
      saveAsDefaults(settings);
    }
  }, [settings]);
  
  const [selectedTerpenes, setSelectedTerpenes] = useState<string[]>(
    terpenes.slice(0, 5).map(t => t.name)
  );
  
  const handleLoadSavedSettings = (savedSettings: Partial<FreezeDryerSettings>, savedSteps: DryingStep[]) => {
    try {
      console.log("Loading saved settings:", savedSettings);
      console.log("Loading saved steps:", savedSteps);
      
      if (!savedSettings) {
        console.error("Saved settings is undefined or null");
        return;
      }
      
      if (savedSettings.hashPerTray !== undefined) {
        savedSettings.hashPerTray = Number(savedSettings.hashPerTray);
      }
      
      const savedSettingsCopy = JSON.parse(JSON.stringify(savedSettings));
      
      if (savedSettingsCopy.hashPerTray !== undefined) {
        savedSettingsCopy.hashPerTray = Number(savedSettingsCopy.hashPerTray);
      } else {
        savedSettingsCopy.hashPerTray = defaultSettings.hashPerTray;
      }
      
      if (savedSettingsCopy.waterPercentage === undefined) {
        savedSettingsCopy.waterPercentage = defaultSettings.waterPercentage;
      }
      
      if (savedSettingsCopy.trayLength === undefined) {
        savedSettingsCopy.trayLength = defaultSettings.trayLength;
      }
      if (savedSettingsCopy.trayWidth === undefined) {
        savedSettingsCopy.trayWidth = defaultSettings.trayWidth;
      }
      
      if (savedSettingsCopy.heatingPowerWatts === undefined) {
        savedSettingsCopy.heatingPowerWatts = defaultSettings.heatingPowerWatts;
      }
      
      const completeSteps = savedSteps.map(step => ({
        ...step,
        id: step.id || uuidv4(),
        pressureUnit: (step.pressureUnit === 'mBar' || step.pressureUnit === 'Torr') 
          ? step.pressureUnit 
          : 'mBar' as 'mBar' | 'Torr',
        tempUnit: (step.tempUnit === 'C' || step.tempUnit === 'F') 
          ? step.tempUnit 
          : 'C' as 'C' | 'F'
      }));
      
      setSettings(savedSettingsCopy);
      setSteps(completeSteps);
      
      saveAsDefaults(savedSettingsCopy);
    } catch (error) {
      console.error("Error loading saved settings:", error);
    }
  };
  
  const waterWeight = useMemo(() => {
    const hashPerTrayValue = settings.hashPerTray !== undefined ? settings.hashPerTray : defaultSettings.hashPerTray;
    const totalHashWeight = hashPerTrayValue * (settings.numberOfTrays || defaultSettings.numberOfTrays);
    const waterPercentageValue = settings.waterPercentage !== undefined ? settings.waterPercentage : defaultSettings.waterPercentage;
    
    const calculatedWaterWeight = calculateWaterWeight(totalHashWeight, waterPercentageValue);
    console.log(`Calculated water weight: ${calculatedWaterWeight}kg for ${settings.numberOfTrays} trays`);
    return calculatedWaterWeight;
  }, [settings.hashPerTray, settings.numberOfTrays, settings.waterPercentage]);
  
  useEffect(() => {
    setSettings(prevSettings => ({
      ...prevSettings,
      iceWeight: waterWeight
    }));
  }, [waterWeight]);
  
  const [chartUpdateKey, setChartUpdateKey] = useState<number>(0);
  
  useEffect(() => {
    setChartUpdateKey(prev => prev + 1);
  }, [waterWeight, settings.numberOfTrays, settings.heatingPowerWatts]);
  
  const progressCurve = useMemo(() => {
    if (!steps.length || waterWeight <= 0) return [] as SubTimePoint[];
    
    const uniqueKey = `${waterWeight.toFixed(5)}-${settings.numberOfTrays || 0}-${settings.heatingPowerWatts || 0}-${chartUpdateKey}`;
    
    console.log("Recalculating progress curve with key:", uniqueKey);
    console.log("Current water weight:", waterWeight, "kg");
    
    const calculationSettings: FreezeDryerSettings = {
      steps: [...steps],
      iceWeight: waterWeight,
      heatInputRate: settings.heatInputRate || 0,
      traySizeCm2: settings.traySizeCm2 || defaultSettings.traySizeCm2,
      numberOfTrays: settings.numberOfTrays || defaultSettings.numberOfTrays,
      trayLength: settings.trayLength || defaultSettings.trayLength,
      trayWidth: settings.trayWidth || defaultSettings.trayWidth,
      hashPerTray: settings.hashPerTray || defaultSettings.hashPerTray,
      waterPercentage: settings.waterPercentage || defaultSettings.waterPercentage,
      heatingPowerWatts: settings.heatingPowerWatts || defaultSettings.heatingPowerWatts
    };
    
    return calculateProgressCurve(calculationSettings);
  }, [
    steps, 
    waterWeight,
    settings.heatInputRate, 
    settings.traySizeCm2, 
    settings.numberOfTrays,
    settings.trayLength,
    settings.trayWidth,
    settings.hashPerTray,
    settings.waterPercentage,
    settings.heatingPowerWatts,
    forceUpdateKey,
    chartUpdateKey
  ]);
  
  const riskAssessment = useMemo(() => {
    if (!steps.length) return [];
    
    const risks = [];
    
    if (settings.waterPercentage && settings.waterPercentage > 90) {
      risks.push({
        type: "water",
        message: `Water content is ${settings.waterPercentage}%. Very high water content may extend drying time significantly.`
      });
    }

    if (progressCurve.length > 0) {
      const completedPercent = progressCurve[progressCurve.length - 1].progress;
      const isDryingIncomplete = completedPercent < 99;

      if (isDryingIncomplete) {
        risks.push({
          type: "drying",
          message: `Drying process will only be ${Math.round(completedPercent)}% complete. Consider increasing step duration or adding more drying steps.`
        });
      }
    }
    
    steps.forEach((step, index) => {
      const tempC = normalizeTemperature(step.temperature, step.tempUnit);
      const pressureMbar = normalizePressure(step.pressure, step.pressureUnit);
      
      const tempRisk = tempC > 30;
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
  }, [steps, settings.hashPerTray, settings.traySizeCm2, settings.numberOfTrays, settings.waterPercentage, progressCurve]);
  
  const [terpeneGuideUnit, setTerpeneGuideUnit] = useState<'C' | 'F'>('C');
  
  console.log("FreezeDryerCalculator render with:", {
    waterWeight,
    numberOfTrays: settings.numberOfTrays,
    progressCurveLength: progressCurve.length,
    chartUpdateKey
  });
  
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
                  <div className="flex justify-end">
                    <div className="w-80">
                      <TerpeneSelector
                        selectedTerpenes={selectedTerpenes}
                        onChange={setSelectedTerpenes}
                      />
                    </div>
                  </div>
                  
                  <TerpeneChart 
                    key={`chart-${chartUpdateKey}-${waterWeight.toFixed(3)}-${settings.numberOfTrays}`}
                    dryingData={progressCurve}
                    steps={steps}
                    displayUnit={displayUnit}
                    showTerpenes={selectedTerpenes}
                  />
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
              key={`summary-${chartUpdateKey}-${waterWeight.toFixed(3)}-${settings.numberOfTrays}`}
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
                <CardTitle>Pressure & Sublimation Efficiency</CardTitle>
                <CardDescription>
                  Understanding pressure's impact on sublimation rate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-2 text-center text-sm">
                  <div className="flex flex-col items-center p-2 bg-muted/50 rounded-md">
                    <span className="text-green-500 font-bold mb-1">High</span>
                    <span>0.1-1 mBar</span>
                  </div>
                  <div className="flex flex-col items-center p-2 bg-muted/50 rounded-md">
                    <span className="text-lime-500 font-bold mb-1">Good</span>
                    <span>1-10 mBar</span>
                  </div>
                  <div className="flex flex-col items-center p-2 bg-muted/50 rounded-md">
                    <span className="text-yellow-500 font-bold mb-1">Medium</span>
                    <span>10-100 mBar</span>
                  </div>
                  <div className="flex flex-col items-center p-2 bg-muted/50 rounded-md">
                    <span className="text-amber-500 font-bold mb-1">Low</span>
                    <span>{`>100 mBar`}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>Terpene Guide</CardTitle>
                <Toggle
                  pressed={terpeneGuideUnit === 'F'}
                  onPressedChange={(pressed) => setTerpeneGuideUnit(pressed ? 'F' : 'C')}
                  aria-label="Toggle temperature unit"
                  className="h-8"
                >
                  {terpeneGuideUnit}°
                </Toggle>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-1">
                  <p className="font-semibold">Terpene Boiling Points (at atmospheric pressure):</p>
                  <p className="text-muted-foreground text-xs mb-2">
                    All temperatures are measured at standard atmospheric pressure (1013.25 mbar)
                  </p>
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
                        <span>
                          {terpeneGuideUnit === 'C' 
                            ? `${terpene.boilingPoint}°C`
                            : `${Math.round(celsiusToFahrenheit(terpene.boilingPoint))}°F`
                          }
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Calculation Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-4 prose prose-sm max-w-none">
              <section>
                <h4 className="font-semibold">Chart Reading Guide</h4>
                <p>
                  <strong>How to read the chart:</strong> The solid blue line shows the temperature profile over time. 
                  The purple line shows the sublimation progress as a percentage. Dotted lines represent terpene boiling 
                  points at the current pressure. When the temperature line crosses a terpene's boiling point line, 
                  that terpene is at risk of loss.
                </p>
              </section>

              <section>
                <h4 className="font-semibold">Sublimation Process</h4>
                <p>
                  The freeze drying process involves sublimation, where ice transitions directly from solid to vapor state. 
                  The rate of sublimation (Rs) is calculated using the following equation:
                </p>
                <p className="font-mono bg-muted p-2 rounded">
                  Rs = (Q × t) / (m × Ls)
                </p>
                <p>Where:</p>
                <ul className="list-disc list-inside">
                  <li>Q = Heat input rate (kJ/hr)</li>
                  <li>t = Time (hours)</li>
                  <li>m = Mass of ice (kg)</li>
                  <li>Ls = Latent heat of sublimation (2835 kJ/kg)</li>
                </ul>
              </section>

              <section>
                <h4 className="font-semibold">Heat Transfer Rate</h4>
                <p>
                  Heat transfer rate (Q) is influenced by several factors:
                </p>
                <ul className="list-disc list-inside">
                  <li>Chamber pressure (affects heat transfer efficiency)</li>
                  <li>Temperature differential</li>
                  <li>Surface area of the product</li>
                  <li>Heating element power and efficiency</li>
                </ul>
                <p>
                  The effective heat transfer rate decreases as sublimation progresses due to the formation of a dried layer,
                  which acts as an insulator. This is accounted for using a progressive efficiency factor.
                </p>
              </section>

              <section>
                <h4 className="font-semibold">Progress Calculation</h4>
                <p>
                  The sublimation progress is calculated in small time increments:
                </p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Calculate effective heat rate for current conditions</li>
                  <li>Apply efficiency factor based on current progress</li>
                  <li>Calculate energy transferred in time segment</li>
                  <li>Convert energy to mass of ice sublimated</li>
                  <li>Update remaining ice and progress percentage</li>
                </ol>
                <p className="mt-2">
                  The efficiency factor diminishes as sublimation progresses according to:
                </p>
                <p className="font-mono bg-muted p-2 rounded">
                  efficiency = max(0.2, 1 - (progress/100)^0.7)
                </p>
              </section>

              <section>
                <h4 className="font-semibold">Temperature Effects</h4>
                <p>
                  Each terpene has a unique vapor pressure curve that determines its boiling point at different pressures.
                  This is calculated using the Antoine equation:
                </p>
                <p className="font-mono bg-muted p-2 rounded">
                  log₁₀(P) = A - (B / (C + T))
                </p>
                <p>Where:</p>
                <ul className="list-disc list-inside">
                  <li>P = Vapor pressure</li>
                  <li>T = Temperature (°C)</li>
                  <li>A, B, C = Antoine constants specific to each terpene</li>
                </ul>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
