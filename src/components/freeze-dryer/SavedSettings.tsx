
import { FreezeDryerSettings, DryingStep } from "@/utils/freezeDryerCalculations";

export type SavedSettingsRecord = {
  id: string;
  name: string;
  settings: Partial<FreezeDryerSettings>;
  steps: DryingStep[];
  createdAt: string;
  updatedAt: string;
};

// This is just a type definition file, no component needed
