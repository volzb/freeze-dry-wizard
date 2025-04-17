
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
  traySizeCm2: number; // tray size in square centimeters
  numberOfTrays: number; // number of trays used
  trayLength?: number; // tray length in cm 
  trayWidth?: number; // tray width in cm
  hashPerTray?: number; // hash amount per tray in kg
  waterPercentage?: number; // percentage of water in the hash
  chamberVolume?: number; // optional: freeze dryer chamber volume in liters
  condenserCapacity?: number; // optional: condenser capacity in kg of ice
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

// Calculate water weight based on hash weight and water percentage
export function calculateWaterWeight(hashWeightKg: number, waterPercentage: number): number {
  return hashWeightKg * (waterPercentage / 100);
}

// Calculate heat input rate based on temperature, pressure, and surface area
export function estimateHeatInputRate(
  temperatureC: number,
  pressureMbar: number,
  totalShelfAreaM2: number = 0.5 // Total shelf area in m²
): number {
  // Base rate per square meter at reference conditions
  const baseRatePerM2 = 800; // Base heat transfer rate in kJ/hr/m²
  
  // Temperature factor - higher temperature increases heat transfer
  // Normalized for -40°C to +20°C range
  const normalizedTemp = Math.max(-40, Math.min(20, temperatureC));
  const tempFactor = 1 + (normalizedTemp + 40) / 60;
  
  // Pressure factor - lower pressure decreases heat transfer
  // More significant effect at very low pressures
  const normalizedPressure = Math.min(1000, pressureMbar);
  const pressureFactor = normalizedPressure <= 100 
    ? 0.5 + (normalizedPressure / 200) // More pronounced effect at very low pressures
    : 0.5 + (normalizedPressure / 2000) + 0.25; // Less pronounced effect at higher pressures
  
  // Thermal conductivity factor
  // This could be expanded with actual material properties in a more complex model
  const conductivityFactor = 1.0;
  
  // Surface area factor - directly proportional to heat transfer
  return baseRatePerM2 * tempFactor * pressureFactor * conductivityFactor * totalShelfAreaM2;
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
  settings: FreezeDryerSettings
): SubTimePoint[] {
  const { steps, iceWeight } = settings;
  if (!steps.length || iceWeight <= 0) return [];

  // Calculate total shelf area in m²
  const totalShelfAreaM2 = ((settings.traySizeCm2 || 500) / 10000) * (settings.numberOfTrays || 1);

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
    
    // Calculate heat rate based on current settings
    const heatRate = settings.heatInputRate || 
      estimateHeatInputRate(tempC, pressureMbar, totalShelfAreaM2);
    
    const stepDurationHr = step.duration / 60;
    
    // Energy transferred during this step
    const energyTransferred = heatRate * stepDurationHr; // kJ
    
    // Ice sublimated during this step
    const iceSublimated = Math.min(remainingIce, energyTransferred / LATENT_HEAT_SUBLIMATION); // kg
    remainingIce = Math.max(0, remainingIce - iceSublimated);
    
    // Explicitly calculate water removal percentage
    const progress = ((iceWeight - remainingIce) / iceWeight) * 100;
    
    console.log(`Step ${index + 1}: Ice remaining: ${remainingIce}kg, Progress: ${progress.toFixed(1)}%`);
    
    accumulatedTime += stepDurationHr;
    
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
    
    // Calculate heat rate based on current settings
    const heatRate = settings.heatInputRate || 
      estimateHeatInputRate(tempC, pressureMbar, totalShelfAreaM2);
    
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
  
  console.log("Final progress curve points:", points.length);
  console.log("Last point:", points[points.length - 1]);
  
  return points;
}
