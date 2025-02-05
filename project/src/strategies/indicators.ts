// Technical indicators implementation
export interface IndicatorResult {
  value: number;
  signal: 'buy' | 'sell' | 'neutral';
  weight: number;
}

export interface StrategyResult {
  totalSignal: number;
  recommendation: 'buy' | 'sell' | 'neutral';
  indicators: {
    rsi: IndicatorResult;
    macd: IndicatorResult;
    bollinger: IndicatorResult;
    volume: IndicatorResult;
  };
}

// RSI (Relative Strength Index)
export function calculateRSI(prices: number[], period: number = 14): IndicatorResult {
  // Simplified RSI calculation
  const rsiValue = calculateSimpleRSI(prices, period);
  
  return {
    value: rsiValue,
    signal: rsiValue > 70 ? 'sell' : rsiValue < 30 ? 'buy' : 'neutral',
    weight: 0.3 // 30% weight
  };
}

// MACD (Moving Average Convergence Divergence)
export function calculateMACD(prices: number[]): IndicatorResult {
  // Simplified MACD calculation
  const macdValue = calculateSimpleMACD(prices);
  
  return {
    value: macdValue,
    signal: macdValue > 0 ? 'buy' : macdValue < 0 ? 'sell' : 'neutral',
    weight: 0.25 // 25% weight
  };
}

// Bollinger Bands
export function calculateBollingerBands(prices: number[]): IndicatorResult {
  // Simplified Bollinger Bands calculation
  const { upper, lower, middle } = calculateSimpleBollinger(prices);
  const currentPrice = prices[prices.length - 1];
  
  return {
    value: currentPrice,
    signal: currentPrice > upper ? 'sell' : currentPrice < lower ? 'buy' : 'neutral',
    weight: 0.25 // 25% weight
  };
}

// Volume Analysis
export function calculateVolumeSignal(volumes: number[]): IndicatorResult {
  // Simplified volume analysis
  const volumeSignal = analyzeVolume(volumes);
  
  return {
    value: volumeSignal,
    signal: volumeSignal > 1.5 ? 'buy' : volumeSignal < 0.5 ? 'sell' : 'neutral',
    weight: 0.2 // 20% weight
  };
}

// Helper functions for calculations
function calculateSimpleRSI(prices: number[], period: number): number {
  const gains = [];
  const losses = [];
  
  for (let i = 1; i < prices.length; i++) {
    const difference = prices[i] - prices[i - 1];
    if (difference >= 0) {
      gains.push(difference);
      losses.push(0);
    } else {
      gains.push(0);
      losses.push(Math.abs(difference));
    }
  }
  
  const avgGain = average(gains.slice(-period));
  const avgLoss = average(losses.slice(-period));
  
  if (avgLoss === 0) return 100;
  
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateSimpleMACD(prices: number[]): number {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  return ema12 - ema26;
}

function calculateSimpleBollinger(prices: number[]): { upper: number; lower: number; middle: number } {
  const period = 20;
  const standardDeviations = 2;
  
  const sma = average(prices.slice(-period));
  const stdDev = calculateStandardDeviation(prices.slice(-period));
  
  return {
    upper: sma + (standardDeviations * stdDev),
    lower: sma - (standardDeviations * stdDev),
    middle: sma
  };
}

function analyzeVolume(volumes: number[]): number {
  const recentVolume = average(volumes.slice(-5));
  const historicalVolume = average(volumes.slice(-20, -5));
  return recentVolume / historicalVolume;
}

// Utility functions
function average(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function calculateEMA(prices: number[], period: number): number {
  const multiplier = 2 / (period + 1);
  let ema = average(prices.slice(0, period));
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  
  return ema;
}

function calculateStandardDeviation(values: number[]): number {
  const avg = average(values);
  const squareDiffs = values.map(value => Math.pow(value - avg, 2));
  return Math.sqrt(average(squareDiffs));
}