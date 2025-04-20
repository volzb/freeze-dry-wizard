
// Constants
const WATTS_TO_KJ_PER_HOUR = 3.6; // 1 Watt = 3.6 kJ/hr
const HEAT_TRANSFER_ADJUSTMENT = 0.6; // Global adjustment factor to account for real-world inefficiencies

/**
 * Calculate heat input rate based on heating element power and efficiency
 * @param heatingPowerWatts Power of heating elements in watts
 * @param numberOfTrays Number of trays being used
 * @param efficiency Efficiency of heat transfer (0 to 1)
 * @returns Heat input rate in kJ/hr
 */
export function calculateHeatInputFromPower(
  heatingPowerWatts: number,
  numberOfTrays: number = 1,
  efficiency: number = 0.85 // Default efficiency of 85%
): number {
  // Total power is per-tray wattage multiplied by number of trays
  const totalPower = heatingPowerWatts * numberOfTrays;
  
  // Apply the global adjustment factor to account for physical barriers like stainless steel
  // and other real-world inefficiencies not captured in the theoretical model
  return totalPower * WATTS_TO_KJ_PER_HOUR * efficiency * HEAT_TRANSFER_ADJUSTMENT;
}

/**
 * Estimate heat transfer efficiency based on pressure and temperature
 * @param temperatureC Temperature in celsius
 * @param pressureMbar Pressure in millibars
 * @returns Efficiency factor (0 to 1)
 */
export function estimateHeatTransferEfficiency(
  temperatureC: number,
  pressureMbar: number
): number {
  // Normalize temperature in operating range
  const normalizedTemp = Math.max(-40, Math.min(20, temperatureC));
  
  // Temperature factor - higher temp increases efficiency
  // Reduced the temperature factor to account for heat loss through steel barrier
  const tempFactor = 0.6 + (normalizedTemp + 40) / 120; // Reduced from 0.7 and adjusted divisor
  
  // Pressure factor - lower pressure increases sublimation efficiency
  // This reflects that sublimation rates are higher at lower pressures
  const normalizedPressure = Math.max(0.1, Math.min(1000, pressureMbar));
  
  // Revised pressure factor - create an inverse relationship with pressure
  // Made more conservative to match real-world observations
  let pressureFactor;
  if (normalizedPressure <= 1) {
    pressureFactor = 0.8; // Reduced from 0.9 for more conservative estimate
  } else if (normalizedPressure <= 10) {
    pressureFactor = 0.7 - (normalizedPressure - 1) * 0.02; // 0.7-0.5 range (reduced from 0.8-0.6)
  } else if (normalizedPressure <= 100) {
    pressureFactor = 0.5 - (normalizedPressure - 10) * 0.001; // 0.5-0.4 range (reduced from 0.6-0.4)
  } else {
    pressureFactor = 0.4 - (normalizedPressure - 100) * 0.0001; // 0.4-0.3 range (minimum of 0.3)
    pressureFactor = Math.max(0.3, pressureFactor); // Increased minimum from 0.2 to 0.3
  }
  
  // Combined efficiency (capped between 0.2 and 0.9)
  return Math.min(0.9, Math.max(0.2, tempFactor * pressureFactor));
}

/**
 * Calculate heat input rate based on temperature, pressure, and surface area
 * (Legacy method for backward compatibility)
 * @param temperatureC Temperature in celsius
 * @param pressureMbar Pressure in millibars
 * @param totalShelfAreaM2 Total shelf area in m²
 * @returns Heat input rate in kJ/hr
 */
export function estimateHeatInputRate(
  temperatureC: number,
  pressureMbar: number,
  totalShelfAreaM2: number = 0.5
): number {
  // Base rate per square meter at reference conditions
  // Reduced from 800 to account for steel barrier and real-world inefficiencies
  const baseRatePerM2 = 500; // Adjusted base heat transfer rate in kJ/hr/m²
  
  // Get efficiency factors
  const efficiency = estimateHeatTransferEfficiency(temperatureC, pressureMbar);
  
  // Thermal conductivity factor - reduced to account for stainless steel barrier
  const conductivityFactor = 0.8; // Reduced from 1.0
  
  // Calculate total heat transfer rate
  return baseRatePerM2 * efficiency * conductivityFactor * totalShelfAreaM2;
}
