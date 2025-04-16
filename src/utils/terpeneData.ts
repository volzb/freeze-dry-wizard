
// Terpene data with estimated Antoine coefficients for calculating boiling points at different pressures
// These values are approximated and should be replaced with experimental data when available
export interface Terpene {
  name: string;
  // Antoine coefficients for equation: log10(P) = A - B/(T + C) where P is in mmHg and T is in °C
  a: number; 
  b: number;
  c: number;
  color: string;
  // Reference atmospheric boiling point in °C
  boilingPoint: number;
  // Group categorization for cannabis terpenes
  group: "major" | "minor" | "other";
}

// Colors for the terpenes on the chart
const terpeneColors = [
  "#4285F4", "#EA4335", "#FBBC05", "#34A853", "#9C27B0", "#FF9800",
  "#795548", "#607D8B", "#3F51B5", "#00BCD4", "#009688", "#8BC34A",
  "#CDDC39", "#FFC107", "#FF5722", "#9E9E9E", "#E91E63", "#673AB7",
  "#03A9F4", "#4CAF50", "#F44336", "#2196F3", "#FF9800", "#9C27B0",
  "#FF4081", "#7C4DFF", "#18FFFF", "#64FFDA", "#B2FF59", "#FFD740"
];

// This is a simplified dataset - in a real application, these values would be determined experimentally
export const terpenes: Terpene[] = [
  { name: "alpha-Pinene", a: 7.35, b: 1592.864, c: 209.517, color: terpeneColors[0], boilingPoint: 156, group: "major" },
  { name: "Camphene", a: 7.45, b: 1750.286, c: 211.883, color: terpeneColors[1], boilingPoint: 159, group: "minor" },
  { name: "beta-Pinene", a: 7.25, b: 1602.057, c: 208.075, color: terpeneColors[2], boilingPoint: 166, group: "major" },
  { name: "3-Carene", a: 7.11, b: 1699.125, c: 202.329, color: terpeneColors[3], boilingPoint: 168, group: "minor" },
  { name: "beta-Myrcene", a: 7.28, b: 1762.463, c: 212.661, color: terpeneColors[4], boilingPoint: 167, group: "major" },
  { name: "alpha-Terpinene", a: 7.33, b: 1790.949, c: 215.546, color: terpeneColors[5], boilingPoint: 175, group: "minor" },
  { name: "D-Limonene", a: 7.37, b: 1768.908, c: 213.559, color: terpeneColors[6], boilingPoint: 176, group: "major" },
  { name: "Eucalyptol", a: 7.27, b: 1620.118, c: 207.554, color: terpeneColors[7], boilingPoint: 174, group: "other" },
  { name: "Z-beta-Ocimene", a: 7.41, b: 1823.940, c: 219.324, color: terpeneColors[8], boilingPoint: 176, group: "minor" },
  { name: "gamma-Terpinene", a: 7.35, b: 1806.224, c: 217.735, color: terpeneColors[9], boilingPoint: 183, group: "minor" },
  { name: "E-beta-Ocimene", a: 7.38, b: 1824.562, c: 219.112, color: terpeneColors[10], boilingPoint: 177, group: "minor" },
  { name: "p-Cymene", a: 7.42, b: 1797.011, c: 216.246, color: terpeneColors[11], boilingPoint: 177, group: "minor" },
  { name: "Terpinolene", a: 7.36, b: 1851.443, c: 221.765, color: terpeneColors[12], boilingPoint: 185, group: "minor" },
  { name: "(+/-) – Fenchone", a: 7.18, b: 1729.198, c: 205.345, color: terpeneColors[13], boilingPoint: 193, group: "other" },
  { name: "Camphor", a: 7.22, b: 1750.996, c: 207.635, color: terpeneColors[14], boilingPoint: 204, group: "other" },
  { name: "Linalool", a: 7.40, b: 1725.138, c: 217.633, color: terpeneColors[15], boilingPoint: 198, group: "major" },
  { name: "Isopulegol", a: 7.35, b: 1898.637, c: 212.465, color: terpeneColors[16], boilingPoint: 212, group: "other" },
  { name: "Caryophyllene", a: 7.41, b: 2104.412, c: 211.246, color: terpeneColors[17], boilingPoint: 268, group: "major" },
  { name: "Humulene", a: 7.43, b: 2140.532, c: 213.785, color: terpeneColors[18], boilingPoint: 276, group: "major" },
  { name: "Terpineol", a: 7.37, b: 1949.687, c: 223.258, color: terpeneColors[19], boilingPoint: 217, group: "minor" },
  { name: "(+/-) – Borneol", a: 7.24, b: 1896.528, c: 210.346, color: terpeneColors[20], boilingPoint: 213, group: "other" },
  { name: "Valencene", a: 7.42, b: 2132.466, c: 212.754, color: terpeneColors[21], boilingPoint: 270, group: "other" },
  { name: "Geraniol", a: 7.38, b: 1978.211, c: 217.642, color: terpeneColors[22], boilingPoint: 229, group: "minor" },
  { name: "cis-Nerolidol", a: 7.40, b: 2217.563, c: 216.432, color: terpeneColors[23], boilingPoint: 276, group: "other" },
  { name: "trans-Nerolidol", a: 7.39, b: 2219.674, c: 216.768, color: terpeneColors[24], boilingPoint: 276, group: "other" },
  { name: "Caryophyllene oxide", a: 7.36, b: 2187.399, c: 213.547, color: terpeneColors[25], boilingPoint: 280, group: "minor" },
  { name: "Guaiol", a: 7.19, b: 2153.884, c: 207.932, color: terpeneColors[26], boilingPoint: 275, group: "other" },
  { name: "alpha-Bisabolol", a: 7.32, b: 2301.754, c: 217.648, color: terpeneColors[27], boilingPoint: 289, group: "other" }
];

// Function to group terpenes by their category
export function getTerpeneGroups() {
  const groups: Record<string, Terpene[]> = {
    major: [],
    minor: [],
    other: []
  };

  terpenes.forEach(terpene => {
    groups[terpene.group].push(terpene);
  });

  return groups;
}

// Function to calculate boiling point at a given pressure
export function calculateBoilingPoint(terpene: Terpene, pressureTorr: number): number {
  // From log₁₀(P) = A - B/(T + C)
  // Solve for T: T = B/(A - log₁₀(P)) - C
  return terpene.b / (terpene.a - Math.log10(pressureTorr)) - terpene.c;
}

// Convert temperature between Celsius and Fahrenheit
export function celsiusToFahrenheit(celsius: number): number {
  return (celsius * 9/5) + 32;
}

export function fahrenheitToCelsius(fahrenheit: number): number {
  return (fahrenheit - 32) * 5/9;
}

// Convert pressure between Torr and mBar
export function torrToMbar(torr: number): number {
  return torr * 1.33322;
}

export function mbarToTorr(mbar: number): number {
  return mbar / 1.33322;
}
