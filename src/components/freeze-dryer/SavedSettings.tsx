
import { FreezeDryerSettings, DryingStep } from "@/utils/freezeDryerCalculations";

export type SavedSettingsRecord = {
  id: string;
  name: string;
  settings: Partial<FreezeDryerSettings>;
  steps: DryingStep[];
  createdAt: string;
  updatedAt: string;
};

interface SavedSettingsProps {
  currentSettings: Partial<FreezeDryerSettings>;
  currentSteps: DryingStep[];
  onLoadSettings: (settings: Partial<FreezeDryerSettings>, steps: DryingStep[]) => void;
}

// This is now just a type definition file
// The functionality has been moved to ConfigManager.tsx
export function SavedSettings({
  currentSettings,
  currentSteps,
  onLoadSettings,
}: SavedSettingsProps) {
  return null; // This component is now just a placeholder for backward compatibility
}
