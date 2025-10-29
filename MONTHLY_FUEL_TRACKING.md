# Monthly Fuel Tracking System

## Overview
This system tracks diesel consumption and distance (KM) on a month-by-month basis for driver status labels.

## Key Features

### 1. Monthly Separation
- Each month has its own independent tracking data
- Data includes: average, diesel added, KM driven, remaining range
- Previous month's data does not affect current month's average

### 2. Average Management
- **Start of Month**: Average is blank (0) - user must set it
- **Setting Average**: User can set/update average anytime BEFORE adding diesel
- **Locked Average**: Once diesel is added in a month, the average becomes locked and cannot be changed

### 3. Range Carry-Forward
- **Automatic Carry-Forward**: When a new month starts, the remaining range from the previous month is automatically carried forward
- **Calculation**: Current Range = Carried Range + (Diesel Added × Average) - KM Driven
- **Always Non-Negative**: Range never goes below 0

## How It Works

### Month 1 Example (October 2025)
1. User sets average: `10 km/l`
2. User adds diesel: `10 liters`
   - Range = `10 × 10 = 100 km`
3. User drives: `50 km`
   - Remaining = `100 - 50 = 50 km`
4. Month ends with 50 km remaining

### Month 2 Example (November 2025)
1. System automatically:
   - Creates new month record
   - Sets carried range: `50 km` (from October)
   - Resets average to: `0` (blank)
   - Sets average locked: `false`
2. User sets new average: `8 km/l`
3. User adds diesel: `10 liters`
   - New range = `10 × 8 = 80 km`
   - **Average is now locked**
4. Total range = `50 + 80 = 130 km`
5. User drives: `100 km`
   - Remaining = `130 - 100 = 30 km`

## Database Schema

### Table: `monthly_fuel_data`
- `id`: Primary key
- `user_id`: Reference to user
- `label_id`: Reference to driver label
- `month`: Month number (1-12)
- `year`: Year
- `diesel_average`: Fuel efficiency (km/l)
- `carried_range`: Range carried from previous month
- `total_diesel_added`: Total diesel added this month
- `total_km_driven`: Total KM driven this month
- `remaining_range`: Current remaining range
- `is_average_locked`: Whether average can be edited
- `created_at`, `updated_at`: Timestamps

**Unique Constraint**: One record per (user_id, label_id, month, year)

## Functions

### `getOrCreateMonthlyData()`
- Fetches monthly data or creates new record if doesn't exist
- Automatically carries forward range from previous month
- Returns monthly data object

### `updateMonthlyAverage()`
- Updates the average for a specific month
- Fails if average is already locked
- Returns success/failure

### `getMonthlyData()`
- Fetches monthly data for a specific month
- Returns null if doesn't exist

## UI Components

### LabelView
- Displays current month's range and average
- Shows lock status indicator
- "Add Average" button opens modal to set monthly average
- Range updates automatically when navigating between months

### DayEntries
- Adding diesel entries triggers monthly data update
- Recalculates total diesel and KM for entire month
- Updates remaining range based on carried range + additions - consumption
- Automatically locks average after first diesel addition

## Important Notes

1. **Each month is independent**: Changing data in one month doesn't affect other months
2. **Average locks after diesel**: This prevents accidental changes that would mess up calculations
3. **Range carries forward**: This ensures continuity between months
4. **Automatic creation**: Monthly records are created automatically when needed
5. **Recalculation**: Every save recalculates the entire month's data for accuracy
