import React, { useState } from 'react';
import {
  LineChart,
  ArrowUpDown,
  Settings,
  Activity,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Sliders,
  Save,
  Plus,
  History,
  PlayCircle,
  Download,
  BarChart3,
  RefreshCw,
  Trash2,
  Wallet,
  TrendingDown,
  Layers
} from 'lucide-react';
import { Strategy, availableStrategies } from './strategies/types';
import { StrategySelector } from './components/StrategySelector';
import { HistoricalDataManager } from './components/HistoricalDataManager';
import { WeightedStrategy } from './strategies/weightedStrategy';
import { BacktestChart } from './components/BacktestChart';
import { TradingInterface, OrderDetails } from './components/TradingInterface';

type TradingMode = 'backtest' | 'spot' | 'futures';

function App() {
  const [selectedPair, setSelectedPair] = useState('BTC/USDT');
  const [botStatus, setBotStatus] = useState('active');
  const [showStrategyModal, setShowStrategyModal] = useState(false);
  const [showBacktest, setShowBacktest] = useState(false);
  const [backtestStatus, setBacktestStatus] = useState('idle');
  const [backtestResults, setBacktestResults] = useState<any>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy>(availableStrategies[0]);
  const [strategyParameters, setStrategyParameters] = useState<Record<string, number>>(
    Object.fromEntries(
      Object.entries(availableStrategies[0].parameters).map(([key, param]) => [key, param.default])
    )
  );
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [backtestProgress, setBacktestProgress] = useState<any>(null);
  const [fetchProgress, setFetchProgress] = useState<Array<{
    timestamp: string;
    message: string;
    type: 'info' | 'error' | 'success';
  }>>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [strategy, setStrategy] = useState<WeightedStrategy | null>(null);
  const [tradingMode, setTradingMode] = useState<TradingMode>('backtest');
  
  const tradingPairs = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'ADA/USDT'];

  const addProgress = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setFetchProgress(prev => [...prev, {
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    }]);
  };

  const clearProgress = () => {
    setFetchProgress([]);
  };

  const handleHistoricalDataFetched = (data: any[]) => {
    setHistoricalData(data);
  };

  const handlePlaceOrder = (order: OrderDetails) => {
    console.log('Placing order:', order);
    // Here you would typically send the order to your trading backend
    // For now, we'll just show it in the logs
    addProgress(
      `New ${order.type} ${order.side} order: ${order.amount} ${selectedPair} ${
        order.type === 'limit' ? `@ ${order.price}` : ''
      }${order.leverage ? ` (${order.leverage}x)` : ''}`,
      'info'
    );
  };

  const runBacktest = async () => {
    if (historicalData.length === 0) {
      alert('Please fetch historical data first');
      return;
    }

    setBacktestStatus('running');
    setBacktestProgress(null);
    
    try {
      const newStrategy = new WeightedStrategy(
        strategyParameters.rsiPeriod,
        strategyParameters.signalThreshold
      );
      setStrategy(newStrategy);

      const initialCapital = 1000;
      
      const results = await newStrategy.backtest(
        historicalData,
        initialCapital,
        (progress) => {
          setBacktestProgress(progress);
          setIsPaused(progress.isPaused);
        }
      );

      setBacktestResults({
        totalTrades: results.totalTrades,
        winRate: results.winRate,
        profit: results.profit,
        maxDrawdown: results.maxDrawdown,
        sharpeRatio: results.sharpeRatio,
        trades: results.trades,
        equity: results.equity
      });
      
      setBacktestStatus('completed');
    } catch (error) {
      console.error('Backtest error:', error);
      alert('Error running backtest. Please try again.');
      setBacktestStatus('idle');
    }
  };

  const togglePause = () => {
    if (!strategy) return;
    
    if (isPaused) {
      strategy.resume();
    } else {
      strategy.pause();
    }
    setIsPaused(!isPaused);
  };

  const BacktestSection = () => (
    <div className="col-span-12 bg-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <History className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold">Strategy Backtesting</h2>
        </div>
        <button 
          onClick={() => setShowBacktest(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-4 space-y-6">
          <div className="bg-gray-700 p-4 rounded-lg">
            <h3 className="font-medium mb-4">Strategy Configuration</h3>
            <StrategySelector
              selectedStrategy={selectedStrategy}
              onStrategyChange={(strategy) => {
                setSelectedStrategy(strategy);
                setStrategyParameters(
                  Object.fromEntries(
                    Object.entries(strategy.parameters).map(([key, param]) => [key, param.default])
                  )
                );
              }}
              parameters={strategyParameters}
              onParameterChange={(key, value) => {
                setStrategyParameters(prev => ({
                  ...prev,
                  [key]: value
                }));
              }}
            />
          </div>

          <HistoricalDataManager 
            onDataFetched={handleHistoricalDataFetched}
            progress={fetchProgress}
            onAddProgress={addProgress}
            onClearProgress={clearProgress}
          />

          <div className="bg-gray-700 p-4 rounded-lg">
            <h3 className="font-medium mb-4">Test Configuration</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Initial Capital
                </label>
                <input
                  type="number"
                  defaultValue="1000"
                  className="w-full bg-gray-600 text-white px-3 py-2 rounded-lg"
                />
              </div>

              <div className="pt-4 space-y-2">
                <div className="flex space-x-2">
                  <button 
                    className={`flex-1 py-3 rounded-lg font-semibold flex items-center justify-center ${
                      historicalData.length === 0 
                        ? 'bg-gray-600 cursor-not-allowed'
                        : backtestStatus === 'running'
                        ? 'bg-gray-600 cursor-not-allowed'
                        : 'bg-blue-500 hover:bg-blue-600'
                    }`}
                    onClick={runBacktest}
                    disabled={historicalData.length === 0 || backtestStatus === 'running'}
                  >
                    {backtestStatus === 'running' && !isPaused ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Running Backtest...
                        {backtestProgress && (
                          <span className="ml-2">
                            ({Math.round((backtestProgress.currentCandle / backtestProgress.totalCandles) * 100)}%)
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-4 h-4 mr-2" />
                        Run Strategy Test
                      </>
                    )}
                  </button>

                  {backtestStatus === 'running' && (
                    <button
                      onClick={togglePause}
                      className={`px-4 rounded-lg font-semibold ${
                        isPaused 
                          ? 'bg-green-500 hover:bg-green-600'
                          : 'bg-yellow-500 hover:bg-yellow-600'
                      }`}
                    >
                      {isPaused ? 'Resume' : 'Pause'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-8">
          {backtestStatus === 'idle' && (
            <div className="h-full bg-gray-700 rounded-lg flex items-center justify-center text-gray-400">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                <p>Configure and run a backtest to see results</p>
                {historicalData.length === 0 && (
                  <p className="text-sm mt-2">Start by fetching historical data</p>
                )}
              </div>
            </div>
          )}

          {backtestStatus === 'running' && backtestProgress && (
            <div className="space-y-6">
              <div className="bg-gray-700 p-4 rounded-lg">
                <BacktestChart 
                  candles={historicalData.slice(0, backtestProgress.currentCandle + 1)}
                  trades={backtestProgress.trades}
                  onCandleHover={(index) => {
                    console.log('Hovering candle:', historicalData[index]);
                  }}
                />
              </div>
              <div className="bg-gray-700 p-4 rounded-lg space-y-2">
                <p>Processing candle {backtestProgress.currentCandle} of {backtestProgress.totalCandles}</p>
                <p>Trades found: {backtestProgress.trades.length}</p>
                <p>Current capital: ${backtestProgress.currentCapital.toFixed(2)}</p>
                {backtestProgress.trades.length > 0 && (
                  <div className="bg-gray-800 p-2 rounded mt-2">
                    <p className="font-medium">Latest trade:</p>
                    <p>Type: {backtestProgress.trades[backtestProgress.trades.length - 1].type}</p>
                    <p>Price: ${backtestProgress.trades[backtestProgress.trades.length - 1].price.toFixed(2)}</p>
                    {backtestProgress.trades[backtestProgress.trades.length - 1].profit && (
                      <p className={backtestProgress.trades[backtestProgress.trades.length - 1].profit > 0 ? 'text-green-400' : 'text-red-400'}>
                        Profit: ${backtestProgress.trades[backtestProgress.trades.length - 1].profit.toFixed(2)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {backtestStatus === 'completed' && backtestResults && (
            <div className="space-y-6">
              <div className="bg-gray-700 p-4 rounded-lg">
                <BacktestChart 
                  candles={historicalData}
                  trades={backtestResults.trades}
                  onCandleHover={(index) => {
                    console.log('Hovering candle:', historicalData[index]);
                  }}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-700 p-4 rounded-lg">
                  <p className="text-sm text-gray-400 mb-1">Total Trades</p>
                  <p className="text-2xl font-bold">{backtestResults.totalTrades}</p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <p className="text-sm text-gray-400 mb-1">Win Rate</p>
                  <p className="text-2xl font-bold text-green-400">{backtestResults.winRate.toFixed(1)}%</p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <p className="text-sm text-gray-400 mb-1">Net Profit</p>
                  <p className="text-2xl font-bold text-green-400">+${backtestResults.profit.toFixed(2)}</p>
                </div>
              </div>

              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="font-medium mb-4">Performance Metrics</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">Max Drawdown</span>
                      <span className="text-red-400">{backtestResults.maxDrawdown.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-2">
                      <div 
                        className="bg-red-400 h-2 rounded-full"
                        style={{ width: `${backtestResults.maxDrawdown}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">Sharpe Ratio</span>
                      <span className="text-green-400">{backtestResults.sharpeRatio.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-2">
                      <div 
                        className="bg-green-400 h-2 rounded-full"
                        style={{ width: `${(backtestResults.sharpeRatio/3)*100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">Equity Curve</h3>
                  <button className="text-blue-400 hover:text-blue-300">
                    <Download className="h-4 w-4" />
                  </button>
                </div>
                <div className="h-[200px] flex items-center justify-center border border-gray-600 rounded-lg">
                  <LineChart className="h-12 w-12 text-gray-500" />
                  <span className="ml-2 text-gray-500">Equity curve visualization would go here</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const StrategyModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Strategy Configuration</h2>
          <button 
            onClick={() => setShowStrategyModal(false)}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Select Strategy
            </label>
            <select 
              value={selectedStrategy.name}
              onChange={(e) => {
                const strategy = availableStrategies.find(s => s.name === e.target.value);
                if (strategy) setSelectedStrategy(strategy);
              }}
              className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg"
            >
              {availableStrategies.map(strategy => (
                <option key={strategy.name} value={strategy.name}>
                  {strategy.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-4">Parameters</h3>
            {Object.entries(selectedStrategy.parameters).map(([key, param]) => (
              <div key={key} className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </label>
                <input
                  type="number"
                  value={strategyParameters[key]}
                  onChange={(e) => {
                    setStrategyParameters(prev => ({
                      ...prev,
                      [key]: Number(e.target.value)
                    }));
                  }}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg"
                />
              </div>
            ))}
          </div>
          
          <div className="flex justify-end space-x-4">
            <button 
              onClick={() => setShowStrategyModal(false)}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
            >
              Cancel
            </button>
            <button 
              onClick={() => {
                setShowStrategyModal(false);
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Strategy
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white relative">
      {showStrategyModal && <StrategyModal />}
      
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="h-6 w-6 text-blue-400" />
            <h1 className="text-xl font-bold">CryptoTrader AI</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setTradingMode('spot')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                tradingMode === 'spot' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <Wallet className="h-4 w-4" />
              <span>Spot Trading</span>
            </button>
            <button 
              onClick={() => setTradingMode('futures')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                tradingMode === 'futures' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>Futures</span>
            </button>
            <button 
              onClick={() => setTradingMode('backtest')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                tradingMode === 'backtest' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <History className="h-4 w-4" />
              <span>Backtest</span>
            </button>
            <button className="flex items-center space-x-2 bg-gray-700 px-3 py-2 rounded-lg hover:bg-gray-600">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-6 pb-48">
        <div className="grid grid-cols-12 gap-6">
          {tradingMode === 'backtest' ? (
            <BacktestSection />
          ) : (
            <>
              <div className="col-span-12 grid grid-cols-3 gap-6">
                <div className="bg-gray-800 p-6 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400">Total Profit</p>
                      <h3 className="text-2xl font-bold text-green-400">+$12,847.23</h3>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-400" />
                  </div>
                </div>
                <div className="bg-gray-800 p-6 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400">Win Rate</p>
                      <h3 className="text-2xl font-bold text-blue-400">76.4%</h3>
                    </div>
                    <TrendingUp className="h-8 w-8 text-blue-400" />
                  </div>
                </div>
                <div className="bg-gray-800 p-6 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400">Bot Status</p>
                      <h3 className="text-2xl font-bold text-green-400">Active</h3>
                    </div>
                    <Activity className="h-8 w-8 text-green-400" />
                  </div>
                </div>
              </div>

              <div className="col-span-8 bg-gray-800 p-6 rounded-xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">Price Chart</h2>
                  <select 
                    value={selectedPair}
                    onChange={(e) => setSelectedPair(e.target.value)}
                    className="bg-gray-700 text-white px-3 py-2 rounded-lg"
                  >
                    {tradingPairs.map(pair => (
                      <option key={pair} value={pair}>{pair}</option>
                    ))}
                  </select>
                </div>
                <div className="h-[400px] flex items-center justify-center border border-gray-700 rounded-lg">
                  <LineChart className="h-12 w-12 text-gray-500" />
                  <span className="ml-2 text-gray-500">Chart visualization would go here</span>
                </div>
              </div>

              <div className="col-span-4">
                <TradingInterface
                  mode={tradingMode}
                  selectedPair={selectedPair}
                  strategies={availableStrategies}
                  onPlaceOrder={handlePlaceOrder}
                />
              </div>

              <div className="col-span-12 bg-gray-800 rounded-xl p-6">
                <h2 className="text-xl font-bold mb-4">Recent Trades</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-gray-400">
                        <th className="pb-4">Pair</th>
                        <th className="pb-4">Type</th>
                        <th className="pb-4">Entry</th>
                        <th className="pb-4">Exit</th>
                        <th className="pb-4">Profit/Loss</th>
                        <th className="pb-4">Time</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      <tr className="border-t border-gray-700">
                        <td className="py-4">BTC/USDT</td>
                        <td className="py-4 text-green-400">Long</td>
                        <td className="py-4">$42,850.00</td>
                        <td className="py-4">$43,250.00</td>
                        <td className="py-4 text-green-400">+$400.00</td>
                        <td className="py-4 text-gray-400">2 mins ago</td>
                      </tr>
                      <tr className="border-t border-gray-700">
                        <td className="py-4">ETH/USDT</td>
                        <td className="py-4 text-red-400">Short</td>
                        <td className="py-4">$2,320.00</td>
                        <td className="py-4">$2,280.50</td>
                        <td className="py-4 text-green-400">+$39.50</td>
                        <td className="py-4 text-gray-400">15 mins ago</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700">
        <div className="container mx-auto">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
            <h3 className="text-sm font-medium">System Log</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={clearProgress}
                className="text-gray-400 hover:text-red-400 p-1"
                title="Clear log"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="h-32 overflow-y-auto p-2">
            {fetchProgress.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-4">
                No activity to show
              </div>
            ) : (
              <div className="space-y-1 text-xs font-mono">
                {fetchProgress.map((entry, index) => (
                  <div 
                    key={index} 
                    className={`${
                      entry.type === 'error' ? 'text-red-400' :
                      entry.type === 'success' ? 'text-green-400' :
                      'text-gray-400'
                    }`}
                  >
                    <span className="text-gray-500">[{entry.timestamp}]</span> {entry.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;