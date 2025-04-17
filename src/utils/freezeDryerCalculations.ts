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
  return hashWeightKg * (waterPercentage / 100);
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
  let lastHeatRate = 0;
  
  // Add starting point at time 0
  const firstStep = steps[0];
  const firstTempC = normalizeTemperature(firstStep.temperature, firstStep.tempUnit);
  const firstPressureMbar = normalizePressure(firstStep.pressure, firstStep.pressureUnit);
  
  // Calculate initial heat rate - considering the heating power per tray if provided
  let initialHeatRate;
  if (settings.heatingPowerWatts) {
    // Use per-tray heating power calculation
    const efficiency = estimateHeatTransferEfficiency(firstTempC, firstPressureMbar);
    initialHeatRate = calculateHeatInputFromPower(
      settings.heatingPowerWatts, 
      settings.numberOfTrays || 1, 
      efficiency
    );
  } else {
    initialHeatRate = settings.heatInputRate || 
      estimateHeatInputRate(firstTempC, firstPressureMbar, totalShelfAreaM2);
  }
  lastHeatRate = initialHeatRate;
  
  // Determine efficiency reduction factor
  // This simulates how sublimation becomes less efficient over time
  const efficiencyReductionFactor = 1.5; // Increase for more realistic slower progression
  
  // Calculate theoretical completion time (in hours)
  const theoreticalCompletionTime = calculateSubTimeInHours(iceWeight, initialHeatRate);
  console.log("Theoretical completion time:", theoreticalCompletionTime.toFixed(2), "hours");
  
  // Initialize the first point at time 0 before entering the loop
  points.push({
    time: 0,
    progress: 0,
    step: 0,
    temperature: firstTempC,
    pressure: firstPressureMbar,
  });
  
  // Generate data points with fine time resolution, ensuring we include the full total time
  for (let i = 1; i <= numPoints; i++) {
    // Using <= ensures we include the last point exactly at totalTime
    const currentTime = i < numPoints ? i * timeStep : totalTime;
    
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
    
    // Calculate heat rate for this step with a more realistic model
    const baseHeatRate = settings.heatInputRate || 
      estimateHeatInputRate(tempC, pressureMbar, totalShelfAreaM2);
    
    // Apply diminishing returns as sublimation progresses
    // The closer we get to 100% sublimation, the slower the process becomes
    const progressFactor = Math.max(0.2, 1 - Math.pow(previousTimePoint.progress / 100, 0.7));
    
    // Apply efficiency factor considering how heat transfer becomes less efficient as the material dries
    const effectiveHeatRate = baseHeatRate * progressFactor;
    lastHeatRate = effectiveHeatRate;
    
    // Energy transferred during this time segment
    const energyTransferred = effectiveHeatRate * timeInStep; // kJ
    
    // Ice sublimated during this time segment
    const iceSublimated = Math.min(remainingIce, energyTransferred / LATENT_HEAT_SUBLIMATION); // kg
    remainingIce = Math.max(0, remainingIce - iceSublimated);
    
    // Calculate progress percentage
    const progress = ((iceWeight - remainingIce) / iceWeight) * 100;
    
    // Add the point with this step's temperature
    points.push({
      time: currentTime,
      progress: Math.min(100, progress), // Cap at 100%
      step: currentStepIndex,
      temperature: tempC,
      pressure: pressureMbar,
    });
    
    // If we've reached 100% sublimation, adjust remaining points to maintain 100%
    if (remainingIce <= 0 && i < numPoints) {
      console.log(`100% sublimation reached at ${currentTime.toFixed(2)} hours (point ${i} of ${numPoints})`);
      
      // Add data points for the rest of the time with 100% progress
      for (let j = i + 1; j <= numPoints; j++) {
        const remainingTime = j === numPoints ? totalTime : j * timeStep;
        
        // Find step for this time
        let stepIndex = 0;
        for (let k = 1; k < stepTimes.length; k++) {
          if (remainingTime <= stepTimes[k]) {
            stepIndex = k - 1;
            break;
          }
        }
        
        const currentStep = steps[stepIndex];
        const stepTempC = normalizeTemperature(currentStep.temperature, currentStep.tempUnit);
        const stepPressureMbar = normalizePressure(currentStep.pressure, currentStep.pressureUnit);
        
        points.push({
          time: remainingTime,
          progress: 100,
          step: stepIndex,
          temperature: stepTempC,
          pressure: stepPressureMbar,
        });
      }
      break;
    }
  }
  
  // Ensure the last point is exactly at totalTime with correct step values
  const lastStep = steps[steps.length - 1];
  const lastTempC = normalizeTemperature(lastStep.temperature, lastStep.tempUnit);
  const lastPressureMbar = normalizePressure(lastStep.pressure, lastStep.pressureUnit);
  
  // Check if the last point is already at totalTime
  const lastPoint = points[points.length - 1];
  if (Math.abs(lastPoint.time - totalTime) > 0.001) {
    // Add the final point if it's not already there
    const finalProgress = ((iceWeight - remainingIce) / iceWeight) * 100;
    points.push({
      time: totalTime,
      progress: finalProgress,
      step: steps.length - 1,
      temperature: lastTempC,
      pressure: lastPressureMbar,
    });
  }
  
  console.log(`Final ice remaining: ${remainingIce.toFixed(3)}kg (${((remainingIce/iceWeight) * 100).toFixed(1)}% remains)`);
  console.log("Final progress curve points:", points.length);
  if (points.length > 0) {
    console.log("Last point:", points[points.length - 1]);
  }
  
  return points;
}
