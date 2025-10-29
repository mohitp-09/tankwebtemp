import { supabase } from './supabase';

export interface MonthlyFuelData {
  id: string;
  user_id: string;
  label_id: string;
  month: number;
  year: number;
  diesel_average: number;
  carried_range: number;
  total_diesel_added: number;
  total_km_driven: number;
  remaining_range: number;
  is_average_locked: boolean;
  created_at: string;
  updated_at: string;
}

export async function getOrCreateMonthlyData(
  userId: string,
  labelId: string,
  month: number,
  year: number
): Promise<MonthlyFuelData | null> {
  try {
    const { data: existingData, error: fetchError } = await supabase
      .from('monthly_fuel_data')
      .select('*')
      .eq('user_id', userId)
      .eq('label_id', labelId)
      .eq('month', month)
      .eq('year', year)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (existingData) {
      return existingData;
    }

    const previousMonth = month === 1 ? 12 : month - 1;
    const previousYear = month === 1 ? year - 1 : year;

    const { data: previousMonthData } = await supabase
      .from('monthly_fuel_data')
      .select('remaining_range')
      .eq('user_id', userId)
      .eq('label_id', labelId)
      .eq('month', previousMonth)
      .eq('year', previousYear)
      .maybeSingle();

    const carriedRange = previousMonthData?.remaining_range || 0;

    const { data: newData, error: insertError } = await supabase
      .from('monthly_fuel_data')
      .insert({
        user_id: userId,
        label_id: labelId,
        month,
        year,
        diesel_average: 0,
        carried_range: carriedRange,
        total_diesel_added: 0,
        total_km_driven: 0,
        remaining_range: carriedRange,
        is_average_locked: false,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return newData;
  } catch (error) {
    console.error('Error in getOrCreateMonthlyData:', error);
    return null;
  }
}

export async function updateMonthlyAverage(
  userId: string,
  labelId: string,
  month: number,
  year: number,
  average: number
): Promise<boolean> {
  try {
    const monthlyData = await getOrCreateMonthlyData(userId, labelId, month, year);

    if (!monthlyData) {
      throw new Error('Failed to get monthly data');
    }

    if (monthlyData.is_average_locked) {
      throw new Error('Average is locked after diesel has been added this month');
    }

    const { error } = await supabase
      .from('monthly_fuel_data')
      .update({ diesel_average: average })
      .eq('id', monthlyData.id);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error updating monthly average:', error);
    return false;
  }
}

export async function addDieselToMonth(
  userId: string,
  labelId: string,
  month: number,
  year: number,
  dieselLiters: number
): Promise<boolean> {
  try {
    const monthlyData = await getOrCreateMonthlyData(userId, labelId, month, year);

    if (!monthlyData) {
      throw new Error('Failed to get monthly data');
    }

    if (monthlyData.diesel_average === 0) {
      throw new Error('Please set an average before adding diesel');
    }

    const newDieselAdded = monthlyData.total_diesel_added + dieselLiters;
    const addedRange = dieselLiters * monthlyData.diesel_average;
    const newRemainingRange = monthlyData.remaining_range + addedRange;

    const { error } = await supabase
      .from('monthly_fuel_data')
      .update({
        total_diesel_added: newDieselAdded,
        remaining_range: newRemainingRange,
        is_average_locked: true,
      })
      .eq('id', monthlyData.id);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error adding diesel to month:', error);
    return false;
  }
}

export async function addKilometersDriven(
  userId: string,
  labelId: string,
  month: number,
  year: number,
  kilometers: number
): Promise<boolean> {
  try {
    const monthlyData = await getOrCreateMonthlyData(userId, labelId, month, year);

    if (!monthlyData) {
      throw new Error('Failed to get monthly data');
    }

    const newKmDriven = monthlyData.total_km_driven + kilometers;
    const newRemainingRange = Math.max(0, monthlyData.remaining_range - kilometers);

    const { error } = await supabase
      .from('monthly_fuel_data')
      .update({
        total_km_driven: newKmDriven,
        remaining_range: newRemainingRange,
      })
      .eq('id', monthlyData.id);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error adding kilometers driven:', error);
    return false;
  }
}

export async function getMonthlyData(
  userId: string,
  labelId: string,
  month: number,
  year: number
): Promise<MonthlyFuelData | null> {
  try {
    const { data, error } = await supabase
      .from('monthly_fuel_data')
      .select('*')
      .eq('user_id', userId)
      .eq('label_id', labelId)
      .eq('month', month)
      .eq('year', year)
      .maybeSingle();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error getting monthly data:', error);
    return null;
  }
}
