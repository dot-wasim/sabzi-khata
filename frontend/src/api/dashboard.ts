import apiClient from './client';
import { DashboardData, Account } from '../utils/types';
import { offlineDb } from '../storage/offlineDb';

export async function getDashboard(date?: string): Promise<{
  date: string;
  cards: DashboardData;
  breakdown: any;
  accounts: Account[];
}> {
  try {
    const res = await apiClient.get('/dashboard', { params: { date } });
    return res.data;
  } catch (err) {
    const offlineRes = await offlineDb.getDashboardToday();
    const accounts = await offlineDb.getAccounts();
    return {
      date: date || new Date().toISOString(),
      cards: {
        todaySales: offlineRes.todaySales,
        todayPurchases: offlineRes.todayPurchases,
        todayWastage: 0,
        todayExpenses: 0,
        netProfit: offlineRes.netProfit,
        totalBuyerDues: offlineRes.totalBuyerDues,
        totalSellerDues: offlineRes.totalSellerDues,
      },
      breakdown: {
        byVegetable: [],
        topBuyers: [],
      },
      accounts,
    };
  }
}
