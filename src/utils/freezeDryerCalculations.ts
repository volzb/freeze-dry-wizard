
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
  const normalizedPressure = Math.max(0.1, Math.min(1000, pressureMbar));
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

// Helper to calculate exact time points for each drying step
export function calculateStepTimePoints(steps: DryingStep[]): number[] {
  const timePoints: number[] = [0]; // Start at time 0
  let accumulatedTime = 0;
  
  steps.forEach(step => {
    accumulatedTime += step.duration / 60; // Convert minutes to hours
    timePoints.push(accumulatedTime);
  });
  
  return timePoints;
}

// Calculate dense progress curve with many data points
export function calculateProgressCurve(
  settings: FreezeDryerSettings
): SubTimePoint[] {
  const { steps, iceWeight } = settings;
  
  console.log("Calculating Progress Curve", { 
    stepsCount: steps?.length,
    iceWeight: iceWeight,
    steps: steps.map(step => ({
      temperature: step.temperature,
      tempUnit: step.tempUnit,
      duration: step.duration,
      pressure: step.pressure,
      pressureUnit: step.pressureUnit
    }))
  });
  
  if (!steps?.length || !iceWeight || iceWeight <= 0) {
    console.warn("Invalid input for progress curve calculation:", { 
      stepsValid: !!steps?.length,
      iceWeightValid: iceWeight && iceWeight > 0 
    });
    return [];
  }

  // Calculate total shelf area in m²
  const totalShelfAreaM2 = ((settings.traySizeCm2 || 500) / 10000) * (settings.numberOfTrays || 1);
  console.log("Total shelf area:", totalShelfAreaM2, "m²");

  // Generate exact step time boundaries
  const stepTimes = calculateStepTimePoints(steps);
  const totalTime = stepTimes[stepTimes.length - 1];
  
  // Calculate with many points for a smoother curve
  const numPoints = Math.max(200, steps.length * 50); // More points for a smooth curve
  const timeStep = totalTime / (numPoints - 1);
  
  const points: SubTimePoint[] = [];
  let remainingIce = iceWeight;
  
  // Add starting point at time 0
  const firstStep = steps[0];
  const firstTempC = normalizeTemperature(firstStep.temperature, firstStep.tempUnit);
  const firstPressureMbar = normalizePressure(firstStep.pressure, firstStep.pressureUnit);
  
  points.push({
    time: 0,
    progress: 0,
    step: 0,
    temperature: firstTempC,
    pressure: firstPressureMbar,
  });
  
  // Generate data points with fine time resolution
  for (let i = 1; i < numPoints; i++) {
    const currentTime = i * timeStep;
    
    // Find current step
    let currentStepIndex = 0;
    for (let j = 1; j < stepTimes.length; j++) {
      if (currentTime <= stepTimes[j]) {
        currentStepIndex = j - 1;
        break;
      }
    }
    
    const step = steps[currentStepIndex];
    const tempC = normalizeTemperature(step.temperature, step.tempUnit);
    const pressureMbar = normalizePressure(step.pressure, step.pressureUnit);
    
    // Time spent in this specific step
    const previousTimePoint = points[points.length - 1];
    const timeInStep = currentTime - previousTimePoint.time;
    
    // Calculate heat rate and sublimation for this time segment
    const heatRate = settings.heatInputRate || 
      estimateHeatInputRate(tempC, pressureMbar, totalShelfAreaM2);
    
    // Energy transferred during this time segment
    const energyTransferred = heatRate * timeInStep; // kJ
    
    // Ice sublimated during this time segment
    const iceSublimated = Math.min(remainingIce, energyTransferred / LATENT_HEAT_SUBLIMATION); // kg
    remainingIce = Math.max(0, remainingIce - iceSublimated);
    
    // Calculate progress percentage
    const progress = ((iceWeight - remainingIce) / iceWeight) * 100;
    
    // Add the point with this step's temperature
    points.push({
      time: currentTime,
      progress: progress,
      step: currentStepIndex,
      temperature: tempC,
      pressure: pressureMbar,
    });
  }
  
  console.log(`Final ice remaining: ${remainingIce.toFixed(3)}kg (${((remainingIce/iceWeight) * 100).toFixed(1)}% remains)`);
  console.log("Final progress curve points:", points.length);
  if (points.length > 0) {
    console.log("Last point:", points[points.length - 1]);
  }
  
  return points;
}
