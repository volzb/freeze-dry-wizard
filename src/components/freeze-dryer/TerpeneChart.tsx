
import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { terpenes, calculateBoilingPoint, celsiusToFahrenheit, Terpene, getTerpeneGroups } from "@/utils/terpeneData";
import { SubTimePoint, DryingStep, normalizeTemperature } from "@/utils/freezeDryerCalculations";
import { TooltipProps } from 'recharts/types/component/Tooltip';
import { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent";

interface TerpeneChartProps {
  dryingData: SubTimePoint[];
  steps: DryingStep[];
  displayUnit: 'C' | 'F';
  showTerpenes: string[];
}

export function TerpeneChart({ dryingData, steps, displayUnit, showTerpenes }: TerpeneChartProps) {
  // Process data to include terpene boiling points
  const chartData = useMemo(() => {
    if (!dryingData.length) return [];

    // Transform points to include terpene boiling points
    return dryingData.map(point => {
      // Calculate terpene boiling points at this pressure
      const terpenesAtPoint: Record<string, number> = {};
      terpenes.forEach((terpene) => {
        // Convert pressure from mbar to torr for calculation
        const pressureTorr = Math.max(0.001, point.pressure / 1.33322);
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
        time: point.time,
        displayTemp,
        progress: point.progress,
        pressure: point.pressure,
        step: point.step,
        ...terpenesAtPoint
      };
    });
  }, [dryingData, displayUnit]);

  // Generate exact temperature step line data
  const temperatureStepData = useMemo(() => {
    if (!steps.length) return [];
    
    const result = [];
    let accumulatedTime = 0;
    
    // Add starting point
    const firstStepTempC = normalizeTemperature(steps[0].temperature, steps[0].tempUnit);
    const firstStepDisplayTemp = displayUnit === 'F' 
      ? celsiusToFahrenheit(firstStepTempC) 
      : firstStepTempC;
      
    result.push({
      time: 0,
      temperature: firstStepTempC,
      displayTemp: firstStepDisplayTemp
    });
    
    // Add points for each step boundary
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
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
      
      // If not the last step, add another point at this time with the next step's temperature
      // This creates the step-like visualization
      if (i < steps.length - 1) {
        const nextStep = steps[i + 1];
        const nextTempC = normalizeTemperature(nextStep.temperature, nextStep.tempUnit);
        const nextDisplayTemp = displayUnit === 'F' ? celsiusToFahrenheit(nextTempC) : nextTempC;
        
        result.push({
          time: accumulatedTime,
          temperature: nextTempC,
          displayTemp: nextDisplayTemp
        });
      }
    }
    
    return result;
  }, [steps, displayUnit]);

  // Generate time axis ticks with better distribution
  const timeAxisTicks = useMemo(() => {
    if (!chartData.length) return [0];
    
    // Calculate total time from steps rather than chart data
    // This ensures we include the full duration of all steps
    let totalTime = 0;
    steps.forEach(step => {
      totalTime += step.duration / 60; // Convert minutes to hours
    });
    
    if (totalTime === 0) return [0];
    
    // Generate enough ticks for good readability
    const tickCount = Math.min(10, Math.max(5, Math.ceil(totalTime)));
    return Array.from({ length: tickCount }, (_, i) => (totalTime * i) / (tickCount - 1));
  }, [steps]);

  // Custom tooltip component
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

  // Filter terpenes based on selection and group them
  const filteredTerpenes = useMemo(() => {
    return terpenes.filter(t => showTerpenes.includes(t.name));
  }, [showTerpenes]);
  
  // Check if we have data to display
  if (chartData.length === 0) {
    return (
      <div className="w-full h-[500px] flex items-center justify-center border border-dashed border-muted-foreground rounded-lg">
        <p className="text-muted-foreground">No drying data available. Please configure your drying steps properly.</p>
      </div>
    );
  }

  // Calculate total time from steps
  let totalTime = 0;
  steps.forEach(step => {
    totalTime += step.duration / 60; // Convert minutes to hours
  });
  
  // Format the time axis ticks
  const formatTimeTick = (value: number) => {
    if (value === 0) return "0";
    
    // For short times, show decimal
    if (totalTime < 1) {
      return value.toFixed(1);
    }
    
    // For smaller values, round to 1 decimal
    if (value < 10) {
      return value.toFixed(1);
    }
    
    // For larger values, round to whole numbers
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
            domain={[0, totalTime]} // Set domain to total step time
            type="number"
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
              paddingTop: '30px'
            }}
            iconSize={8}
          />
          
          {/* Temperature line showing exact step changes */}
          <Line
            yAxisId="temp"
            type="linear"
            data={temperatureStepData}
            dataKey="displayTemp"
            stroke="#33C3F0"
            strokeWidth={3}
            name={`Temperature (°${displayUnit})`}
            dot={false}
            connectNulls={true}
            isAnimationActive={false}
          />
          
          {/* Sublimation progress line */}
          <Line
            yAxisId="progress"
            type="monotone"
            dataKey="progress"
            stroke="#9b87f5"
            strokeWidth={2}
            name="Sublimation Progress (%)"
            dot={false}
            connectNulls={true}
            isAnimationActive={false}
          />
          
          {/* Terpene boiling point lines */}
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
              connectNulls={true}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
