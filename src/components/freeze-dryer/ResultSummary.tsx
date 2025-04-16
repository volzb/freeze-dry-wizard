
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SubTimePoint } from "@/utils/freezeDryerCalculations";
import { celsiusToFahrenheit } from "@/utils/terpeneData";

interface ResultSummaryProps {
  progressCurve: SubTimePoint[];
  displayUnit: 'C' | 'F';
}

export function ResultSummary({ progressCurve, displayUnit }: ResultSummaryProps) {
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
  const completedPercent = lastPoint.progress;
  const isOverDry = completedPercent > 100;
  
  // Find highest temperature point
  const highestTempPoint = [...progressCurve].sort((a, b) => b.temperature - a.temperature)[0];
  const highestTemp = displayUnit === 'F' 
    ? celsiusToFahrenheit(highestTempPoint.temperature)
    : highestTempPoint.temperature;
    
  // Find lowest pressure point
  const lowestPressurePoint = [...progressCurve].sort((a, b) => a.pressure - b.pressure)[0];
  
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
                : `${Math.round(totalTime * 10) / 10} hrs`}
            </p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Completion</p>
            <p className={`text-2xl font-bold ${isOverDry ? 'text-amber-500' : ''}`}>
              {Math.round(completedPercent)}%
              {isOverDry && " (Over Dry)"}
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
        
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span>Drying Progress</span>
            <span>{Math.round(completedPercent)}%</span>
          </div>
          <Progress 
            value={Math.min(100, completedPercent)} 
            className={`h-2 ${isOverDry ? 'bg-amber-100' : ''}`}
            indicatorClassName={isOverDry ? 'bg-amber-500' : undefined}
          />
          {isOverDry && (
            <p className="text-xs text-amber-500 italic">
              Program duration exceeds required drying time by {Math.round(completedPercent - 100)}%
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
