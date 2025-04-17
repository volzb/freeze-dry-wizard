
import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, TooltipProps } from 'recharts';
import { terpenes, calculateBoilingPoint, celsiusToFahrenheit, Terpene } from "@/utils/terpeneData";
import { SubTimePoint, DryingStep } from "@/utils/freezeDryerCalculations";
import { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

interface TerpeneChartProps {
  dryingData: SubTimePoint[];
  steps: DryingStep[];
  displayUnit: 'C' | 'F';
  showTerpenes: string[];
}

export function TerpeneChart({ dryingData, steps, displayUnit, showTerpenes }: TerpeneChartProps) {
  // Process data to include terpene boiling points at each step's pressure
  const chartData = useMemo(() => {
    if (!dryingData.length) {
      console.log("No drying data available for chart");
      return [];
    }
    
    console.log("Processing chart data", { dataPoints: dryingData.length, steps: steps.length });
    
    return dryingData.map((point) => {
      const terpenesAtPoint: Record<string, number> = {};
      
      // Calculate boiling point for each terpene at this pressure
      terpenes.forEach((terpene) => {
        // Convert pressure from mbar to torr for calculation
        const pressureTorr = point.pressure / 1.33322;
        let boilingTemp = calculateBoilingPoint(terpene, pressureTorr);
        
        // Convert to Fahrenheit if needed
        if (displayUnit === 'F') {
          boilingTemp = celsiusToFahrenheit(boilingTemp);
        }
        
        terpenesAtPoint[terpene.name] = boilingTemp;
      });
      
      // Adjust temperature for display unit
      const displayTemp = displayUnit === 'F' 
        ? celsiusToFahrenheit(point.temperature) 
        : point.temperature;
      
      return {
        ...point,
        displayTemp,
        ...terpenesAtPoint
      };
    });
  }, [dryingData, displayUnit]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
    if (active && payload && payload.length) {
      // Find the current step data
      const pointData = payload[0]?.payload;
      if (!pointData) return null;
      
      // Get current step temperature
      const stepTemp = pointData.displayTemp;
      
      // Get the terpenes that would boil at this point
      const boilingTerpenes = Object.entries(pointData)
        .filter(([key, value]) => {
          return terpenes.some(t => t.name === key) && 
                 typeof value === 'number' &&
                 value <= stepTemp;
        })
        .map(([key]) => key);
      
      return (
        <div className="bg-background border border-border p-3 shadow-md rounded-md">
          <p className="font-semibold mb-1">{`Time: ${pointData.time.toFixed(2)} hours`}</p>
          <p className="text-sm mb-2">{`Temperature: ${Math.round(stepTemp)}°${displayUnit}`}</p>
          <p className="text-sm mb-2">{`Pressure: ${Math.round(pointData.pressure)} mBar`}</p>
          <p className="text-sm">{`Ice Sublimated: ${Math.round(pointData.progress)}%`}</p>
          
          {boilingTerpenes.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border">
              <p className="text-sm font-semibold text-destructive">Terpenes at risk:</p>
              <ul className="text-xs max-h-32 overflow-y-auto">
                {boilingTerpenes.map((name) => (
                  <li key={name} className="text-destructive">{name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const filteredTerpenes = terpenes.filter(t => showTerpenes.includes(t.name));
  
  // Add console logs to help debug chart issues
  console.log("TerpeneChart render", { 
    dataPoints: chartData.length,
    steps: steps.length,
    filteredTerpenes: filteredTerpenes.length 
  });
  
  if (chartData.length === 0) {
    return (
      <div className="w-full h-[500px] flex items-center justify-center border border-dashed border-muted-foreground rounded-lg">
        <p className="text-muted-foreground">No drying data available. Please configure your drying steps properly.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={500}>
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis 
            dataKey="time" 
            label={{ value: 'Time (hours)', position: 'insideBottomRight', offset: -10 }}
            tickFormatter={(value) => Math.round(value).toString()}
          />
          <YAxis 
            yAxisId="temp"
            label={{ 
              value: `Temperature (°${displayUnit})`, 
              angle: -90, 
              position: 'insideLeft',
              style: { textAnchor: 'middle' }
            }}
            domain={['auto', 'auto']}
          />
          <YAxis 
            yAxisId="progress"
            orientation="right"
            label={{ 
              value: 'Sublimation Progress (%)', 
              angle: -90, 
              position: 'insideRight',
              style: { textAnchor: 'middle' }
            }}
            domain={[0, 100]}
          />
          
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="bottom" 
            height={50}
            wrapperStyle={{ 
              fontSize: '10px', 
              marginTop: '20px',
              paddingTop: '30px' // Added padding to prevent overlap with time labels
            }}
            iconSize={8}
          />
          
          <Line
            yAxisId="temp"
            type="stepAfter"
            dataKey="displayTemp"
            stroke="#33C3F0"
            strokeWidth={3}
            name={`Temperature (°${displayUnit})`}
            dot={false}
          />
          
          <Line
            yAxisId="progress"
            type="monotone"
            dataKey="progress"
            stroke="#9b87f5"
            strokeWidth={2}
            name="Sublimation Progress (%)"
            dot={false}
          />
          
          {filteredTerpenes.map((terpene) => (
            <Line
              key={terpene.name}
              yAxisId="temp"
              type="monotone"
              dataKey={terpene.name}
              stroke={terpene.color}
              strokeDasharray="5 5"
              strokeWidth={1.5}
              name={`${terpene.name} Boiling Point`}
              dot={false}
              activeDot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
