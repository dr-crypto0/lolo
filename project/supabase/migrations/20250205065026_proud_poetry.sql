/*
  # Historical Data Storage

  1. New Tables
    - `historical_data_sets`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `symbol` (text)
      - `timeframe` (text)
      - `start_date` (timestamptz)
      - `end_date` (timestamptz)
      - `candle_count` (integer)
      - `created_at` (timestamptz)
      - `name` (text)
    
    - `historical_candles`
      - `id` (uuid, primary key)
      - `dataset_id` (uuid, references historical_data_sets)
      - `timestamp` (timestamptz)
      - `open` (numeric)
      - `high` (numeric)
      - `low` (numeric)
      - `close` (numeric)
      - `volume` (numeric)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own data
*/

-- Create historical_data_sets table
CREATE TABLE IF NOT EXISTS historical_data_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  symbol text NOT NULL,
  timeframe text NOT NULL,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  candle_count integer NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create historical_candles table
CREATE TABLE IF NOT EXISTS historical_candles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id uuid REFERENCES historical_data_sets ON DELETE CASCADE NOT NULL,
  timestamp timestamptz NOT NULL,
  open numeric NOT NULL,
  high numeric NOT NULL,
  low numeric NOT NULL,
  close numeric NOT NULL,
  volume numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE historical_data_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE historical_candles ENABLE ROW LEVEL SECURITY;

-- Policies for historical_data_sets
CREATE POLICY "Users can view their own datasets"
  ON historical_data_sets
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own datasets"
  ON historical_data_sets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own datasets"
  ON historical_data_sets
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own datasets"
  ON historical_data_sets
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for historical_candles
CREATE POLICY "Users can view candles from their datasets"
  ON historical_candles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM historical_data_sets
      WHERE id = historical_candles.dataset_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert candles to their datasets"
  ON historical_candles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM historical_data_sets
      WHERE id = historical_candles.dataset_id
      AND user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS historical_candles_dataset_id_idx ON historical_candles(dataset_id);
CREATE INDEX IF NOT EXISTS historical_candles_timestamp_idx ON historical_candles(timestamp);
CREATE INDEX IF NOT EXISTS historical_data_sets_user_id_idx ON historical_data_sets(user_id);