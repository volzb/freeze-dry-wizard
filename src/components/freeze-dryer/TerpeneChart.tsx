import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { terpenes, calculateBoilingPoint, celsiusToFahrenheit, Terpene, getTerpeneGroups } from "@/utils/terpeneData";
import { SubTimePoint, DryingStep, normalizeTemperature } from "@/utils/freezeDryerCalculations";
import { TooltipProps } from 'recharts/types/component/Tooltip';
import { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "../ui/chart";

interface TerpeneChartProps {
  dryingData: SubTimePoint[];
  steps: DryingStep[];
  displayUnit: 'C' | 'F';
  showTerpenes: string[];
}

export function TerpeneChart({ dryingData, steps, displayUnit, showTerpenes }: TerpeneChartProps) {
  const chartData = useMemo(() => {
    if (!dryingData.length) return [];

    const stepDurations: Record<number, number> = {};
    steps.forEach((step, index) => {
      stepDurations[index] = step.duration / 60;
    });

    const stepEndTimes: number[] = [];
    let accumulatedTime = 0;
    steps.forEach((step) => {
      accumulatedTime += step.duration / 60;
      stepEndTimes.push(accumulatedTime);
    });

    const stepSublimationAmounts: Record<number, number> = {};
    const stepSublimationRates: Record<number, number> = {};
    
    steps.forEach((_, idx) => {
      stepSublimationAmounts[idx] = 0;
      stepSublimationRates[idx] = 0;
    });
    
    let lastProgress = 0;
    let lastStepIdx = 0;
    
    dryingData.forEach((point, idx) => {
      if (idx === 0) {
        lastStepIdx = point.step;
        return;
      }
      
      if (point.step !== lastStepIdx || idx === dryingData.length - 1) {
        const progressInStep = point.progress - lastProgress;
        stepSublimationAmounts[lastStepIdx] = progressInStep;
        
        const duration = stepDurations[lastStepIdx];
        if (duration > 0) {
          stepSublimationRates[lastStepIdx] = progressInStep / duration;
        }
        
        lastProgress = point.progress;
        lastStepIdx = point.step;
      }
    });
    
    console.log("Step sublimation amounts:", stepSublimationAmounts);
    console.log("Step sublimation rates per hour:", stepSublimationRates);

    return dryingData.map((point, idx) => {
      const terpenesAtPoint: Record<string, number> = {};
      terpenes.forEach((terpene) => {
        const pressureTorr = Math.max(0.001, point.pressure / 1.33322);
        let boilingTemp = calculateBoilingPoint(terpene, pressureTorr);
        
        if (displayUnit === 'F') {
          boilingTemp = celsiusToFahrenheit(boilingTemp);
        }
        
        terpenesAtPoint[terpene.name] = boilingTemp;
      });
      
      const displayTemp = displayUnit === 'F' 
        ? celsiusToFahrenheit(point.temperature) 
        : point.temperature;
      
      const stepIdx = point.step;
      const hourlyRate = stepSublimationRates[stepIdx] || 0;
      
      return {
        time: point.time,
        displayTemp,
        progress: point.progress,
        hourlyRate,
        pressure: point.pressure,
        step: point.step,
        ...terpenesAtPoint
      };
    });
  }, [dryingData, displayUnit, steps]);

  const temperatureStepData = useMemo(() => {
    if (!steps.length) return [];
    
    const result = [];
    let accumulatedTime = 0;
    
    result.push({
      time: 0,
      temperature: normalizeTemperature(steps[0].temperature, steps[0].tempUnit),
      displayTemp: displayUnit === 'F' 
        ? celsiusToFahrenheit(normalizeTemperature(steps[0].temperature, steps[0].tempUnit)) 
        : normalizeTemperature(steps[0].temperature, steps[0].tempUnit)
    });
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepDurationHr = step.duration / 60;
      accumulatedTime += stepDurationHr;
      
      const tempC = normalizeTemperature(step.temperature, step.tempUnit);
      const displayTemp = displayUnit === 'F' ? celsiusToFahrenheit(tempC) : tempC;
      
      result.push({
        time: accumulatedTime,
        temperature: tempC,
        displayTemp: displayTemp
      });
      
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

  const timeAxisTicks = useMemo(() => {
    if (!chartData.length) return [0];
    
    let totalTime = 0;
    steps.forEach(step => {
      totalTime += step.duration / 60;
    });
    
    if (totalTime === 0) return [0];
    
    const tickCount = Math.min(10, Math.max(5, Math.ceil(totalTime)));
    return Array.from({ length: tickCount }, (_, i) => (totalTime * i) / (tickCount - 1));
  }, [steps]);

  const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
    if (active && payload && payload.length) {
      const pointData = payload[0]?.payload;
      if (!pointData) return null;
      
      const stepTemp = pointData.displayTemp;
      const currentStep = pointData.step !== undefined ? pointData.step + 1 : null;
      
      const progress = typeof pointData.progress === 'number' ? pointData.progress : 0;
      const hourlyRate = typeof pointData.hourlyRate === 'number' ? pointData.hourlyRate : 0;
      
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
          <p className="text-sm mb-1">{`Temperature: ${Math.round(stepTemp)}°${displayUnit}`}</p>
          <p className="text-sm mb-1">{`Pressure: ${pointData.pressure ? Math.round(pointData.pressure) : 'N/A'} mBar`}</p>
          <p className="text-sm mb-1">{`Ice Sublimated: ${Math.round(progress)}%`}</p>
          {currentStep !== null && (
            <p className="text-sm mb-1">{`Step ${currentStep} Rate: ${hourlyRate.toFixed(1)}% per hour`}</p>
          )}
          
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

  const filteredTerpenes = useMemo(() => {
    return terpenes.filter(t => showTerpenes.includes(t.name));
  }, [showTerpenes]);
  
  if (chartData.length === 0) {
    return (
      <div className="w-full h-[500px] flex items-center justify-center border border-dashed border-muted-foreground rounded-lg">
        <p className="text-muted-foreground">No drying data available. Please configure your drying steps properly.</p>
      </div>
    );
  }

  let totalTime = 0;
  steps.forEach(step => {
    totalTime += step.duration / 60;
  });
  
  const formatTimeTick = (value: number) => {
    if (value === 0) return "0";
    
    if (totalTime < 1) {
      return value.toFixed(1);
    }
    
    if (value < 10) {
      return value.toFixed(1);
    }
    
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
            domain={[0, totalTime]}
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
          
          <Line
            yAxisId="progress"
            type="monotone"
            dataKey="progress"
            stroke="#9b87f5"
            strokeWidth={3}
            name="Sublimation Progress (%)"
            dot={false}
            connectNulls={true}
            isAnimationActive={false}
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
              connectNulls={true}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
