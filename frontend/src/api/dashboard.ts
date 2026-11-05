import apiClient from './client';
import { DashboardData, Account } from '../utils/types';

export async function getDashboard(date?: string): Promise<{
  date: string;
  cards: DashboardData;
  breakdown: any;
  accounts: Account[];
}> {
  const res = await apiClient.get('/dashboard', { params: { date } });
  return res.data;
}
