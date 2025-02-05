import React, { useState } from 'react';
import { Strategy } from '../strategies/types';
import { AlertTriangle, DollarSign, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { TradingService } from '../lib/trading';

interface TradingInterfaceProps {
  mode: 'spot' | 'futures';
  selectedPair: string;
  strategies: Strategy[];
  onPlaceOrder: (order: OrderDetails) => void;
}

export type OrderType = 'market' | 'limit' | 'strategy';
export type OrderSide = 'buy' | 'sell';

export interface OrderDetails {
  type: OrderType;
  side: OrderSide;
  pair: string;
  amount: number;
  price?: number;
  leverage?: number;
  marginType?: 'ISOLATED' | 'CROSSED';
  positionSide?: 'BOTH' | 'LONG' | 'SHORT';
  strategy?: Strategy;
  stopLoss?: number;
  takeProfit?: number;
}

export interface BinanceOrderResponse {
  orderId: string;
  executedQty: string;
  status: string;
  [key: string]: any;
}

export function TradingInterface({ mode, selectedPair, strategies, onPlaceOrder }: TradingInterfaceProps) {
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [orderSide, setOrderSide] = useState<OrderSide>('buy');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [leverage, setLeverage] = useState('1');
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const resetForm = () => {
    setAmount('');
    setPrice('');
    setStopLoss('');
    setTakeProfit('');
    setError(null);
    setSuccessMessage(null);
  };

  const validateForm = () => {
    if (!amount || parseFloat(amount) <= 0) {
      throw new Error('Please enter a valid amount');
    }

    if (orderType === 'limit' && (!price || parseFloat(price) <= 0)) {
      throw new Error('Please enter a valid price for limit order');
    }

    if (stopLoss && parseFloat(stopLoss) <= 0) {
      throw new Error('Please enter a valid stop loss price');
    }

    if (takeProfit && parseFloat(takeProfit) <= 0) {
      throw new Error('Please enter a valid take profit price');
    }

    if (mode === 'futures' && (!leverage || parseFloat(leverage) < 1 || parseFloat(leverage) > 125)) {
      throw new Error('Leverage must be between 1x and 125x');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      // Validate form inputs
      validateForm();

      const order: OrderDetails = {
        type: orderType,
        side: orderSide,
        pair: selectedPair,
        amount: parseFloat(amount),
        ...(orderType === 'limit' && { price: parseFloat(price) }),
        ...(mode === 'futures' && { leverage: parseFloat(leverage) }),
        ...(orderType === 'strategy' && selectedStrategy && { strategy: selectedStrategy }),
        ...(stopLoss && { stopLoss: parseFloat(stopLoss) }),
        ...(takeProfit && { takeProfit: parseFloat(takeProfit) })
      };

      const result = await TradingService.placeOrder(order, mode);
      
      if (result.success) {
        onPlaceOrder(order);
        setSuccessMessage(`Order placed successfully! Order ID: ${result.orderId}`);
        resetForm();
      } else {
        throw new Error(result.error || 'Failed to place order. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-xl">
      <h2 className="text-xl font-bold mb-6">Place Order</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center text-red-400">
          <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center text-green-400">
          <TrendingUp className="h-4 w-4 mr-2 flex-shrink-0" />
          <p className="text-sm">{successMessage}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Order Type Selection */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setOrderType('market')}
            className={`py-2 px-4 rounded-lg font-medium ${
              orderType === 'market'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Market
          </button>
          <button
            type="button"
            onClick={() => setOrderType('limit')}
            className={`py-2 px-4 rounded-lg font-medium ${
              orderType === 'limit'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Limit
          </button>
          <button
            type="button"
            onClick={() => setOrderType('strategy')}
            className={`py-2 px-4 rounded-lg font-medium ${
              orderType === 'strategy'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Strategy
          </button>
        </div>

        {/* Buy/Sell Selection */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setOrderSide('buy')}
            className={`py-3 px-4 rounded-lg font-medium flex items-center justify-center ${
              orderSide === 'buy'
                ? 'bg-green-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Buy/Long
          </button>
          <button
            type="button"
            onClick={() => setOrderSide('sell')}
            className={`py-3 px-4 rounded-lg font-medium flex items-center justify-center ${
              orderSide === 'sell'
                ? 'bg-red-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <TrendingDown className="w-4 h-4 mr-2" />
            Sell/Short
          </button>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Amount ({mode === 'spot' ? selectedPair.split('/')[0] : 'USD'})
          </label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg"
              placeholder="Enter amount"
              required
              min="0"
              step="any"
            />
            <DollarSign className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>

        {/* Limit Price (for Limit Orders) */}
        {orderType === 'limit' && (
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Limit Price (USDT)
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg"
              placeholder="Enter limit price"
              required
              min="0"
              step="any"
            />
          </div>
        )}

        {/* Strategy Selection (for Strategy Orders) */}
        {orderType === 'strategy' && (
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Trading Strategy
            </label>
            <select
              value={selectedStrategy?.name || ''}
              onChange={(e) => {
                const strategy = strategies.find(s => s.name === e.target.value);
                setSelectedStrategy(strategy || null);
              }}
              className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg"
              required
            >
              <option value="">Select a strategy</option>
              {strategies.map(strategy => (
                <option key={strategy.name} value={strategy.name}>
                  {strategy.name}
                </option>
              ))}
            </select>
            {selectedStrategy && (
              <p className="mt-2 text-sm text-gray-400">
                {selectedStrategy.description}
              </p>
            )}
          </div>
        )}

        {/* Futures-specific Controls */}
        {mode === 'futures' && (
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Leverage (x)
            </label>
            <input
              type="number"
              value={leverage}
              onChange={(e) => setLeverage(e.target.value)}
              min="1"
              max="125"
              className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg"
              required
            />
            {parseFloat(leverage) > 20 && (
              <div className="mt-2 text-yellow-500 flex items-center text-sm">
                <AlertTriangle className="h-4 w-4 mr-1" />
                High leverage increases liquidation risk
              </div>
            )}
          </div>
        )}

        {/* Stop Loss & Take Profit */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Stop Loss (optional)
            </label>
            <input
              type="number"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg"
              placeholder="Price"
              min="0"
              step="any"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Take Profit (optional)
            </label>
            <input
              type="number"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg"
              placeholder="Price"
              min="0"
              step="any"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center ${
            isLoading
              ? 'bg-gray-600 cursor-not-allowed'
              : orderSide === 'buy'
              ? 'bg-green-500 hover:bg-green-600'
              : 'bg-red-500 hover:bg-red-600'
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Placing Order...
            </>
          ) : (
            orderSide === 'buy' ? 'Place Buy Order' : 'Place Sell Order'
          )}
        </button>
      </form>
    </div>
  );
}
