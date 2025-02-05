import { spotAPI, futuresAPI } from './binance';
import { OrderDetails, OrderType, OrderSide, BinanceOrderResponse } from '../components/TradingInterface';
import { Strategy } from '../strategies/types';

interface OrderResponse {
  success: boolean;
  orderId?: string;
  executedQty?: string;
  status?: string;
  error?: string;
  data?: BinanceOrderResponse | BinanceOrderResponse[];
}

interface SpotAccountInfo {
  makerCommission: number;
  takerCommission: number;
  buyerCommission: number;
  sellerCommission: number;
  canTrade: boolean;
  canWithdraw: boolean;
  canDeposit: boolean;
  balances: Array<{
    asset: string;
    free: string;
    locked: string;
  }>;
}

interface FuturesAccountInfo {
  feeTier: number;
  canTrade: boolean;
  canDeposit: boolean;
  canWithdraw: boolean;
  updateTime: number;
  totalInitialMargin: string;
  totalMaintMargin: string;
  totalWalletBalance: string;
  totalUnrealizedProfit: string;
  totalMarginBalance: string;
  totalPositionInitialMargin: string;
  totalOpenOrderInitialMargin: string;
  positions: Array<{
    symbol: string;
    initialMargin: string;
    maintMargin: string;
    unrealizedProfit: string;
    positionInitialMargin: string;
    openOrderInitialMargin: string;
    leverage: string;
    isolated: boolean;
    entryPrice: string;
    maxNotional: string;
    positionSide: string;
    positionAmt: string;
  }>;
}

interface FuturesConfig {
  leverage?: number;
  marginType?: 'ISOLATED' | 'CROSSED';
  positionSide?: 'BOTH' | 'LONG' | 'SHORT';
}

interface PriceTickerResponse {
  price: string;
  symbol: string;
}

interface ExchangeSymbolInfo {
  symbol: string;
  status?: string;
  contractType?: string;
  [key: string]: any;
}

interface ExchangeInfo {
  symbols: ExchangeSymbolInfo[];
  [key: string]: any;
}

interface BinanceApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class TradingService {
  private static formatSymbol(pair: string): string {
    return pair.replace('/', '').toUpperCase();
  }

  private static getAPI(mode: 'spot' | 'futures') {
    return mode === 'spot' ? spotAPI : futuresAPI;
  }

  private static async validateOrder(order: OrderDetails, mode: 'spot' | 'futures'): Promise<void> {
    if (!order.pair) {
      throw new Error('Trading pair is required');
    }

    if (!order.amount || order.amount <= 0) {
      throw new Error('Invalid order amount');
    }

    if (order.type === 'limit' && (!order.price || order.price <= 0)) {
      throw new Error('Price is required for limit orders');
    }

    if (order.stopLoss && order.stopLoss <= 0) {
      throw new Error('Invalid stop loss price');
    }

    if (order.takeProfit && order.takeProfit <= 0) {
      throw new Error('Invalid take profit price');
    }

    // Futures specific validations
    if (mode === 'futures') {
      if (order.leverage) {
        if (order.leverage < 1 || order.leverage > 125) {
          throw new Error('Leverage must be between 1x and 125x');
        }
        // Set leverage
        const api = this.getAPI(mode);
        const leverageResponse = await api.setLeverage(this.formatSymbol(order.pair), order.leverage);
        if (!leverageResponse.success) {
          throw new Error(`Failed to set leverage: ${leverageResponse.error}`);
        }
      }

      if (order.marginType) {
        // Set margin type
        const api = this.getAPI(mode);
        const marginResponse = await api.setMarginType(this.formatSymbol(order.pair), order.marginType);
        if (!marginResponse.success && !marginResponse.error?.includes('already')) {
          throw new Error(`Failed to set margin type: ${marginResponse.error}`);
        }
      }
    }
  }

  private static async configureFuturesAccount(symbol: string, config?: FuturesConfig): Promise<void> {
    if (!config) return;

    const api = this.getAPI('futures');

    // Set position mode if specified
    if (config.positionSide) {
      const positionModeResponse = await api.setPositionMode(config.positionSide === 'BOTH');
      if (!positionModeResponse.success && !positionModeResponse.error?.includes('already')) {
        throw new Error(`Failed to set position mode: ${positionModeResponse.error}`);
      }
    }

    // Set leverage if specified
    if (config.leverage) {
      const leverageResponse = await api.setLeverage(symbol, config.leverage);
      if (!leverageResponse.success) {
        throw new Error(`Failed to set leverage: ${leverageResponse.error}`);
      }
    }

    // Set margin type if specified
    if (config.marginType) {
      const marginResponse = await api.setMarginType(symbol, config.marginType);
      if (!marginResponse.success && !marginResponse.error?.includes('already')) {
        throw new Error(`Failed to set margin type: ${marginResponse.error}`);
      }
    }
  }

  private static async validateSymbol(symbol: string, mode: 'spot' | 'futures'): Promise<void> {
    try {
      const api = this.getAPI(mode);
      const response = await api.getExchangeInfo();
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to validate trading pair');
      }

      const exchangeInfo = response.data as ExchangeInfo;
      const symbolInfo = exchangeInfo.symbols.find(s => s.symbol === symbol);
      
      if (!symbolInfo) {
        throw new Error(`Trading pair ${symbol} is not available`);
      }

      if (mode === 'spot' && !symbolInfo.status?.toLowerCase().includes('trading')) {
        throw new Error(`Spot trading is not available for ${symbol}`);
      }

      if (mode === 'futures' && !symbolInfo.contractType) {
        throw new Error(`Futures trading is not available for ${symbol}`);
      }
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to validate trading pair');
    }
  }

  private static async validateAPIKeys(): Promise<void> {
    const api = this.getAPI('spot');
    const response = await api.getAccountInfo();
    
    if (!response.success) {
      throw new Error('Invalid API keys or insufficient permissions. Please check your API configuration.');
    }
  }

  static async placeOrder(order: OrderDetails, mode: 'spot' | 'futures', futuresConfig?: FuturesConfig): Promise<OrderResponse> {
    try {
      // First validate API keys
      await this.validateAPIKeys();

      // Configure futures account if needed
      if (mode === 'futures' && futuresConfig) {
        await this.configureFuturesAccount(this.formatSymbol(order.pair), futuresConfig);
      }

      // Then validate order parameters
      await this.validateOrder(order, mode);

      const api = this.getAPI(mode);
      const symbol = this.formatSymbol(order.pair);

      // Validate trading pair
      await this.validateSymbol(symbol, mode);

      const side = order.side.toUpperCase() as 'BUY' | 'SELL';

      // Get current price for market orders or validation
      const priceResponse = await api.getSymbolPriceTicker(symbol) as BinanceApiResponse<PriceTickerResponse>;
      
      if (!priceResponse.success || !priceResponse.data?.price) {
        throw new Error('Unable to get current market price. Please try again.');
      }

      const currentPrice = parseFloat(priceResponse.data.price);
      if (isNaN(currentPrice)) {
        throw new Error('Invalid market price received');
      }

      // Validate stop loss and take profit
      if (order.stopLoss) {
        if ((side === 'BUY' && order.stopLoss >= currentPrice) ||
            (side === 'SELL' && order.stopLoss <= currentPrice)) {
          throw new Error(`Stop loss price must be below current price for buy orders and above for sell orders`);
        }
      }

      if (order.takeProfit) {
        if ((side === 'BUY' && order.takeProfit <= currentPrice) ||
            (side === 'SELL' && order.takeProfit >= currentPrice)) {
          throw new Error(`Take profit price must be above current price for buy orders and below for sell orders`);
        }
      }

      // Place the main order
      let mainOrderResponse;
      if (order.type === 'market') {
        mainOrderResponse = await api.placeMarketOrder(
          symbol,
          side,
          order.amount
        );
      } else if (order.type === 'limit') {
        if (!order.price) {
          throw new Error('Price is required for limit orders');
        }
        mainOrderResponse = await api.placeLimitOrder(
          symbol,
          side,
          order.amount,
          order.price
        );
      } else if (order.type === 'strategy') {
        if (!order.strategy) {
          throw new Error('Strategy is required for strategy orders');
        }
        mainOrderResponse = await api.placeMarketOrder(
          symbol,
          side,
          order.amount
        );
      }

      if (!mainOrderResponse?.success) {
        throw new Error(mainOrderResponse?.error || 'Order placement failed. Please check your account balance and try again.');
      }

      const mainOrder = mainOrderResponse.data as Required<BinanceOrderResponse>;
      if (!mainOrder?.orderId) {
        throw new Error('Invalid order response received from exchange');
      }

      // Place stop loss if specified
      if (order.stopLoss) {
        const stopLossResponse = await api.placeStopLossOrder(
          symbol,
          side === 'BUY' ? 'SELL' : 'BUY',
          order.amount,
          order.stopLoss
        );

        if (!stopLossResponse.success) {
          await api.cancelOrder(symbol, parseInt(mainOrder.orderId));
          throw new Error('Failed to place stop loss order. Main order has been cancelled.');
        }
      }

      // Place take profit if specified
      if (order.takeProfit) {
        const takeProfitResponse = await api.placeTakeProfitOrder(
          symbol,
          side === 'BUY' ? 'SELL' : 'BUY',
          order.amount,
          order.takeProfit
        );

        if (!takeProfitResponse.success) {
          await api.cancelOrder(symbol, parseInt(mainOrder.orderId));
          throw new Error('Failed to place take profit order. Main order has been cancelled.');
        }
      }

      return {
        success: true,
        orderId: mainOrder.orderId,
        executedQty: mainOrder.executedQty,
        status: mainOrder.status,
        data: mainOrder
      };
    } catch (error) {
      console.error('Order placement failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred while placing the order'
      };
    }
  }

  static async getOpenOrders(mode: 'spot' | 'futures', pair?: string): Promise<OrderResponse> {
    try {
      const api = this.getAPI(mode);
      const response = pair 
        ? await api.getOpenOrders(this.formatSymbol(pair))
        : await api.getOpenOrders();

      if (!response.success) {
        throw new Error(response.error || 'Unable to fetch open orders');
      }

      return {
        success: true,
        data: Array.isArray(response.data) ? response.data as BinanceOrderResponse[] : response.data as BinanceOrderResponse
      };
    } catch (error) {
      console.error('Failed to get open orders:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve open orders'
      };
    }
  }

  static async cancelOrder(mode: 'spot' | 'futures', pair: string, orderId: number): Promise<OrderResponse> {
    try {
      const api = this.getAPI(mode);
      const response = await api.cancelOrder(this.formatSymbol(pair), orderId);
      
      if (!response.success) {
        throw new Error(response.error || 'Unable to cancel order');
      }

      return {
        success: true,
        data: response.data as BinanceOrderResponse
      };
    } catch (error) {
      console.error('Failed to cancel order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel order'
      };
    }
  }

  static async getAccountInfo<T extends 'spot' | 'futures'>(mode: T): Promise<{
    success: boolean;
    error?: string;
    data?: T extends 'spot' ? SpotAccountInfo : FuturesAccountInfo;
  }> {
    try {
      const api = this.getAPI(mode);
      const response = await api.getAccountInfo();
      
      if (!response.success) {
        throw new Error(response.error || 'Unable to fetch account information');
      }

      return {
        success: true,
        data: response.data as (T extends 'spot' ? SpotAccountInfo : FuturesAccountInfo)
      };
    } catch (error) {
      console.error('Failed to get account information:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve account information'
      };
    }
  }

  static async getRecentTrades(mode: 'spot' | 'futures', pair: string): Promise<OrderResponse> {
    try {
      const api = this.getAPI(mode);
      const response = await api.getMyTrades(this.formatSymbol(pair));
      
      if (!response.success) {
        throw new Error(response.error || 'Unable to fetch recent trades');
      }

      return {
        success: true,
        data: Array.isArray(response.data) ? response.data as BinanceOrderResponse[] : response.data as BinanceOrderResponse
      };
    } catch (error) {
      console.error('Failed to get recent trades:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve recent trades'
      };
    }
  }

  static async placeOCOOrder(
    pair: string,
    side: OrderSide,
    quantity: number,
    price: number,
    stopPrice: number,
    stopLimitPrice?: number
  ): Promise<OrderResponse> {
    try {
      const api = this.getAPI('spot');
      const symbol = this.formatSymbol(pair);

      // Validate trading pair
      await this.validateSymbol(symbol, 'spot');

      const response = await api.placeOCOOrder(
        symbol,
        side.toUpperCase() as 'BUY' | 'SELL',
        quantity,
        price,
        stopPrice,
        stopLimitPrice
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to place OCO order');
      }

      return {
        success: true,
        data: response.data as BinanceOrderResponse
      };
    } catch (error) {
      console.error('Failed to place OCO order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred while placing OCO order'
      };
    }
  }
}
