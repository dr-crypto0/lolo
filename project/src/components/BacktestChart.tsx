import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, CrosshairMode, IChartApi, ISeriesApi, CandlestickData } from 'lightweight-charts';

interface Trade {
  timestamp: number;
  type: 'buy' | 'sell';
  price: number;
}

interface BacktestChartProps {
  candles: Array<{
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
  }>;
  trades: Trade[];
  onCandleHover?: (index: number) => void;
}

export function BacktestChart({ candles, trades, onCandleHover }: BacktestChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || !candles.length) return;

    // Create chart instance
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: 'rgb(31, 41, 55)' },
        textColor: '#d1d5db',
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: 'rgba(197, 203, 206, 0.8)',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: 'rgba(197, 203, 206, 0.8)',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    // Add candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    // Format candle data
    const formattedCandles = candles.map(candle => ({
      time: Math.floor(candle.timestamp / 1000), // Convert to seconds
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));

    // Set candle data
    candlestickSeries.setData(formattedCandles);

    // Add trade markers
    if (trades.length > 0) {
      const markers = trades.map(trade => ({
        time: Math.floor(trade.timestamp / 1000),
        position: trade.type === 'buy' ? 'belowBar' : 'aboveBar',
        color: trade.type === 'buy' ? '#22c55e' : '#ef4444',
        shape: trade.type === 'buy' ? 'arrowUp' : 'arrowDown',
        text: trade.type === 'buy' ? 'BUY' : 'SELL',
      }));
      candlestickSeries.setMarkers(markers);
    }

    // Subscribe to crosshair move
    chart.subscribeCrosshairMove(param => {
      if (param.time && onCandleHover) {
        const index = candles.findIndex(c => Math.floor(c.timestamp / 1000) === param.time);
        if (index !== -1) {
          onCandleHover(index);
        }
      }
    });

    // Fit content
    chart.timeScale().fitContent();

    // Store references
    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    // Cleanup
    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [candles, trades]); // Re-create chart when data changes

  return (
    <div 
      ref={chartContainerRef} 
      className="w-full h-[400px] rounded-lg overflow-hidden"
    />
  );
}