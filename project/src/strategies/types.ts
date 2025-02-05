export interface Strategy {
  name: string;
  description: string;
  type: string;
  parameters: Record<string, {
    type: 'number';
    default: number;
    min?: number;
    max?: number;
    step?: number;
    description: string;
  }>;
}

import { innovativeStrategies } from './innovativeStrategies';

export const availableStrategies: Strategy[] = [
  {
    name: 'Weighted Multi-Indicator',
    description: 'Combines RSI, MACD, Bollinger Bands, and Volume analysis with customizable weights for short-term trading',
    type: 'weighted',
    parameters: {
      rsiPeriod: {
        type: 'number',
        default: 14,
        min: 2,
        max: 30,
        step: 1,
        description: 'RSI calculation period'
      },
      signalThreshold: {
        type: 'number',
        default: 0.6,
        min: 0.1,
        max: 1,
        step: 0.1,
        description: 'Signal strength threshold for trade execution'
      },
      rsiWeight: {
        type: 'number',
        default: 0.3,
        min: 0,
        max: 1,
        step: 0.05,
        description: 'Weight of RSI signal'
      },
      macdWeight: {
        type: 'number',
        default: 0.25,
        min: 0,
        max: 1,
        step: 0.05,
        description: 'Weight of MACD signal'
      },
      bollingerWeight: {
        type: 'number',
        default: 0.25,
        min: 0,
        max: 1,
        step: 0.05,
        description: 'Weight of Bollinger Bands signal'
      },
      volumeWeight: {
        type: 'number',
        default: 0.2,
        min: 0,
        max: 1,
        step: 0.05,
        description: 'Weight of Volume signal'
      }
    }
  },
  {
    name: 'Moving Average Crossover',
    description: 'Classic strategy using fast and slow moving average crossovers',
    type: 'ma_cross',
    parameters: {
      fastPeriod: {
        type: 'number',
        default: 9,
        min: 2,
        max: 50,
        step: 1,
        description: 'Fast moving average period'
      },
      slowPeriod: {
        type: 'number',
        default: 21,
        min: 5,
        max: 200,
        step: 1,
        description: 'Slow moving average period'
      },
      stopLoss: {
        type: 'number',
        default: 2.5,
        min: 0.1,
        max: 10,
        step: 0.1,
        description: 'Stop loss percentage'
      },
      takeProfit: {
        type: 'number',
        default: 5,
        min: 0.1,
        max: 20,
        step: 0.1,
        description: 'Take profit percentage'
      }
    }
  },
  {
    name: 'RSI + MACD Confluence',
    description: 'Combines RSI and MACD indicators for trend confirmation',
    type: 'rsi_macd',
    parameters: {
      rsiPeriod: {
        type: 'number',
        default: 14,
        min: 2,
        max: 30,
        step: 1,
        description: 'RSI calculation period'
      },
      rsiOverbought: {
        type: 'number',
        default: 70,
        min: 50,
        max: 90,
        step: 1,
        description: 'RSI overbought level'
      },
      rsiOversold: {
        type: 'number',
        default: 30,
        min: 10,
        max: 50,
        step: 1,
        description: 'RSI oversold level'
      },
      macdFast: {
        type: 'number',
        default: 12,
        min: 2,
        max: 50,
        step: 1,
        description: 'MACD fast period'
      },
      macdSlow: {
        type: 'number',
        default: 26,
        min: 5,
        max: 100,
        step: 1,
        description: 'MACD slow period'
      },
      macdSignal: {
        type: 'number',
        default: 9,
        min: 2,
        max: 30,
        step: 1,
        description: 'MACD signal period'
      }
    }
  },
  ...innovativeStrategies
];