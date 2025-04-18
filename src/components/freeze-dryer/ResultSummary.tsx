
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SubTimePoint } from "@/utils/freezeDryerCalculations";
import { celsiusToFahrenheit } from "@/utils/terpeneData";
import { useEffect } from "react";

interface ResultSummaryProps {
  progressCurve: SubTimePoint[];
  displayUnit: 'C' | 'F';
  waterWeight?: number;
  waterPercentage?: number;
}

export function ResultSummary({ progressCurve, displayUnit, waterWeight, waterPercentage }: ResultSummaryProps) {
  // For debugging purposes
  useEffect(() => {
    console.log("ResultSummary rendered with:", {
      waterWeight,
      waterPercentage,
      progressCurveLength: progressCurve.length,
      lastPointProgress: progressCurve.length > 0 ? progressCurve[progressCurve.length - 1].progress : 'N/A',
      renderTime: new Date().toISOString()
    });
  }, [waterWeight, waterPercentage, progressCurve]);

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
  
  // Calculate completion percentage based on the last point's progress value
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
  
  // Calculate the water weight removed
  const actualWaterRemoved = waterWeight !== undefined ? 
    (completedPercent >= 100 ? waterWeight : waterWeight * (completedPercent / 100)) : undefined;

  console.log("Displaying ResultSummary with:", {
    waterWeight,
    waterPercentage,
    completedPercent,
    actualWaterRemoved,
    totalTime,
    renderTime: new Date().toISOString()
  });
  
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
            <p className={`text-2xl font-bold ${isDryingIncomplete ? 'text-amber-500' : isOverDry ? 'text-amber-500' : ''}`}>
              {Math.round(completedPercent)}%
              {isOverDry ? " (Over Dry)" : ""}
            </p>
            <Progress 
              value={Math.min(completedPercent, 100)} 
              indicatorClassName={isOverDry ? "bg-amber-500" : isDryingIncomplete ? "bg-amber-500" : ""}
              className="h-2 mt-1"
            />
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
        
        {waterWeight !== undefined && waterPercentage !== undefined && (
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Water Content</p>
              <p className="text-2xl font-bold">{waterPercentage}%</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Water Removed</p>
              <p className="text-2xl font-bold">
                {actualWaterRemoved !== undefined ? actualWaterRemoved.toFixed(3) : '0'} kg
              </p>
            </div>
          </div>
        )}
        
        {isOverDry && (
          <p className="text-xs text-amber-500 italic">
            Program duration exceeds required drying time by {Math.round(completedPercent - 100)}%
          </p>
        )}
      </CardContent>
    </Card>
  );
}
