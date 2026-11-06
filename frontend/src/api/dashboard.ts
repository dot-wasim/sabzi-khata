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
        boughtToday: offlineRes.todayPurchases,
        soldToday: offlineRes.todaySales,
        paidToday: 0,
        receivedToday: 0,
        totalPayable: offlineRes.totalSellerDues,
        totalReceivable: offlineRes.totalBuyerDues,
        todayProfit: offlineRes.netProfit,
      },
      breakdown: {
        byVegetable: [],
        topBuyers: [],
      },
      accounts,
    };
  }
}
