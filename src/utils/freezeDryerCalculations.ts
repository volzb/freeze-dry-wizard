
// Constants for freeze drying calculations
export const LATENT_HEAT_SUBLIMATION = 2835; // kJ/kg for ice

export interface DryingStep {
  id: string;
  temperature: number; // in celsius
  pressure: number; // in mBar
  duration: number; // in minutes
  tempUnit: 'C' | 'F';
  pressureUnit: 'mBar' | 'Torr';
}

export interface FreezeDryerSettings {
  steps: DryingStep[];
  iceWeight: number; // in kg
  heatInputRate: number; // in kJ/hr
}

// Convert temperature based on unit
export function normalizeTemperature(temperature: number, unit: 'C' | 'F'): number {
  if (unit === 'F') {
    return (temperature - 32) * 5/9; // Convert to Celsius
  }
  return temperature;
}

// Convert pressure based on unit
export function normalizePressure(pressure: number, unit: 'mBar' | 'Torr'): number {
  if (unit === 'Torr') {
    return pressure * 1.33322; // Convert to mBar
  }
  return pressure;
}

// Calculate time to complete sublimation in hours
export function calculateSubTimeInHours(iceWeightKg: number, heatInputRateKJHr: number): number {
  if (heatInputRateKJHr <= 0) return 0;
  return (iceWeightKg * LATENT_HEAT_SUBLIMATION) / heatInputRateKJHr;
}

// Calculate heat input rate based on temperature, pressure, and surface area
export function estimateHeatInputRate(
  temperatureC: number,
  pressureMbar: number,
  shelfAreaM2: number = 0.5 // Default shelf area in m²
): number {
  // This is a simplified model - in real applications this would be more complex
  // and would depend on the specific freeze dryer characteristics
  const baseRate = 500; // Base heat transfer rate in kJ/hr
  
  // Temperature factor - higher temperature increases heat transfer
  const tempFactor = 1 + (temperatureC + 40) / 60; // Normalize temp from -40°C to +20°C
  
  // Pressure factor - lower pressure decreases heat transfer
  const pressureFactor = 0.5 + (Math.min(pressureMbar, 1000) / 2000);
  
  // Surface area factor
  const areaFactor = shelfAreaM2;
  
  return baseRate * tempFactor * pressureFactor * areaFactor;
}

// Calculate the sublimation progress over time for each drying step
export interface SubTimePoint {
  time: number; // accumulated time in hours
  progress: number; // percentage of ice sublimated
  step: number; // drying step index
  temperature: number; // in celsius
  pressure: number; // in mbar
}

export function calculateProgressCurve(
  settings: FreezeDryerSettings,
  shelfAreaM2: number = 0.5
): SubTimePoint[] {
  const { steps, iceWeight } = settings;
  if (!steps.length || iceWeight <= 0) return [];

  let remainingIce = iceWeight;
  let accumulatedTime = 0;
  const points: SubTimePoint[] = [];
  const totalEnergy = iceWeight * LATENT_HEAT_SUBLIMATION; // kJ
  
  // Add starting point
  points.push({
    time: 0,
    progress: 0,
    step: 0,
    temperature: normalizeTemperature(steps[0].temperature, steps[0].tempUnit),
    pressure: normalizePressure(steps[0].pressure, steps[0].pressureUnit),
  });
  
  // Process each step
  steps.forEach((step, index) => {
    const tempC = normalizeTemperature(step.temperature, step.tempUnit);
    const pressureMbar = normalizePressure(step.pressure, step.pressureUnit);
    const heatRate = estimateHeatInputRate(tempC, pressureMbar, shelfAreaM2); // kJ/hr
    const stepDurationHr = step.duration / 60;
    
    // Energy transferred during this step
    const energyTransferred = heatRate * stepDurationHr; // kJ
    
    // Ice sublimated during this step
    const iceSublimated = Math.min(remainingIce, energyTransferred / LATENT_HEAT_SUBLIMATION); // kg
    remainingIce = Math.max(0, remainingIce - iceSublimated);
    
    accumulatedTime += stepDurationHr;
    const progress = ((iceWeight - remainingIce) / iceWeight) * 100;
    
    points.push({
      time: accumulatedTime,
      progress: progress,
      step: index,
      temperature: tempC,
      pressure: pressureMbar,
    });
  });
  
  // If there's still ice remaining, estimate time to completion with last step settings
  if (remainingIce > 0 && steps.length > 0) {
    const lastStep = steps[steps.length - 1];
    const tempC = normalizeTemperature(lastStep.temperature, lastStep.tempUnit);
    const pressureMbar = normalizePressure(lastStep.pressure, lastStep.pressureUnit);
    const heatRate = estimateHeatInputRate(tempC, pressureMbar, shelfAreaM2);
    
    // Additional time needed to sublimate remaining ice
    const additionalTimeHr = (remainingIce * LATENT_HEAT_SUBLIMATION) / heatRate;
    accumulatedTime += additionalTimeHr;
    
    points.push({
      time: accumulatedTime,
      progress: 100,
      step: steps.length - 1,
      temperature: tempC,
      pressure: pressureMbar,
    });
  }
  
  return points;
}
