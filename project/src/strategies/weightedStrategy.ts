import { 
  calculateRSI, 
  calculateMACD, 
  calculateBollingerBands, 
  calculateVolumeSignal,
  StrategyResult
} from './indicators';

export interface MarketData {
  prices: number[];
  volumes: number[];
  timestamp: number;
}

export interface BacktestProgress {
  currentCandle: number;
  totalCandles: number;
  trades: Trade[];
  equity: number[];
  initialCapital: number;
  currentCapital: number;
  isPaused: boolean;
  lastAnalysis?: {
    rsi: number;
    macd: number;
    bollingerPosition: number;
    volumeSignal: number;
    totalSignal: number;
  };
}

export interface Trade {
  timestamp: number;
  type: 'buy' | 'sell';
  price: number;
  profit?: number;
  size: number;
  indicators?: {
    rsi: number;
    macd: number;
    bollingerPosition: number;
    volumeSignal: number;
    totalSignal: number;
  };
}

export interface BacktestResult {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profit: number;
  maxDrawdown: number;
  sharpeRatio: number;
  trades: Trade[];
  equity: number[];
}

export class WeightedStrategy {
  private rsiPeriod: number;
  private signalThreshold: number;
  private position: 'none' | 'long' = 'none';
  private entryPrice: number = 0;
  private positionSize: number = 0;
  private isPaused: boolean = false;

  constructor(rsiPeriod: number = 14, signalThreshold: number = 0.6) {
    this.rsiPeriod = rsiPeriod;
    this.signalThreshold = signalThreshold;
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
  }

  async backtest(
    data: any[], 
    initialCapital: number,
    onProgress?: (progress: BacktestProgress) => void
  ): Promise<BacktestResult> {
    console.log('Starting backtest with parameters:', {
      rsiPeriod: this.rsiPeriod,
      signalThreshold: this.signalThreshold,
      dataPoints: data.length,
      initialCapital
    });

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Invalid historical data');
    }

    const trades: Trade[] = [];
    const equity: number[] = [initialCapital];
    let currentCapital = initialCapital;
    let maxCapital = initialCapital;
    let maxDrawdown = 0;
    let winningTrades = 0;
    let losingTrades = 0;

    // We need at least rsiPeriod + 1 candles for the first calculation
    const minCandles = Math.max(this.rsiPeriod + 1, 26); // 26 for MACD
    console.log(`Requiring minimum ${minCandles} candles for indicators`);
    
    for (let i = minCandles; i < data.length; i++) {
      try {
        // Check if paused
        while (this.isPaused) {
          await new Promise(resolve => setTimeout(resolve, 100));
          // Report progress while paused
          onProgress?.({
            currentCandle: i,
            totalCandles: data.length,
            trades,
            equity,
            initialCapital,
            currentCapital,
            isPaused: true,
            lastAnalysis: undefined
          });
        }

        // Calculate signals using a window of previous candles
        const window = data.slice(0, i + 1);
        const prices = window.map(d => parseFloat(d.close));
        const volumes = window.map(d => parseFloat(d.volume));
        
        const result = this.analyze({
          prices,
          volumes,
          timestamp: data[i].timestamp
        });

        const currentPrice = prices[prices.length - 1];
        
        // Store analysis results for progress reporting
        const lastAnalysis = {
          rsi: result.indicators.rsi.value,
          macd: result.indicators.macd.value,
          bollingerPosition: result.indicators.bollinger.value,
          volumeSignal: result.indicators.volume.value,
          totalSignal: result.totalSignal
        };

        // Execute trading logic
        if (this.position === 'none') {
          if (result.totalSignal > this.signalThreshold) {
            console.log(`[${new Date(data[i].timestamp).toLocaleString()}] Buy signal detected:`, lastAnalysis);
            
            // Calculate position size (use 95% of capital to leave room for fees)
            this.positionSize = (currentCapital * 0.95) / currentPrice;
            
            // Buy signal
            this.position = 'long';
            this.entryPrice = currentPrice;
            
            trades.push({
              timestamp: data[i].timestamp,
              type: 'buy',
              price: this.entryPrice,
              size: this.positionSize,
              indicators: lastAnalysis
            });
          }
        } else if (this.position === 'long') {
          if (result.totalSignal < -this.signalThreshold) {
            // Sell signal
            const exitPrice = currentPrice;
            const profit = (exitPrice - this.entryPrice) * this.positionSize;
            currentCapital += profit;
            
            console.log(`[${new Date(data[i].timestamp).toLocaleString()}] Sell signal detected:`, {
              ...lastAnalysis,
              entryPrice: this.entryPrice,
              exitPrice,
              profit
            });
            
            if (profit > 0) winningTrades++;
            else losingTrades++;

            trades.push({
              timestamp: data[i].timestamp,
              type: 'sell',
              price: exitPrice,
              profit,
              size: this.positionSize,
              indicators: lastAnalysis
            });

            this.position = 'none';
            this.positionSize = 0;
            
            maxCapital = Math.max(maxCapital, currentCapital);
            const drawdown = (maxCapital - currentCapital) / maxCapital;
            maxDrawdown = Math.max(maxDrawdown, drawdown);
          }
        }

        equity.push(currentCapital);

        // Report progress every 50 candles or at important events
        if (i % 50 === 0 || trades.length > 0) {
          onProgress?.({
            currentCandle: i,
            totalCandles: data.length,
            trades,
            equity,
            initialCapital,
            currentCapital,
            isPaused: false,
            lastAnalysis
          });
        }

        // Add a small delay to prevent UI freezing
        if (i % 100 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      } catch (error) {
        console.error('Error processing candle:', error);
        continue; // Skip this candle and continue with the next one
      }
    }

    const totalTrades = winningTrades + losingTrades;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const profit = currentCapital - initialCapital;
    
    // Calculate Sharpe Ratio
    const returns = equity.map((val, i) => 
      i === 0 ? 0 : (val - equity[i - 1]) / equity[i - 1]
    );
    const averageReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(
      returns.reduce((a, b) => a + Math.pow(b - averageReturn, 2), 0) / returns.length
    );
    const sharpeRatio = stdDev === 0 ? 0 : (averageReturn / stdDev) * Math.sqrt(252); // Annualized

    console.log('Backtest completed:', {
      totalTrades,
      winRate,
      profit,
      maxDrawdown: maxDrawdown * 100,
      sharpeRatio
    });

    return {
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      profit,
      maxDrawdown: maxDrawdown * 100,
      sharpeRatio,
      trades,
      equity
    };
  }

  analyze(data: MarketData): StrategyResult {
    // Calculate individual indicator signals
    const rsi = calculateRSI(data.prices, this.rsiPeriod);
    const macd = calculateMACD(data.prices);
    const bollinger = calculateBollingerBands(data.prices);
    const volume = calculateVolumeSignal(data.volumes);

    // Calculate weighted signal
    const signals = [rsi, macd, bollinger, volume];
    let totalSignal = 0;

    signals.forEach(indicator => {
      const signalValue = indicator.signal === 'buy' ? 1 : 
                         indicator.signal === 'sell' ? -1 : 0;
      totalSignal += signalValue * indicator.weight;
    });

    // Determine final recommendation
    const recommendation = totalSignal > this.signalThreshold ? 'buy' :
                         totalSignal < -this.signalThreshold ? 'sell' : 
                         'neutral';

    return {
      totalSignal,
      recommendation,
      indicators: {
        rsi,
        macd,
        bollinger,
        volume
      }
    };
  }
}