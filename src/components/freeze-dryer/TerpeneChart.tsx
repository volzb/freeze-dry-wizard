
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
    
    // Add more detailed logging to understand data generation
    console.log("Drying Data Points:", dryingData);
    console.log("Drying Steps:", steps);
    
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

  // Generate temperature data points based on exact step timings
  const temperatureData = useMemo(() => {
    if (!steps.length) return [];
    
    const result = [];
    let accumulatedTime = 0;
    
    // Add starting point
    result.push({
      time: 0,
      temperature: normalizeTemperature(steps[0].temperature, steps[0].tempUnit),
      displayTemp: displayUnit === 'F' 
        ? celsiusToFahrenheit(normalizeTemperature(steps[0].temperature, steps[0].tempUnit)) 
        : normalizeTemperature(steps[0].temperature, steps[0].tempUnit)
    });
    
    // Add points for each step boundary
    steps.forEach((step, index) => {
      // Convert step duration to hours
      const stepDurationHr = step.duration / 60;
      accumulatedTime += stepDurationHr;
      
      // Temperature for this step (already normalized in Celsius)
      const tempC = normalizeTemperature(step.temperature, step.tempUnit);
      const displayTemp = displayUnit === 'F' ? celsiusToFahrenheit(tempC) : tempC;
      
      // Add a point at the end of this step
      result.push({
        time: accumulatedTime,
        temperature: tempC,
        displayTemp: displayTemp
      });
      
      // If there's a next step, add a point for the temperature change
      if (steps[index + 1]) {
        const nextTempC = normalizeTemperature(
          steps[index + 1].temperature, 
          steps[index + 1].tempUnit
        );
        const nextDisplayTemp = displayUnit === 'F' ? celsiusToFahrenheit(nextTempC) : nextTempC;
        
        result.push({
          time: accumulatedTime,
          temperature: nextTempC,
          displayTemp: nextDisplayTemp
        });
      }
    });
    
    console.log("Generated temperature data points:", result);
    return result;
  }, [steps, displayUnit]);
  
  // Helper function to normalize temperature
  function normalizeTemperature(temperature: number, unit: 'C' | 'F'): number {
    if (unit === 'F') {
      return (temperature - 32) * 5/9; // Convert to Celsius
    }
    return temperature;
  }

  // Generate custom tick values for the time axis to avoid duplicates
  const timeAxisTicks = useMemo(() => {
    if (!chartData.length) return [];
    
    // Get unique time values, sorted
    const uniqueTimes = Array.from(new Set(chartData.map(d => Math.round(d.time * 10) / 10)))
      .sort((a, b) => a - b);
    
    // For very short timeframes, use more decimal precision
    const totalTime = chartData[chartData.length - 1]?.time || 0;
    const useDecimals = totalTime < 1;
    
    // Create evenly spaced ticks based on the data range
    const maxTime = Math.max(...uniqueTimes);
    const tickCount = Math.min(5, uniqueTimes.length); // Limit to 5 ticks maximum
    
    if (tickCount <= 1) return [0]; // Only show 0 if there's only one time point
    
    const ticks: number[] = [];
    for (let i = 0; i < tickCount; i++) {
      const tickValue = (maxTime * i) / (tickCount - 1);
      ticks.push(tickValue);
    }
    
    return ticks;
  }, [chartData]);

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
    filteredTerpenes: filteredTerpenes.length,
    temperaturePoints: temperatureData.length
  });
  
  if (chartData.length === 0) {
    return (
      <div className="w-full h-[500px] flex items-center justify-center border border-dashed border-muted-foreground rounded-lg">
        <p className="text-muted-foreground">No drying data available. Please configure your drying steps properly.</p>
      </div>
    );
  }

  // Format the time ticks with appropriate precision
  const formatTimeTick = (value: number) => {
    // For very short time periods, show one decimal place
    if (chartData[chartData.length - 1]?.time < 1) {
      return value.toFixed(1);
    }
    // Otherwise just round to whole numbers
    return Math.round(value).toString();
  };

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
            tickFormatter={formatTimeTick}
            ticks={timeAxisTicks}
            domain={[0, 'dataMax']}
            allowDecimals={true}
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
          
          {/* Separate temperature line with exact step durations */}
          <Line
            yAxisId="temp"
            type="stepAfter"
            data={temperatureData}
            dataKey="displayTemp"
            stroke="#33C3F0"
            strokeWidth={3}
            name={`Temperature (°${displayUnit})`}
            dot={false}
            connectNulls={true}
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
