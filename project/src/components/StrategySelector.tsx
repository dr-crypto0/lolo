import React from 'react';
import { Strategy, availableStrategies } from '../strategies/types';
import { Info } from 'lucide-react';

interface StrategySelectorProps {
  selectedStrategy: Strategy;
  onStrategyChange: (strategy: Strategy) => void;
  parameters: Record<string, number>;
  onParameterChange: (key: string, value: number) => void;
}

export function StrategySelector({
  selectedStrategy,
  onStrategyChange,
  parameters,
  onParameterChange
}: StrategySelectorProps) {
  return (
    <div className="bg-gray-700 p-4 rounded-lg space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Trading Strategy
        </label>
        <select 
          value={selectedStrategy.name}
          onChange={(e) => {
            const strategy = availableStrategies.find(s => s.name === e.target.value);
            if (strategy) onStrategyChange(strategy);
          }}
          className="w-full bg-gray-600 text-white px-3 py-2 rounded-lg"
        >
          {availableStrategies.map(strategy => (
            <option key={strategy.name} value={strategy.name}>
              {strategy.name}
            </option>
          ))}
        </select>
        <p className="mt-2 text-sm text-gray-400">{selectedStrategy.description}</p>
      </div>

      <div className="space-y-4">
        <h3 className="font-medium flex items-center">
          Strategy Parameters
          <Info className="h-4 w-4 ml-2 text-gray-400" />
        </h3>
        
        {Object.entries(selectedStrategy.parameters).map(([key, param]) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center justify-between">
              <span>{param.description}</span>
              <span className="text-xs bg-gray-600 px-2 py-1 rounded">
                {parameters[key]}
              </span>
            </label>
            <input
              type="range"
              min={param.min}
              max={param.max}
              step={param.step}
              value={parameters[key]}
              onChange={(e) => onParameterChange(key, Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{param.min}</span>
              <span>{param.max}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}