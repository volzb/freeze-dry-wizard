
import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, TooltipProps } from 'recharts';
import { terpenes, calculateBoilingPoint, celsiusToFahrenheit, Terpene } from "@/utils/terpeneData";
import { SubTimePoint, DryingStep } from "@/utils/freezeDryerCalculations";
import { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface TerpeneChartProps {
  dryingData: SubTimePoint[];
  steps: DryingStep[];
  displayUnit: 'C' | 'F';
  showTerpenes: string[];
}

export function TerpeneChart({ dryingData, steps, displayUnit, showTerpenes }: TerpeneChartProps) {
  // Process data to include terpene boiling points at each step's pressure
  const chartData = useMemo(() => {
    if (!dryingData.length) return [];
    
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

  // Config for chart to help with styling and legend
  const chartConfig = Object.fromEntries(
    terpenes.map((terpene) => [
      terpene.name, 
      { 
        label: `${terpene.name} Boiling Point`, 
        color: terpene.color 
      }
    ])
  );

  return (
    <ChartContainer config={chartConfig} className="h-[450px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 50 }} // Increased bottom margin
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis 
            dataKey="time" 
            label={{ 
              value: 'Time (hours)', 
              position: 'insideBottomRight', 
              offset: -10 
            }}
            tickFormatter={(value) => value.toFixed(2)} // Limit to 2 decimal places
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
          
          <ChartTooltip 
            content={
              <ChartTooltipContent
                hideIndicator={false}
                formatter={(value, name) => {
                  if (name === 'time') return value.toFixed(2);
                  if (name === 'displayTemp' || typeof value === 'number') return value.toFixed(2);
                  return value;
                }}
              />
            } 
          />
          <Legend 
            verticalAlign="bottom" 
            height={36} 
            wrapperStyle={{ bottom: -20 }} // Push legend slightly further down
          />
          
          {/* Step temperature line */}
          <Line
            yAxisId="temp"
            type="stepAfter"
            dataKey="displayTemp"
            stroke="#33C3F0"
            strokeWidth={3}
            name={`Temperature (°${displayUnit})`}
            dot={false}
          />
          
          {/* Progress line */}
          <Line
            yAxisId="progress"
            type="monotone"
            dataKey="progress"
            stroke="#9b87f5"
            strokeWidth={2}
            name="Sublimation Progress (%)"
            dot={false}
          />
          
          {/* Terpene boiling point lines */}
          {terpenes
            .filter(t => showTerpenes.includes(t.name))
            .map((terpene) => (
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
            ))
          }
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
