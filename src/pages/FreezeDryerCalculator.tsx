
import { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DryingStepForm } from "@/components/freeze-dryer/DryingStepForm";
import { TerpeneChart } from "@/components/freeze-dryer/TerpeneChart";
import { TerpeneSelector } from "@/components/freeze-dryer/TerpeneSelector";
import { CalculationSettings } from "@/components/freeze-dryer/CalculationSettings";
import { ResultSummary } from "@/components/freeze-dryer/ResultSummary";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { terpenes } from "@/utils/terpeneData";
import { 
  DryingStep, 
  FreezeDryerSettings, 
  calculateProgressCurve,
  SubTimePoint,
  normalizeTemperature,
  normalizePressure
} from "@/utils/freezeDryerCalculations";
import { InfoIcon } from "lucide-react";
import { v4 as uuidv4 } from "@/utils/uuid";

export default function FreezeDryerCalculator() {
  // Temperature unit for display
  const [displayUnit, setDisplayUnit] = useState<'C' | 'F'>('C');
  
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
    iceWeight: 0.5,
    heatInputRate: 800
  });
  
  // Selected terpenes to display
  const [selectedTerpenes, setSelectedTerpenes] = useState<string[]>(
    terpenes.slice(0, 5).map(t => t.name)
  );
  
  // Calculate progress curve data
  const progressCurve = useMemo(() => {
    if (!steps.length || !settings.iceWeight) return [] as SubTimePoint[];
    
    return calculateProgressCurve({
      steps,
      iceWeight: settings.iceWeight || 0,
      heatInputRate: settings.heatInputRate || 0
    });
  }, [steps, settings.iceWeight, settings.heatInputRate]);
  
  // Check for potentially risky conditions (high temp/low pressure)
  const riskAssessment = useMemo(() => {
    if (!steps.length) return [];
    
    return steps.map((step, index) => {
      const tempC = normalizeTemperature(step.temperature, step.tempUnit);
      const pressureMbar = normalizePressure(step.pressure, step.pressureUnit);
      
      // High temperature risk (above 30°C)
      const tempRisk = tempC > 30;
      
      // Low pressure risk (below 50 mBar)
      const pressureRisk = pressureMbar < 50;
      
      return {
        stepIndex: index,
        tempRisk,
        pressureRisk,
        message: tempRisk && pressureRisk
          ? "High temperature and low pressure may cause significant terpene loss."
          : tempRisk 
            ? "High temperature may accelerate terpene evaporation."
            : pressureRisk
              ? "Very low pressure may extract some terpenes."
              : ""
      };
    }).filter(risk => risk.tempRisk || risk.pressureRisk);
  }, [steps]);
  
  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Freeze Dryer Calculator</h1>
          <p className="text-lg text-muted-foreground mt-2">
            Optimize your freeze drying process and preserve terpenes
          </p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-6 md:col-span-2">
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
            
            {riskAssessment.length > 0 && (
              <Alert variant="destructive">
                <InfoIcon className="h-4 w-4" />
                <AlertTitle>Potential Terpene Loss Detected</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    {riskAssessment.map((risk, idx) => (
                      <li key={idx}>
                        Step {risk.stepIndex + 1}: {risk.message}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            
            <Card>
              <CardHeader>
                <CardTitle>Drying and Terpene Visualization</CardTitle>
                <CardDescription>
                  Monitor sublimation progress and terpene preservation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="chart" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="chart">Chart</TabsTrigger>
                    <TabsTrigger value="info">Information</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="chart" className="space-y-4">
                    <div className="flex justify-end">
                      <div className="w-80">
                        <TerpeneSelector
                          selectedTerpenes={selectedTerpenes}
                          onChange={setSelectedTerpenes}
                        />
                      </div>
                    </div>
                    
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
          </div>
          
          <div className="space-y-6">
            <CalculationSettings
              settings={settings}
              onSettingsChange={setSettings}
              displayUnit={displayUnit}
              onDisplayUnitChange={setDisplayUnit}
            />
            
            <ResultSummary 
              progressCurve={progressCurve}
              displayUnit={displayUnit}
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
