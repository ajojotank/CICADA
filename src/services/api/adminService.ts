// Admin API service functions
import { AdminStats } from './types';
import { supabase } from '@/lib/supabase';

/**
 * Fetches admin dashboard statistics from Supabase Functions
 * @returns A promise that resolves to AdminStats
 */
export const getAdminStats = async (): Promise<AdminStats> => {
  try {
    const { data, error } = await supabase.functions.invoke('getDashboardStats');
    
    if (error) {
      console.error('Error fetching admin stats:', error);
      throw new Error('Failed to fetch admin statistics');
    }
    
    return data as AdminStats;
  } catch (error) {
    console.error('Error in getAdminStats:', error);
    // Fallback to default values in case of error
    return {
      documentCount: 0,
      recentUploads: 0,
      storageUsed: "0.00GB",
      totalStorage: "8GB",
      popularSearches: []
    };
  }
};