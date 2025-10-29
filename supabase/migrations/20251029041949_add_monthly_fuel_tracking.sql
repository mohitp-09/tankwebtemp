/*
  # Add Monthly Fuel Tracking System

  1. New Tables
    - `monthly_fuel_data`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `label_id` (uuid, references labels)
      - `month` (integer) - month number (1-12)
      - `year` (integer) - year
      - `diesel_average` (numeric) - fuel efficiency for this month (km/l)
      - `carried_range` (numeric) - remaining range carried from previous month (km)
      - `total_diesel_added` (numeric) - total diesel added this month (liters)
      - `total_km_driven` (numeric) - total kilometers driven this month
      - `remaining_range` (numeric) - remaining range at end of month (km)
      - `is_average_locked` (boolean) - whether average can be edited (locked after first diesel add)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `monthly_fuel_data` table
    - Add policies for authenticated users to manage their own monthly data

  3. Indexes
    - Add composite index on (user_id, label_id, month, year) for fast lookups
    - Add index on user_id for filtering

  4. Notes
    - Each month has its own separate data
    - Average is blank at start of each month
    - Average gets locked after first diesel addition
    - Remaining range from previous month carries forward automatically
    - Unique constraint ensures one record per user/label/month/year combination
*/

-- Create monthly fuel tracking table
CREATE TABLE IF NOT EXISTS monthly_fuel_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  label_id uuid REFERENCES labels(id) ON DELETE CASCADE NOT NULL,
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  year integer NOT NULL CHECK (year >= 2020),
  diesel_average numeric DEFAULT 0,
  carried_range numeric DEFAULT 0,
  total_diesel_added numeric DEFAULT 0,
  total_km_driven numeric DEFAULT 0,
  remaining_range numeric DEFAULT 0,
  is_average_locked boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, label_id, month, year)
);

-- Enable RLS
ALTER TABLE monthly_fuel_data ENABLE ROW LEVEL SECURITY;

-- Policies for monthly_fuel_data
CREATE POLICY "Users can view own monthly fuel data"
  ON monthly_fuel_data FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own monthly fuel data"
  ON monthly_fuel_data FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own monthly fuel data"
  ON monthly_fuel_data FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own monthly fuel data"
  ON monthly_fuel_data FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_monthly_fuel_data_user_label_month_year 
  ON monthly_fuel_data(user_id, label_id, month, year);

CREATE INDEX IF NOT EXISTS idx_monthly_fuel_data_user_id 
  ON monthly_fuel_data(user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_monthly_fuel_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_monthly_fuel_data_timestamp ON monthly_fuel_data;
CREATE TRIGGER update_monthly_fuel_data_timestamp
  BEFORE UPDATE ON monthly_fuel_data
  FOR EACH ROW
  EXECUTE FUNCTION update_monthly_fuel_data_updated_at();