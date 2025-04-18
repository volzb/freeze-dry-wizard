
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
  trayLength: number; // tray length in cm 
  trayWidth: number; // tray width in cm
  hashPerTray: number; // hash amount per tray in kg
  waterPercentage: number; // percentage of water in the hash
  chamberVolume?: number; // optional: freeze dryer chamber volume in liters
  condenserCapacity?: number; // optional: condenser capacity in kg of ice
  heatingPowerWatts: number; // heating element power in watts
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
  // Ensure waterPercentage is treated as a number
  const waterPercentageNum = Number(waterPercentage);
  
  // Make sure to round to a reasonable precision to avoid floating point issues
  const result = hashWeightKg * (waterPercentageNum / 100);
  console.log(`calculateWaterWeight: ${hashWeightKg} kg hash with ${waterPercentageNum}% water = ${result} kg water`);
  return result;
}

// Import heat transfer calculations
import { 
  estimateHeatInputRate as calculateHeatInput, 
  calculateHeatInputFromPower,
  estimateHeatTransferEfficiency 
} from './heatTransferCalculations';

// Calculate heat input rate based on temperature, pressure, and surface area
// Re-export the function for backward compatibility
export function estimateHeatInputRate(
  temperatureC: number,
  pressureMbar: number,
  totalShelfAreaM2: number = 0.5
): number {
  return calculateHeatInput(temperatureC, pressureMbar, totalShelfAreaM2);
}

// Define the interface for time points in the sublimation progress curve
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
  console.log("Progress Curve Calculation Settings:", {
    iceWeight: settings.iceWeight,
    heatInputRate: settings.heatInputRate,
    traySizeCm2: settings.traySizeCm2,
    numberOfTrays: settings.numberOfTrays,
    trayLength: settings.trayLength,
    trayWidth: settings.trayWidth,
    hashPerTray: settings.hashPerTray,
    waterPercentage: settings.waterPercentage,
    heatingPowerWatts: settings.heatingPowerWatts
  });

  const { steps, iceWeight } = settings;
  
  console.log("Calculating Progress Curve", { 
    stepsCount: steps?.length,
    iceWeight: iceWeight,
    numberOfTrays: settings.numberOfTrays,
    hashPerTray: settings.hashPerTray,
    waterPercentage: settings.waterPercentage
  });
  
  // Validate inputs
  if (!steps?.length || !iceWeight || iceWeight <= 0) {
    console.warn("Invalid input for progress curve calculation:", { 
      stepsValid: !!steps?.length,
      iceWeightValid: iceWeight && iceWeight > 0,
      iceWeight: iceWeight
    });
    return [];
  }

  // Calculate total shelf area in m²
  const totalShelfAreaM2 = ((settings.traySizeCm2 || 500) / 10000) * (settings.numberOfTrays || 1);
  console.log("Total shelf area:", totalShelfAreaM2, "m²");

  // Generate time points at step boundaries
  const stepTimes = calculateStepTimePoints(steps);
  const totalProgramTime = stepTimes[stepTimes.length - 1];
  
  // Calculate the heat input rates for each step
  const stepHeatRates: number[] = steps.map((step, index) => {
    const tempC = normalizeTemperature(step.temperature, step.tempUnit);
    const pressureMbar = normalizePressure(step.pressure, step.pressureUnit);
    
    if (settings.heatingPowerWatts) {
      const efficiency = estimateHeatTransferEfficiency(tempC, pressureMbar);
      return calculateHeatInputFromPower(
        settings.heatingPowerWatts, 
        settings.numberOfTrays || 1, 
        efficiency
      );
    } else {
      return settings.heatInputRate || 
        estimateHeatInputRate(tempC, pressureMbar, totalShelfAreaM2);
    }
  });
  
  // Calculate the total energy required for complete sublimation
  const totalEnergyRequired = iceWeight * LATENT_HEAT_SUBLIMATION; // kJ
  console.log("Total energy required for sublimation:", totalEnergyRequired, "kJ");
  
  // Determine maximum # of points for smooth curve
  const numPoints = Math.max(200, steps.length * 50); 
  const timeStep = totalProgramTime / (numPoints - 1);
  
  // Initialize the progress curve
  const progressCurve: SubTimePoint[] = [];
  
  // Initialize with first point at time 0
  const firstStep = steps[0];
  const firstTempC = normalizeTemperature(firstStep.temperature, firstStep.tempUnit);
  const firstPressureMbar = normalizePressure(firstStep.pressure, firstStep.pressureUnit);
  
  progressCurve.push({
    time: 0,
    progress: 0,
    step: 0,
    temperature: firstTempC,
    pressure: firstPressureMbar
  });
  
  // Track energy transferred and progress
  let totalEnergyTransferred = 0;
  let sublimationComplete = false;
  
  // Generate data points with specified time resolution
  for (let i = 1; i < numPoints; i++) {
    const currentTime = i * timeStep;
    
    // Find the current step based on time
    let currentStepIndex = 0;
    for (let j = 1; j < stepTimes.length; j++) {
      if (currentTime <= stepTimes[j]) {
        currentStepIndex = j - 1;
        break;
      }
    }
    
    // Get step parameters
    const step = steps[currentStepIndex];
    const tempC = normalizeTemperature(step.temperature, step.tempUnit);
    const pressureMbar = normalizePressure(step.pressure, step.pressureUnit);
    
    // Calculate time elapsed since previous point
    const timeElapsed = timeStep;
    
    // Get heat rate for the current step
    const baseHeatRate = stepHeatRates[currentStepIndex];
    
    // Calculate progress so far
    const currentProgress = (totalEnergyTransferred / totalEnergyRequired) * 100;
    
    // Apply diminishing efficiency as material dries
    // Higher progress means lower efficiency (0.8 to 0.2 range)
    const progressFactor = Math.max(0.2, 0.8 - (0.6 * (currentProgress / 100)));
    
    // Calculate effective heat rate with diminishing returns
    const effectiveHeatRate = baseHeatRate * progressFactor;
    
    // Calculate energy transferred in this time segment
    const energyTransferredInSegment = effectiveHeatRate * timeElapsed;
    
    if (!sublimationComplete) {
      totalEnergyTransferred += energyTransferredInSegment;
      
      // Check if sublimation is complete
      if (totalEnergyTransferred >= totalEnergyRequired) {
        sublimationComplete = true;
        totalEnergyTransferred = totalEnergyRequired; // Cap at 100%
      }
    }
    
    // Calculate progress as percentage
    const progress = (totalEnergyTransferred / totalEnergyRequired) * 100;
    
    // Add point to curve
    progressCurve.push({
      time: currentTime,
      progress: progress,
      step: currentStepIndex,
      temperature: tempC,
      pressure: pressureMbar
    });
  }
  
  // Ensure the last point is at exactly the total program time
  const lastStep = steps[steps.length - 1];
  const lastTempC = normalizeTemperature(lastStep.temperature, lastStep.tempUnit);
  const lastPressureMbar = normalizePressure(lastStep.pressure, lastStep.pressureUnit);
  
  // If last point isn't exactly at total time, add it
  const lastPoint = progressCurve[progressCurve.length - 1];
  if (Math.abs(lastPoint.time - totalProgramTime) > 0.001) {
    // Calculate final progress
    const finalProgress = (totalEnergyTransferred / totalEnergyRequired) * 100;
    
    progressCurve.push({
      time: totalProgramTime,
      progress: finalProgress,
      step: steps.length - 1,
      temperature: lastTempC,
      pressure: lastPressureMbar
    });
  }
  
  console.log("Generated progress curve with", progressCurve.length, "points");
  console.log("Final progress:", progressCurve[progressCurve.length - 1].progress.toFixed(2) + "%");
  
  return progressCurve;
}
