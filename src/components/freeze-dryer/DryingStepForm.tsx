
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus, Trash2, Download, Upload } from "lucide-react";
import { DryingStep } from "@/utils/freezeDryerCalculations";
import { v4 as uuidv4 } from "@/utils/uuid";
import { toast } from "sonner";

interface DryingStepFormProps {
  steps: DryingStep[];
  onChange: (steps: DryingStep[]) => void;
  maxSteps?: number;
}

export function DryingStepForm({ steps, onChange, maxSteps = 8 }: DryingStepFormProps) {
  const handleStepChange = (index: number, field: keyof DryingStep, value: any) => {
    const updatedSteps = [...steps];
    updatedSteps[index] = { ...updatedSteps[index], [field]: value };
    onChange(updatedSteps);
  };

  const addStep = () => {
    if (steps.length < maxSteps) {
      const newStep: DryingStep = {
        id: uuidv4(),
        temperature: 20,
        pressure: 300,
        duration: 60,
        tempUnit: 'C',
        pressureUnit: 'mBar'
      };
      onChange([...steps, newStep]);
    }
  };

  const removeStep = (index: number) => {
    const updatedSteps = [...steps];
    updatedSteps.splice(index, 1);
    onChange(updatedSteps);
  };

  const handleNumericInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
    field: keyof DryingStep,
    minValue: number,
    allowNegative: boolean = false
  ) => {
    const inputValue = e.target.value;
    
    if (inputValue === "" || (allowNegative && inputValue === "-") || inputValue === "." || inputValue === "-.") {
      handleStepChange(index, field, inputValue);
      return;
    }
    
    const numericRegex = allowNegative ? /^-?\d*\.?\d*$/ : /^\d*\.?\d*$/;
    if (!numericRegex.test(inputValue)) {
      return;
    }
    
    if (inputValue.endsWith(".")) {
      handleStepChange(index, field, inputValue);
    } else {
      const parsedValue = parseFloat(inputValue);
      
      if (!isNaN(parsedValue) && (parsedValue >= minValue || (allowNegative && parsedValue < 0))) {
        handleStepChange(index, field, parsedValue);
      }
    }
  };

  const exportSteps = () => {
    const stepsJson = JSON.stringify(steps, null, 2);
    const blob = new Blob([stepsJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'freeze_dryer_steps.json';
    a.click();
    
    URL.revokeObjectURL(url);
    toast.success("Drying steps exported successfully");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedSteps = JSON.parse(event.target?.result as string);
        
        if (!Array.isArray(importedSteps)) {
          throw new Error("Invalid format: Expected an array of steps");
        }
        
        const processedSteps = importedSteps.map((step: any) => ({
          ...step,
          id: step.id || uuidv4(),
          temperature: Number(step.temperature),
          pressure: Number(step.pressure),
          duration: Number(step.duration),
          // Ensure the tempUnit is a valid type
          tempUnit: (step.tempUnit === 'C' || step.tempUnit === 'F') ? step.tempUnit as 'C' | 'F' : 'C',
          // Ensure the pressureUnit is a valid type
          pressureUnit: (step.pressureUnit === 'mBar' || step.pressureUnit === 'Torr') ? step.pressureUnit as 'mBar' | 'Torr' : 'mBar'
        }));
        
        if (processedSteps.length > maxSteps) {
          toast.warning(`Imported ${processedSteps.length} steps, but only the first ${maxSteps} will be used`);
          onChange(processedSteps.slice(0, maxSteps));
        } else {
          onChange(processedSteps);
          toast.success(`Imported ${processedSteps.length} drying steps`);
        }
      } catch (error) {
        console.error("Error importing steps:", error);
        toast.error("Failed to import steps: Invalid format");
      }
      
      e.target.value = '';
    };
    
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Drying Steps</h3>
        <div className="flex space-x-2">
          <input
            type="file"
            id="import-steps"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
          <label htmlFor="import-steps">
            <Button 
              variant="outline" 
              size="sm"
              className="text-primary"
              asChild
            >
              <span>
                <Upload className="mr-1 h-4 w-4" /> Import
              </span>
            </Button>
          </label>
          
          <Button 
            onClick={exportSteps}
            variant="outline" 
            size="sm" 
            className="text-primary"
          >
            <Download className="mr-1 h-4 w-4" /> Export
          </Button>
          
          <Button 
            onClick={addStep}
            variant="outline" 
            size="sm" 
            className="text-primary"
            disabled={steps.length >= maxSteps}
          >
            <Plus className="mr-1 h-4 w-4" /> Add Step
          </Button>
        </div>
      </div>
      
      {steps.length === 0 ? (
        <Card className="bg-muted/50">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No drying steps added. Add your first step to begin.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {steps.map((step, index) => (
            <Card key={step.id} className="overflow-hidden">
              <div className="bg-secondary/20 p-2 flex justify-between items-center">
                <h4 className="font-medium">Step {index + 1}</h4>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => removeStep(index)} 
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`temp-${index}`}>Temperature</Label>
                  <div className="flex space-x-2">
                    <Input
                      id={`temp-${index}`}
                      type="text"
                      value={step.temperature}
                      onChange={(e) => handleNumericInput(e, index, "temperature", -100, true)}
                      min="-100"
                      step="1"
                    />
                    <Select 
                      value={step.tempUnit} 
                      onValueChange={(value) => handleStepChange(index, "tempUnit", value as 'C' | 'F')}
                    >
                      <SelectTrigger className="w-[80px]">
                        <SelectValue placeholder="°C" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="C">°C</SelectItem>
                        <SelectItem value="F">°F</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor={`pressure-${index}`}>Pressure</Label>
                  <div className="flex space-x-2">
                    <Input
                      id={`pressure-${index}`}
                      type="text"
                      value={step.pressure}
                      onChange={(e) => handleNumericInput(e, index, "pressure", 0)}
                      min="0"
                      step="1"
                    />
                    <Select 
                      value={step.pressureUnit} 
                      onValueChange={(value) => handleStepChange(index, "pressureUnit", value as 'mBar' | 'Torr')}
                    >
                      <SelectTrigger className="w-[80px]">
                        <SelectValue placeholder="mBar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mBar">mBar</SelectItem>
                        <SelectItem value="Torr">Torr</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor={`duration-${index}`}>Duration</Label>
                  <div className="flex space-x-2 items-center">
                    <Input
                      id={`duration-${index}`}
                      type="text"
                      value={step.duration}
                      onChange={(e) => handleNumericInput(e, index, "duration", 1)}
                      min="1"
                      step="1"
                    />
                    <span className="w-20 text-sm text-muted-foreground">minutes</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
