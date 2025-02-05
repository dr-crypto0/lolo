import React from 'react';
import { StrategyResult } from '../strategies/indicators';
import { Activity, TrendingUp, TrendingDown } from 'lucide-react';

interface StrategyIndicatorsProps {
  result: StrategyResult;
}

export function StrategyIndicators({ result }: StrategyIndicatorsProps) {
  const getSignalColor = (signal: 'buy' | 'sell' | 'neutral') => {
    switch (signal) {
      case 'buy': return 'text-green-400';
      case 'sell': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getSignalIcon = (signal: 'buy' | 'sell' | 'neutral') => {
    switch (signal) {
      case 'buy': return <TrendingUp className="h-4 w-4" />;
      case 'sell': return <TrendingDown className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const indicators = [
    { name: 'RSI', ...result.indicators.rsi },
    { name: 'MACD', ...result.indicators.macd },
    { name: 'Bollinger', ...result.indicators.bollinger },
    { name: 'Volume', ...result.indicators.volume }
  ];

  return (
    <div className="bg-gray-800 p-6 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Strategy Indicators</h2>
        <div className={`flex items-center ${getSignalColor(result.recommendation)}`}>
          {getSignalIcon(result.recommendation)}
          <span className="ml-2 font-semibold">
            {result.recommendation.toUpperCase()}
          </span>
        </div>
      </div>
      
      <div className="space-y-4">
        {indicators.map(indicator => (
          <div key={indicator.name} className="bg-gray-700 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">{indicator.name}</span>
              <div className={`flex items-center ${getSignalColor(indicator.signal)}`}>
                {getSignalIcon(indicator.signal)}
                <span className="ml-2">{indicator.signal.toUpperCase()}</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-400">
              <span>Weight: {indicator.weight * 100}%</span>
              <span>Value: {indicator.value.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 pt-4 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Total Signal</span>
          <span className={`font-bold ${
            result.totalSignal > 0 ? 'text-green-400' : 
            result.totalSignal < 0 ? 'text-red-400' : 
            'text-gray-400'
          }`}>
            {result.totalSignal.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}