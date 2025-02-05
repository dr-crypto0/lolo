import { OrderDetails } from '../components/TradingInterface';
import { hmacSha256 } from './hmac';

const API_KEY = import.meta.env.VITE_BINANCE_API_KEY;
const API_SECRET = import.meta.env.VITE_BINANCE_API_SECRET;
const BASE_URL = 'https://api.binance.com';
const FUTURES_URL = 'https://fapi.binance.com';

interface OrderParams {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'STOP_LOSS_LIMIT' | 'TAKE_PROFIT' | 'TAKE_PROFIT_LIMIT';
  quantity: string;
  price?: string;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
  stopPrice?: string;
  recvWindow?: number;
  newOrderRespType?: 'ACK' | 'RESULT' | 'FULL';
  quoteOrderQty?: string;
  icebergQty?: string;
}

interface SpotOrderParams extends OrderParams {
  newClientOrderId?: string;
  stopLimitPrice?: string;
  stopLimitTimeInForce?: 'GTC' | 'FOK' | 'IOC';
}

interface BinanceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class BinanceAPI {
  private mode: 'spot' | 'futures';
  private initialized: boolean = false;

  constructor(mode: 'spot' | 'futures') {
    this.mode = mode;
    this.validateConfig();
  }

  private validateConfig() {
    if (!API_KEY || !API_SECRET) {
      throw new Error('Binance API configuration is missing. Please check your environment variables.');
    }
    
    if (!API_KEY.length || !API_SECRET.length) {
      throw new Error('Invalid API key format. Please check your API credentials.');
    }
    
    this.initialized = true;
  }

  private get baseUrl(): string {
    return this.mode === 'spot' ? BASE_URL : FUTURES_URL;
  }

  private async generateSignature(queryString: string): Promise<string> {
    try {
      return hmacSha256(API_SECRET, queryString);
    } catch (error) {
      console.error('Error generating signature:', error);
      throw new Error('Failed to generate API signature');
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
    params: Record<string, any> = {},
    signed: boolean = true
  ): Promise<BinanceResponse<T>> {
    try {
      if (!this.initialized) {
        throw new Error('API not initialized. Please check your configuration.');
      }

      const timestamp = Date.now();
      const recvWindow = 60000; // Increased window to handle time sync issues

      // Remove undefined and null values from params
      const cleanParams = Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, any>);

      // Add timestamp and recvWindow for signed requests
      const requestParams = signed
        ? { ...cleanParams, timestamp, recvWindow }
        : cleanParams;

      // Create query string
      const queryString = Object.entries(requestParams)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&');

      // Generate signature if needed
      let fullQueryString = queryString;
      if (signed && queryString) {
        const signature = await this.generateSignature(queryString);
        fullQueryString = `${queryString}&signature=${signature}`;
      }

      // Build URL
      const url = `${this.baseUrl}${endpoint}${fullQueryString ? `?${fullQueryString}` : ''}`;

      // Prepare headers
      const headers: Record<string, string> = {
        'X-MBX-APIKEY': API_KEY,
      };

      if (method === 'POST' || method === 'DELETE') {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
      }

      // Make request
      const response = await fetch(url, {
        method,
        headers,
        body: method === 'POST' ? fullQueryString : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.msg || 'Unknown error occurred',
        };
      }

      return {
        success: true,
        data: data as T,
      };
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  // Get endpoint based on mode
  private getEndpoint(path: string): string {
    return this.mode === 'spot' ? `/api/v3${path}` : `/fapi/v1${path}`;
  }

  // Account Information
  async getAccountInfo() {
    return this.makeRequest(this.getEndpoint('/account'));
  }

  // Place Order
  async placeOrder(params: OrderParams) {
    if (this.mode === 'spot') {
      // Add default response type for better order details
      params.newOrderRespType = 'FULL';
      
      // Validate spot-specific parameters
      if (params.type === 'LIMIT' && !params.timeInForce) {
        params.timeInForce = 'GTC';
      }
      
      if ((params.type === 'STOP_LOSS' || params.type === 'TAKE_PROFIT') && !params.stopPrice) {
        throw new Error(`${params.type} orders require a stop price`);
      }
    }
    
    return this.makeRequest(this.getEndpoint('/order'), 'POST', params);
  }

  // Cancel Order
  async cancelOrder(symbol: string, orderId: number) {
    return this.makeRequest(this.getEndpoint('/order'), 'DELETE', { symbol, orderId });
  }

  // Get Open Orders
  async getOpenOrders(symbol?: string) {
    return this.makeRequest(this.getEndpoint('/openOrders'), 'GET', symbol ? { symbol } : {});
  }

  // Get Order Status
  async getOrder(symbol: string, orderId: number) {
    return this.makeRequest(this.getEndpoint('/order'), 'GET', { symbol, orderId });
  }

  // Get Account Trade List
  async getMyTrades(symbol: string) {
    return this.makeRequest(this.getEndpoint('/myTrades'), 'GET', { symbol });
  }

  // Get Exchange Information
  async getExchangeInfo() {
    return this.makeRequest(this.getEndpoint('/exchangeInfo'), 'GET', {}, false);
  }

  // Get Symbol Price Ticker
  async getSymbolPriceTicker(symbol: string) {
    return this.makeRequest(this.getEndpoint('/ticker/price'), 'GET', { symbol }, false);
  }

  // Get Symbol Order Book Ticker
  async getSymbolOrderBookTicker(symbol: string) {
    return this.makeRequest(this.getEndpoint('/ticker/bookTicker'), 'GET', { symbol }, false);
  }

  // Futures Specific Methods
  async setLeverage(symbol: string, leverage: number) {
    if (this.mode !== 'futures') {
      throw new Error('Leverage can only be set in futures mode');
    }
    return this.makeRequest('/fapi/v1/leverage', 'POST', { symbol, leverage });
  }

  async setMarginType(symbol: string, marginType: 'ISOLATED' | 'CROSSED') {
    if (this.mode !== 'futures') {
      throw new Error('Margin type can only be set in futures mode');
    }
    return this.makeRequest('/fapi/v1/marginType', 'POST', { symbol, marginType });
  }

  async getPositionRisk(symbol?: string) {
    if (this.mode !== 'futures') {
      throw new Error('Position risk is only available in futures mode');
    }
    return this.makeRequest('/fapi/v2/positionRisk', 'GET', symbol ? { symbol } : {});
  }

  async getPositionMode() {
    if (this.mode !== 'futures') {
      throw new Error('Position mode is only available in futures mode');
    }
    return this.makeRequest('/fapi/v1/positionSide/dual', 'GET');
  }

  async setPositionMode(dualSidePosition: boolean) {
    if (this.mode !== 'futures') {
      throw new Error('Position mode can only be set in futures mode');
    }
    return this.makeRequest('/fapi/v1/positionSide/dual', 'POST', { dualSidePosition });
  }

  // Place Market Order
  async placeMarketOrder(symbol: string, side: 'BUY' | 'SELL', quantity: number) {
    return this.placeOrder({
      symbol,
      side,
      type: 'MARKET',
      quantity: quantity.toString(),
      newOrderRespType: 'FULL'
    });
  }

  // Place Limit Order
  async placeLimitOrder(
    symbol: string,
    side: 'BUY' | 'SELL',
    quantity: number,
    price: number,
    timeInForce: 'GTC' | 'IOC' | 'FOK' = 'GTC'
  ) {
    return this.placeOrder({
      symbol,
      side,
      type: 'LIMIT',
      quantity: quantity.toString(),
      price: price.toString(),
      timeInForce,
      newOrderRespType: 'FULL'
    });
  }

  // Place Stop Loss Order
  async placeStopLossOrder(
    symbol: string,
    side: 'BUY' | 'SELL',
    quantity: number,
    stopPrice: number,
    price?: number // Optional limit price for STOP_LOSS_LIMIT
  ) {
    const params: OrderParams = {
      symbol,
      side,
      type: price ? 'STOP_LOSS_LIMIT' : 'STOP_LOSS',
      quantity: quantity.toString(),
      stopPrice: stopPrice.toString(),
      newOrderRespType: 'FULL'
    };

    if (price) {
      params.price = price.toString();
      params.timeInForce = 'GTC';
    }

    return this.placeOrder(params);
  }

  // Place Take Profit Order
  async placeTakeProfitOrder(
    symbol: string,
    side: 'BUY' | 'SELL',
    quantity: number,
    stopPrice: number,
    price?: number // Optional limit price for TAKE_PROFIT_LIMIT
  ) {
    const params: OrderParams = {
      symbol,
      side,
      type: price ? 'TAKE_PROFIT_LIMIT' : 'TAKE_PROFIT',
      quantity: quantity.toString(),
      stopPrice: stopPrice.toString(),
      newOrderRespType: 'FULL'
    };

    if (price) {
      params.price = price.toString();
      params.timeInForce = 'GTC';
    }

    return this.placeOrder(params);
  }

  // Place OCO Order (One-Cancels-the-Other)
  async placeOCOOrder(
    symbol: string,
    side: 'BUY' | 'SELL',
    quantity: number,
    price: number,
    stopPrice: number,
    stopLimitPrice?: number
  ) {
    if (this.mode !== 'spot') {
      throw new Error('OCO orders are only available in spot trading');
    }

    return this.makeRequest('/api/v3/order/oco', 'POST', {
      symbol,
      side,
      quantity: quantity.toString(),
      price: price.toString(),
      stopPrice: stopPrice.toString(),
      stopLimitPrice: stopLimitPrice?.toString(),
      stopLimitTimeInForce: 'GTC',
      newOrderRespType: 'FULL'
    });
  }
}

// Create and export spot and futures API instances
export const spotAPI = new BinanceAPI('spot');
export const futuresAPI = new BinanceAPI('futures');
