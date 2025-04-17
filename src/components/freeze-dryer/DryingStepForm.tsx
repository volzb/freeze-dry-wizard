
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus, Trash2 } from "lucide-react";
import { DryingStep } from "@/utils/freezeDryerCalculations";
import { v4 as uuidv4 } from "@/utils/uuid";

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

  // Utility function to handle numeric inputs properly
  const handleNumericInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
    field: keyof DryingStep,
    minValue: number,
    allowNegative: boolean = false
  ) => {
    // Get the raw input value
    const inputValue = e.target.value;
    
    // Check if the input is empty, just a negative sign, or a valid number
    if (inputValue === "" || (allowNegative && inputValue === "-")) {
      handleStepChange(index, field, inputValue);
      return;
    }
    
    // Try to parse as a number
    const parsedValue = parseFloat(inputValue);
    
    // If it's a valid number that meets minimum requirements
    if (!isNaN(parsedValue) && (parsedValue >= minValue || (allowNegative && parsedValue < 0))) {
      handleStepChange(index, field, parsedValue);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Drying Steps</h3>
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
