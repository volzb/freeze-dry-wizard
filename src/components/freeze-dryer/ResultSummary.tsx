
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubTimePoint } from "@/utils/freezeDryerCalculations";
import { celsiusToFahrenheit } from "@/utils/terpeneData";
import { useEffect, useMemo } from "react";

interface ResultSummaryProps {
  progressCurve: SubTimePoint[];
  displayUnit: 'C' | 'F';
  waterWeight?: number;
  waterPercentage?: number;
}

export function ResultSummary({ progressCurve, displayUnit, waterWeight, waterPercentage }: ResultSummaryProps) {
  // For debugging purposes - important to track re-renders and props changes
  useEffect(() => {
    console.log("ResultSummary rendered with props:", {
      waterWeight,
      waterPercentage,
      progressCurveLength: progressCurve.length,
      lastPointProgress: progressCurve.length > 0 ? progressCurve[progressCurve.length - 1].progress : 'N/A',
      renderTime: new Date().toISOString()
    });
  }, [waterWeight, waterPercentage, progressCurve]);

  // Calculate sublimation metrics
  const sublimationMetrics = useMemo(() => {
    if (!progressCurve.length) return null;

    // Find the peak sublimation rate point
    const peakRatePoint = [...progressCurve].sort((a, b) => {
      return (b.sublimationRate || 0) - (a.sublimationRate || 0);
    })[0];
    
    // Calculate average rate per step
    const stepRates: Record<number, { total: number, count: number, avg: number }> = {};
    
    progressCurve.forEach(point => {
      if (point.step === undefined || point.sublimationRate === undefined) return;
      
      if (!stepRates[point.step]) {
        stepRates[point.step] = { total: 0, count: 0, avg: 0 };
      }
      
      stepRates[point.step].total += point.sublimationRate;
      stepRates[point.step].count += 1;
    });
    
    // Calculate averages
    Object.keys(stepRates).forEach(step => {
      const stepData = stepRates[Number(step)];
      stepData.avg = stepData.total / stepData.count;
    });
    
    // Calculate overall average rate
    const allRates = progressCurve.filter(p => p.sublimationRate !== undefined)
                                  .map(p => p.sublimationRate || 0);
    const overallAvgRate = allRates.reduce((sum, rate) => sum + rate, 0) / allRates.length;

    return {
      peakRate: peakRatePoint?.sublimationRate || 0,
      peakRateTimeHrs: peakRatePoint?.time || 0,
      stepRates,
      overallAvgRate
    };
  }, [progressCurve]);

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
  
  // Calculate the water weight removed - ensure we're working with the latest values
  const actualWaterRemoved = waterWeight !== undefined ? 
    (completedPercent >= 100 ? waterWeight : waterWeight * (completedPercent / 100)) : undefined;

  // Get water removal data in grams
  const waterRemovedInGrams = lastPoint.waterRemoved || 0;

  console.log("Rendering ResultSummary with final values:", {
    waterWeight,
    waterPercentage,
    completedPercent,
    actualWaterRemoved,
    waterRemovedInGrams,
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
        
        {/* Sublimation rate information */}
        {sublimationMetrics && (
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Peak Rate</p>
              <p className="text-2xl font-bold">{sublimationMetrics.peakRate.toFixed(1)} g/hr</p>
              <p className="text-xs text-muted-foreground">at {sublimationMetrics.peakRateTimeHrs.toFixed(1)} hrs</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Avg Rate</p>
              <p className="text-2xl font-bold">{sublimationMetrics.overallAvgRate.toFixed(1)} g/hr</p>
            </div>
          </div>
        )}
        
        {waterWeight !== undefined && waterPercentage !== undefined && (
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Water Content</p>
              <p className="text-2xl font-bold">{waterPercentage}%</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Water Removed</p>
              <p className="text-2xl font-bold">
                {waterRemovedInGrams > 0 
                  ? `${(waterRemovedInGrams / 1000).toFixed(3)} kg` 
                  : (actualWaterRemoved !== undefined ? actualWaterRemoved.toFixed(3) : '0') + ' kg'}
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
