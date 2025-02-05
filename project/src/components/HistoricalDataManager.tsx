import React, { useState, useEffect, useRef } from 'react';
import { Download, RefreshCw, Save, Database, Trash2, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface HistoricalDataManagerProps {
  onDataFetched: (data: any[]) => void;
  progress: Array<{
    timestamp: string;
    message: string;
    type: 'info' | 'error' | 'success';
  }>;
  onAddProgress: (message: string, type: 'info' | 'error' | 'success') => void;
  onClearProgress: () => void;
}

interface SavedDataset {
  id: string;
  name: string;
  symbol: string;
  timeframe: string;
  start_date: string;
  end_date: string;
  candle_count: number;
  created_at: string;
}

interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function HistoricalDataManager({ 
  onDataFetched, 
  progress,
  onAddProgress,
  onClearProgress
}: HistoricalDataManagerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [pair, setPair] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState('5m');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dataFetched, setDataFetched] = useState(false);
  const [historicalData, setHistoricalData] = useState<Candle[]>([]);
  const [savedDatasets, setSavedDatasets] = useState<SavedDataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>('');
  const [saveName, setSaveName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tradingPairs = [
    'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'BNBUSDT',
    'XRPUSDT', 'DOGEUSDT', 'DOTUSDT', 'MATICUSDT', 'LINKUSDT'
  ];

  const timeframes = [
    { value: '1m', label: '1 minute' },
    { value: '3m', label: '3 minutes' },
    { value: '5m', label: '5 minutes' },
    { value: '15m', label: '15 minutes' },
    { value: '30m', label: '30 minutes' },
    { value: '1h', label: '1 hour' },
    { value: '2h', label: '2 hours' },
    { value: '4h', label: '4 hours' },
    { value: '1d', label: '1 day' }
  ];

  const loadSavedDatasets = async () => {
    try {
      const { data, error } = await supabase
        .from('historical_data_sets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedDatasets(data || []);
    } catch (error) {
      console.error('Error loading saved datasets:', error);
      onAddProgress('Error loading saved datasets', 'error');
    }
  };

  const fetchKlines = async (start: number, end: number): Promise<any[]> => {
    const url = `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${timeframe}&startTime=${start}&endTime=${end}&limit=1000`;
    onAddProgress('Sending request to Binance API...', 'info');
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    onAddProgress('Receiving data from Binance...', 'info');
    const data = await response.json();
    onAddProgress(`Received ${data.length} candles from API`, 'success');
    
    return data;
  };

  const fetchHistoricalData = async () => {
    if (!startDate || !endDate) {
      alert('Please select both start and end dates');
      return;
    }

    setIsLoading(true);
    setDataFetched(false);
    onAddProgress('=== Starting New Data Fetch ===', 'info');
    
    try {
      const startTime = new Date(startDate).getTime();
      const endTime = new Date(endDate).getTime();
      
      onAddProgress(`Starting data fetch for ${pair} (${timeframe})`, 'info');
      onAddProgress(`Time range: ${new Date(startTime).toLocaleString()} to ${new Date(endTime).toLocaleString()}`, 'info');

      let allData: Candle[] = [];
      let currentStart = startTime;
      let batchNumber = 1;

      while (currentStart < endTime) {
        onAddProgress(`Fetching batch ${batchNumber}...`, 'info');
        
        const batchEnd = Math.min(currentStart + (1000 * getTimeframeMs(timeframe)), endTime);
        const data = await fetchKlines(currentStart, batchEnd);
        
        if (data.length === 0) {
          break;
        }

        const formattedBatch = data.map((candle: any[]) => ({
          timestamp: candle[0],
          open: parseFloat(candle[1]),
          high: parseFloat(candle[2]),
          low: parseFloat(candle[3]),
          close: parseFloat(candle[4]),
          volume: parseFloat(candle[5])
        }));

        allData = [...allData, ...formattedBatch];
        onAddProgress(`Batch ${batchNumber} processed. Total candles so far: ${allData.length}`, 'info');
        
        currentStart = data[data.length - 1][6] + 1;
        batchNumber++;

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setHistoricalData(allData);
      onDataFetched(allData);
      setDataFetched(true);
      onAddProgress(`Successfully fetched ${allData.length} candles`, 'success');
      
    } catch (error) {
      console.error('Error fetching historical data:', error);
      onAddProgress(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`, 'error');
      alert('Error fetching historical data. Please check the logs and try again.');
    } finally {
      setIsLoading(false);
      onAddProgress('=== Data Fetch Complete ===', 'info');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    onAddProgress(`Reading file: ${file.name}`, 'info');

    try {
      const fileContent = await file.text();
      let parsedData: any[] = [];

      if (file.name.endsWith('.csv')) {
        parsedData = parseCSV(fileContent);
      } else if (file.name.endsWith('.json')) {
        parsedData = JSON.parse(fileContent);
      } else {
        throw new Error('Unsupported file format. Please use CSV or JSON.');
      }

      if (!validateData(parsedData)) {
        throw new Error('Invalid data format. Please check the file structure.');
      }

      const formattedData = parsedData.map(row => ({
        timestamp: new Date(row.timestamp).getTime(),
        open: parseFloat(row.open),
        high: parseFloat(row.high),
        low: parseFloat(row.low),
        close: parseFloat(row.close),
        volume: parseFloat(row.volume)
      }));

      setHistoricalData(formattedData);
      onDataFetched(formattedData);
      setDataFetched(true);
      onAddProgress(`Successfully imported ${formattedData.length} candles from file`, 'success');
      setShowImportDialog(false);
    } catch (error) {
      console.error('Error importing file:', error);
      onAddProgress(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`, 'error');
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const parseCSV = (content: string): any[] => {
    const lines = content.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    return lines.slice(1)
      .filter(line => line.trim())
      .map(line => {
        const values = line.split(',').map(v => v.trim());
        return headers.reduce((obj, header, index) => {
          obj[header] = values[index];
          return obj;
        }, {} as any);
      });
  };

  const validateData = (data: any[]): boolean => {
    if (!Array.isArray(data) || data.length === 0) return false;

    const requiredFields = ['timestamp', 'open', 'high', 'low', 'close', 'volume'];
    return data.every(row => 
      requiredFields.every(field => field in row) &&
      !isNaN(new Date(row.timestamp).getTime()) &&
      !isNaN(parseFloat(row.open)) &&
      !isNaN(parseFloat(row.high)) &&
      !isNaN(parseFloat(row.low)) &&
      !isNaN(parseFloat(row.close)) &&
      !isNaN(parseFloat(row.volume))
    );
  };

  const saveCurrentData = async () => {
    if (!historicalData || historicalData.length === 0) {
      onAddProgress('No data to save', 'error');
      return;
    }

    if (!saveName.trim()) {
      onAddProgress('Please enter a name for the dataset', 'error');
      return;
    }

    setIsSaving(true);
    onAddProgress('Saving dataset...', 'info');

    try {
      const { data: datasetData, error: datasetError } = await supabase
        .from('historical_data_sets')
        .insert({
          name: saveName,
          symbol: pair,
          timeframe,
          start_date: startDate,
          end_date: endDate,
          candle_count: historicalData.length
        })
        .select()
        .single();

      if (datasetError) throw datasetError;

      const candleBatches = chunk(historicalData, 1000);
      for (let i = 0; i < candleBatches.length; i++) {
        const batch = candleBatches[i];
        const { error: candlesError } = await supabase
          .from('historical_candles')
          .insert(
            batch.map(candle => ({
              dataset_id: datasetData.id,
              timestamp: new Date(candle.timestamp).toISOString(),
              open: candle.open,
              high: candle.high,
              low: candle.low,
              close: candle.close,
              volume: candle.volume
            }))
          );

        if (candlesError) throw candlesError;
        onAddProgress(`Saved batch ${i + 1} of ${candleBatches.length}`, 'info');
      }

      onAddProgress('Dataset saved successfully', 'success');
      setShowSaveDialog(false);
      setSaveName('');
      await loadSavedDatasets();
    } catch (error) {
      console.error('Error saving dataset:', error);
      onAddProgress('Error saving dataset', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const loadDataset = async (datasetId: string) => {
    setIsLoading(true);
    onAddProgress('Loading saved dataset...', 'info');

    try {
      const { data: datasetInfo, error: datasetError } = await supabase
        .from('historical_data_sets')
        .select('*')
        .eq('id', datasetId)
        .single();

      if (datasetError) throw datasetError;

      const { data: candles, error: candlesError } = await supabase
        .from('historical_candles')
        .select('*')
        .eq('dataset_id', datasetId)
        .order('timestamp', { ascending: true });

      if (candlesError) throw candlesError;

      if (!candles || candles.length === 0) {
        throw new Error('No candles found in dataset');
      }

      const formattedData = candles.map(candle => ({
        timestamp: new Date(candle.timestamp).getTime(),
        open: parseFloat(candle.open),
        high: parseFloat(candle.high),
        low: parseFloat(candle.low),
        close: parseFloat(candle.close),
        volume: parseFloat(candle.volume)
      }));

      setPair(datasetInfo.symbol);
      setTimeframe(datasetInfo.timeframe);
      setStartDate(new Date(datasetInfo.start_date).toISOString().slice(0, 16));
      setEndDate(new Date(datasetInfo.end_date).toISOString().slice(0, 16));

      setHistoricalData(formattedData);
      onDataFetched(formattedData);
      setDataFetched(true);
      onAddProgress('Dataset loaded successfully', 'success');
    } catch (error) {
      console.error('Error loading dataset:', error);
      onAddProgress('Error loading dataset', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteDataset = async (datasetId: string) => {
    if (!confirm('Are you sure you want to delete this dataset?')) return;

    try {
      const { error } = await supabase
        .from('historical_data_sets')
        .delete()
        .eq('id', datasetId);

      if (error) throw error;

      onAddProgress('Dataset deleted successfully', 'success');
      await loadSavedDatasets();
    } catch (error) {
      console.error('Error deleting dataset:', error);
      onAddProgress('Error deleting dataset', 'error');
    }
  };

  const getTimeframeMs = (tf: string): number => {
    const unit = tf.slice(-1);
    const value = parseInt(tf.slice(0, -1));
    
    switch (unit) {
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 60 * 1000;
    }
  };

  const chunk = <T,>(arr: T[], size: number): T[][] => {
    return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
      arr.slice(i * size, i * size + size)
    );
  };

  return (
    <div className="bg-gray-700 p-4 rounded-lg space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">Historical Data</h3>
        <div className="flex items-center space-x-2">
          <button className="text-blue-400 hover:text-blue-300">
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="border-b border-gray-600 pb-4 mb-4">
        <h3 className="font-medium mb-2 flex items-center">
          <Database className="h-4 w-4 mr-2" />
          Saved Datasets
        </h3>
        
        {savedDatasets.length > 0 ? (
          <div className="space-y-2">
            {savedDatasets.map(dataset => (
              <div 
                key={dataset.id} 
                className="bg-gray-600 p-2 rounded-lg flex items-center justify-between"
              >
                <div className="flex-1">
                  <p className="font-medium">{dataset.name}</p>
                  <p className="text-sm text-gray-400">
                    {dataset.symbol} ({dataset.timeframe}) - {dataset.candle_count} candles
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => loadDataset(dataset.id)}
                    className="p-1 text-blue-400 hover:text-blue-300"
                    title="Load dataset"
                  >
                    <Database className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteDataset(dataset.id)}
                    className="p-1 text-red-400 hover:text-red-300"
                    title="Delete dataset"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No saved datasets</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Trading Pair
          </label>
          <select
            value={pair}
            onChange={(e) => setPair(e.target.value)}
            className="w-full bg-gray-600 text-white px-3 py-2 rounded-lg"
          >
            {tradingPairs.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Timeframe
          </label>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="w-full bg-gray-600 text-white px-3 py-2 rounded-lg"
          >
            {timeframes.map(tf => (
              <option key={tf.value} value={tf.value}>{tf.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Start Date
          </label>
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-gray-600 text-white px-3 py-2 rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            End Date
          </label>
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-gray-600 text-white px-3 py-2 rounded-lg"
          />
        </div>
      </div>

      <div className="flex space-x-2">
        <button
          onClick={() => setShowImportDialog(true)}
          className="flex-1 py-3 rounded-lg font-semibold flex items-center justify-center bg-purple-500 hover:bg-purple-600"
        >
          <Upload className="h-4 w-4 mr-2" />
          Import from File
        </button>
        <button
          onClick={fetchHistoricalData}
          disabled={isLoading}
          className={`flex-1 py-3 rounded-lg font-semibold flex items-center justify-center ${
            isLoading 
              ? 'bg-gray-600 cursor-not-allowed' 
              : dataFetched
              ? 'bg-green-500 hover:bg-green-600'
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              {selectedDataset ? 'Loading Dataset...' : 'Fetching Data...'}
            </>
          ) : dataFetched ? (
            'Data Ready'
          ) : (
            'Fetch from API'
          )}
        </button>

        {dataFetched && (
          <button
            onClick={() => setShowSaveDialog(true)}
            className="px-4 py-3 bg-green-500 hover:bg-green-600 rounded-lg font-semibold flex items-center"
          >
            <Save className="h-4 w-4 mr-2" />
            Save
          </button>
        )}
      </div>

      {showImportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Import Data from File</h3>
            
            <div className="space-y-4">
              <div className="bg-gray-700 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Supported Formats</h4>
                <ul className="text-sm text-gray-400 list-disc list-inside">
                  <li>CSV files with headers</li>
                  <li>JSON array of candle data</li>
                </ul>
              </div>

              <div className="bg-gray-700 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Required Fields</h4>
                <p className="text-sm text-gray-400">
                  timestamp, open, high, low, close, volume
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-500 file:text-white
                  hover:file:bg-blue-600"
              />
            </div>

            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowImportDialog(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Save Dataset</h3>
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Enter dataset name"
              className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg mb-4"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={saveCurrentData}
                disabled={isSaving || !saveName.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Dataset
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {dataFetched && !isLoading && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
          <div className="flex items-center text-green-400">
            <div className="w-2 h-2 rounded-full bg-green-400 mr-2"></div>
            <span className="text-sm">Data ready for backtesting</span>
          </div>
        </div>
      )}
      
      <div className="pt-2">
        <div className="text-xs text-gray-400">
          <p>• Data is fetched in batches of 1000 candles</p>
          <p>• Data is fetched from Binance public API</p>
          <p>• Times are in your local timezone</p>
          <p>• Longer time ranges will take more time to fetch</p>
        </div>
      </div>
    </div>
  );
}