
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubTimePoint } from "@/utils/freezeDryerCalculations";
import { celsiusToFahrenheit } from "@/utils/terpeneData";

interface ResultSummaryProps {
  progressCurve: SubTimePoint[];
  displayUnit: 'C' | 'F';
  waterWeight?: number;
  waterPercentage?: number;
}

export function ResultSummary({ progressCurve, displayUnit, waterWeight, waterPercentage }: ResultSummaryProps) {
  if (!progressCurve.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Add drying steps and provide the ice weight to see results.</p>
        </CardContent>
      </Card>
    );
  }
  
  const lastPoint = progressCurve[progressCurve.length - 1];
  const totalTime = lastPoint.time;
  
  // Explicitly calculate completion percentage based on the last point's progress value
  const completedPercent = lastPoint.progress;
  const isOverDry = completedPercent > 100;
  const isDryingIncomplete = completedPercent < 99; // Consider less than 99% as incomplete
  
  // Find highest temperature point
  const highestTempPoint = [...progressCurve].sort((a, b) => b.temperature - a.temperature)[0];
  const highestTemp = displayUnit === 'F' 
    ? celsiusToFahrenheit(highestTempPoint.temperature)
    : highestTempPoint.temperature;
    
  // Find lowest pressure point
  const lowestPressurePoint = [...progressCurve].sort((a, b) => a.pressure - b.pressure)[0];
  
  // Debug information to verify data
  console.log("ResultSummary - Last Point:", lastPoint);
  console.log("ResultSummary - Completion %:", completedPercent);
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Drying Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Total Time</p>
            <p className="text-2xl font-bold">
              {totalTime < 1 
                ? `${Math.round(totalTime * 60)} min` 
                : `${totalTime.toFixed(2)} hrs`}
            </p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Water Removal</p>
            <p className={`text-2xl font-bold ${isDryingIncomplete ? 'text-destructive' : isOverDry ? 'text-amber-500' : ''}`}>
              {Math.round(completedPercent)}%
              {isDryingIncomplete ? " (Incomplete)" : isOverDry ? " (Over Dry)" : ""}
            </p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Max Temperature</p>
            <p className="text-2xl font-bold">
              {Math.round(highestTemp)}°{displayUnit}
            </p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Min Pressure</p>
            <p className="text-2xl font-bold">
              {Math.round(lowestPressurePoint.pressure)} mBar
            </p>
          </div>
        </div>
        
        {waterWeight && waterPercentage && (
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Water Content</p>
              <p className="text-2xl font-bold">{waterPercentage}%</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Water Removed</p>
              <p className="text-2xl font-bold">{waterWeight.toFixed(3)} kg</p>
            </div>
          </div>
        )}
        
        {isOverDry && (
          <p className="text-xs text-amber-500 italic">
            Program duration exceeds required drying time by {Math.round(completedPercent - 100)}%
          </p>
        )}
        
        {isDryingIncomplete && (
          <p className="text-xs text-destructive italic">
            Drying process will only be {Math.round(completedPercent)}% complete. 
            Consider increasing step duration or adding more drying steps.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
