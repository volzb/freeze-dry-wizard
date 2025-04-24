
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

// Define the interface for time points in the sublimation progress curve
export interface SubTimePoint {
  time: number; // accumulated time in hours
  progress: number; // percentage of ice sublimated
  step: number; // drying step index
  temperature: number; // in celsius
  pressure: number; // in mbar
  sublimationRate: number; // in g/hour or % per hour
  waterRemoved: number; // total grams removed
  remainingWater: number; // grams remaining
  estimatedRemainingTime?: number; // estimated hours to completion
  stageProgress: number; // Progress within the current stage
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
  // Ensure parameters are treated as numbers
  const hashWeightKgNum = Number(hashWeightKg);
  const waterPercentageNum = Number(waterPercentage);
  
  // Make sure to round to a reasonable precision to avoid floating point issues
  const result = hashWeightKgNum * (waterPercentageNum / 100);
  console.log(`calculateWaterWeight: ${hashWeightKgNum} kg hash with ${waterPercentageNum}% water = ${result} kg water`);
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

// Generate a unique calculation ID to help with memoization and cache busting
export function generateCalculationId(settings: FreezeDryerSettings): string {
  const { iceWeight, numberOfTrays, waterPercentage, hashPerTray, heatingPowerWatts, steps } = settings;
  
  // Create a string that captures all the important parameters that would affect calculations
  // Ensure numeric values are properly formatted
  return `${Number(iceWeight).toFixed(5)}-${Number(numberOfTrays)}-${Number(waterPercentage)}-${Number(hashPerTray).toFixed(5)}-${Number(heatingPowerWatts)}-${steps.length}`;
}

// Calculate progress curve with enhanced stage-specific calculations
export function calculateProgressCurve(
  settings: FreezeDryerSettings
): SubTimePoint[] {
  // Generate a calculation ID for debugging
  const calculationId = generateCalculationId(settings);
  
  // Explicitly convert all numeric values to ensure consistent calculations
  const settingsNormalized = {
    ...settings,
    iceWeight: Number(settings.iceWeight),
    heatInputRate: Number(settings.heatInputRate),
    traySizeCm2: Number(settings.traySizeCm2),
    numberOfTrays: Number(settings.numberOfTrays),
    trayLength: Number(settings.trayLength),
    trayWidth: Number(settings.trayWidth),
    hashPerTray: Number(settings.hashPerTray),
    waterPercentage: Number(settings.waterPercentage),
    heatingPowerWatts: Number(settings.heatingPowerWatts)
  };
  
  console.log(`Starting Progress Curve Calculation (ID: ${calculationId}):`, {
    iceWeight: settingsNormalized.iceWeight,
    heatInputRate: settingsNormalized.heatInputRate,
    heatingPowerWatts: settingsNormalized.heatingPowerWatts,
    numberOfTrays: settingsNormalized.numberOfTrays,
    totalPower: settingsNormalized.heatingPowerWatts * settingsNormalized.numberOfTrays,
    timestamp: new Date().toISOString()
  });

  const { steps } = settingsNormalized;
  const iceWeight = Number(settingsNormalized.iceWeight);
  
  // Log key water parameters
  console.log(`Water Calculation Parameters (ID: ${calculationId}):`, { 
    iceWeight,
    numberOfTrays: settingsNormalized.numberOfTrays,
    hashPerTray: settingsNormalized.hashPerTray,
    waterPercentage: settingsNormalized.waterPercentage,
    totalHashWeight: settingsNormalized.hashPerTray * settingsNormalized.numberOfTrays,
    calculatedWaterWeight: calculateWaterWeight(
      settingsNormalized.hashPerTray * settingsNormalized.numberOfTrays, 
      settingsNormalized.waterPercentage
    ),
    timestamp: new Date().toISOString()
  });
  
  // Validate inputs
  if (!steps?.length || !iceWeight || iceWeight <= 0) {
    console.warn(`Invalid input for progress curve calculation (ID: ${calculationId}):`, { 
      stepsLength: !!steps?.length,
      iceWeightValid: iceWeight && iceWeight > 0,
      iceWeight,
      timestamp: new Date().toISOString()
    });
    return [];
  }

  // Calculate total shelf area in m²
  const totalShelfAreaM2 = ((settingsNormalized.traySizeCm2 || 500) / 10000) * (settingsNormalized.numberOfTrays || 1);
  console.log(`Total shelf area (ID: ${calculationId}): ${totalShelfAreaM2} m²`);

  // Generate time points at step boundaries
  const stepTimes = calculateStepTimePoints(steps);
  const totalProgramTime = stepTimes[stepTimes.length - 1];
  
  // Calculate the heat input rates for each step based on heating power
  const stepHeatRates: number[] = steps.map((step, index) => {
    const tempC = normalizeTemperature(step.temperature, step.tempUnit);
    const pressureMbar = normalizePressure(step.pressure, step.pressureUnit);
    
    // Enhanced logging for step heat rate calculation
    console.log(`Calculating heat rate for step ${index + 1}:`, {
      stepIndex: index,
      tempC,
      pressureMbar,
      heatingPowerWatts: settingsNormalized.heatingPowerWatts,
      numberOfTrays: settingsNormalized.numberOfTrays,
      timestamp: new Date().toISOString()
    });
    
    let heatRate;
    const efficiency = estimateHeatTransferEfficiency(tempC, pressureMbar);
    
    // Always prioritize power-based calculation when heating power is available
    if (settingsNormalized.heatingPowerWatts && settingsNormalized.heatingPowerWatts > 0) {
      heatRate = calculateHeatInputFromPower(
        settingsNormalized.heatingPowerWatts, 
        settingsNormalized.numberOfTrays || 1, 
        efficiency
      );
    } else {
      // Fallback to area-based calculation
      heatRate = estimateHeatInputRate(tempC, pressureMbar, totalShelfAreaM2);
    }
    
    console.log(`Step ${index + 1} heat rate:`, {
      tempC,
      pressureMbar,
      heatRate,
      heatingPowerWatts: settingsNormalized.heatingPowerWatts,
      numberOfTrays: settingsNormalized.numberOfTrays,
      efficiency,
      timestamp: new Date().toISOString()
    });
    
    return heatRate;
  });

  // Calculate stage-specific water removal targets based on heat rates
  // This makes targets directly proportional to the heat input for each step
  const stageWaterTargets: number[] = [];
  const totalHeatEnergy = stepHeatRates.reduce((sum, rate, index) => {
    // Convert rates to total energy by multiplying by step duration
    const stepDurationHours = steps[index].duration / 60;
    return sum + (rate * stepDurationHours);
  }, 0);
  
  console.log('Total heat energy for all steps:', totalHeatEnergy, 'kJ');
  
  let remainingWater = iceWeight;
  steps.forEach((step, index) => {
    const stepDurationHours = step.duration / 60;
    const stepEnergy = stepHeatRates[index] * stepDurationHours;
    const stepWaterTarget = (iceWeight * stepEnergy) / totalHeatEnergy;
    
    // Cap water removal to not exceed remaining water
    const actualStepWaterTarget = Math.min(remainingWater, stepWaterTarget);
    stageWaterTargets.push(actualStepWaterTarget);
    remainingWater -= actualStepWaterTarget;
    
    console.log(`Step ${index + 1} water removal target:`, {
      stepDurationHours,
      stepHeatRate: stepHeatRates[index],
      stepEnergy,
      stepWaterTarget,
      actualStepWaterTarget,
      remainingWater,
      timestamp: new Date().toISOString()
    });
  });

  // Adjust final stage to account for any remaining water
  if (remainingWater > 0 && stageWaterTargets.length > 0) {
    stageWaterTargets[stageWaterTargets.length - 1] += remainingWater;
    console.log(`Added remaining water (${remainingWater} kg) to final step target`);
  }

  console.log('Stage water removal targets:', stageWaterTargets);

  // Initialize progress tracking with enhanced logging
  let totalWaterRemoved = 0;
  let currentStageWaterRemoved = 0;
  let lastStepIndex = 0;

  // Generate progress curve points
  const progressCurve: SubTimePoint[] = [];

  // Initialize with first point at time 0
  const firstStep = steps[0];
  const firstTempC = normalizeTemperature(firstStep.temperature, firstStep.tempUnit);
  const firstPressureMbar = normalizePressure(firstStep.pressure, firstStep.pressureUnit);
  
  // Convert ice weight to grams for rate calculations
  const iceWeightGrams = iceWeight * 1000;
  
  progressCurve.push({
    time: 0,
    progress: 0,
    step: 0,
    temperature: firstTempC,
    pressure: firstPressureMbar,
    sublimationRate: 0,
    waterRemoved: 0,
    remainingWater: iceWeightGrams,
    estimatedRemainingTime: undefined,
    stageProgress: 0
  });

  // Track energy transferred and progress with power-based calculations
  let sublimationComplete = false;

  // Determine maximum # of points for smooth curve
  const numPoints = Math.max(200, steps.length * 50); 
  const timeStep = totalProgramTime / (numPoints - 1);

  // Calculate time points with varying rates
  for (let i = 1; i < numPoints; i++) {
    const currentTime = i * timeStep;
    
    // Find current step
    let currentStepIndex = 0;
    for (let j = 1; j < stepTimes.length; j++) {
      if (currentTime <= stepTimes[j]) {
        currentStepIndex = j - 1;
        break;
      }
      if (j === stepTimes.length - 1) {
        currentStepIndex = j; // Last step
      }
    }

    // Reset stage progress when moving to new stage
    if (currentStepIndex !== lastStepIndex) {
      currentStageWaterRemoved = 0;
      lastStepIndex = currentStepIndex;
      console.log(`Moving to step ${currentStepIndex + 1} at time ${currentTime.toFixed(2)} hours`);
    }

    const step = steps[currentStepIndex];
    const tempC = normalizeTemperature(step.temperature, step.tempUnit);
    const pressureMbar = normalizePressure(step.pressure, step.pressureUnit);
    
    // Calculate stage-specific sublimation rate based on power and step water target
    const baseHeatRate = stepHeatRates[currentStepIndex];
    const stageTarget = stageWaterTargets[currentStepIndex];
    const stepDurationHours = step.duration / 60;
    
    // Calculate how far we are into this step
    const stepStartTime = currentStepIndex > 0 ? stepTimes[currentStepIndex] : 0;
    const relativeStepTime = currentTime - stepStartTime;
    const stepProgress = Math.min(1, relativeStepTime / stepDurationHours);
    
    // Apply diminishing efficiency within the stage based on progress
    // More efficient at start, less at end
    const stageEfficiency = Math.max(0.15, 0.7 - (0.55 * Math.pow(stepProgress, 0.8)));
    const effectiveHeatRate = baseHeatRate * stageEfficiency;
    
    // Calculate water removed in this time segment based on heat rate
    const waterRemovedInSegment = (effectiveHeatRate * timeStep / LATENT_HEAT_SUBLIMATION) * 1000; // Convert to grams
    
    // Track water removed for this step and overall
    currentStageWaterRemoved += waterRemovedInSegment;
    totalWaterRemoved += waterRemovedInSegment;
    
    // Cap total water removed to not exceed ice weight
    const cappedTotalWaterRemoved = Math.min(totalWaterRemoved, iceWeightGrams);
    
    // Calculate progress metrics
    const overallProgress = (cappedTotalWaterRemoved / iceWeightGrams) * 100;
    const stageProgress = stageTarget > 0 ? Math.min(100, (currentStageWaterRemoved / (stageTarget * 1000)) * 100) : 0;
    
    // Calculate instantaneous sublimation rate (g/hr)
    const sublimationRate = waterRemovedInSegment / timeStep;
    
    // Calculate remaining water
    const remainingWater = Math.max(0, iceWeightGrams - cappedTotalWaterRemoved);
    
    // Estimate remaining time
    let estimatedRemainingTime: number | undefined = undefined;
    if (sublimationRate > 0 && remainingWater > 0) {
      estimatedRemainingTime = remainingWater / sublimationRate;
    }
    
    // Add enhanced logging for debugging
    if (i % Math.floor(numPoints / 10) === 0 || i === numPoints - 1) {
      console.log(`Progress point ${i}/${numPoints}:`, {
        time: currentTime,
        progress: overallProgress,
        sublimationRate,
        effectiveHeatRate,
        stageEfficiency,
        waterRemoved: cappedTotalWaterRemoved,
        timestamp: new Date().toISOString()
      });
    }
    
    // Add point to curve
    progressCurve.push({
      time: currentTime,
      progress: Math.min(100, overallProgress),
      step: currentStepIndex,
      temperature: tempC,
      pressure: pressureMbar,
      sublimationRate: sublimationRate,
      waterRemoved: cappedTotalWaterRemoved,
      remainingWater: remainingWater,
      estimatedRemainingTime: estimatedRemainingTime,
      stageProgress: Math.min(100, stageProgress)
    });
    
    // Stop if we've reached 100% or close to it
    if (overallProgress >= 99.99) {
      console.log(`Sublimation complete at time ${currentTime.toFixed(2)} hours`);
      sublimationComplete = true;
      break;
    }
  }

  // Ensure the last point is at exactly the total program time if we didn't complete
  if (!sublimationComplete) {
    const lastStep = steps[steps.length - 1];
    const lastTempC = normalizeTemperature(lastStep.temperature, lastStep.tempUnit);
    const lastPressureMbar = normalizePressure(lastStep.pressure, lastStep.pressureUnit);
    
    // Use waterRemoved value to calculate final progress accurately
    const finalProgress = Math.min(100, (totalWaterRemoved / iceWeightGrams) * 100);
    
    const lastPointTime = progressCurve[progressCurve.length - 1].time;
    if (Math.abs(lastPointTime - totalProgramTime) > 0.001) {
      progressCurve.push({
        time: totalProgramTime,
        progress: finalProgress,
        step: steps.length - 1,
        temperature: lastTempC,
        pressure: lastPressureMbar,
        sublimationRate: 0, // At the end, rate becomes zero
        waterRemoved: totalWaterRemoved,
        remainingWater: Math.max(0, iceWeightGrams - totalWaterRemoved),
        estimatedRemainingTime: 0,
        stageProgress: 100
      });
    }
  }
  
  console.log(`Generated progress curve (ID: ${calculationId}) with ${progressCurve.length} points`);
  console.log(`Final progress (ID: ${calculationId}): ${progressCurve[progressCurve.length - 1].progress.toFixed(2)}%`, {
    iceWeight,
    waterRemoved: progressCurve[progressCurve.length - 1].waterRemoved,
    timestamp: new Date().toISOString()
  });
  
  return progressCurve;
}
