import apiClient from './client';

export async function getProfitReport(from?: string, to?: string, groupBy: 'day' | 'vegetable' | 'buyer' = 'day'): Promise<any> {
  const res = await apiClient.get('/reports/profit', { params: { from, to, groupBy } });
  return res.data;
}

export async function getTopVegetables(from?: string, to?: string, by: 'quantity' | 'profit' = 'quantity'): Promise<any[]> {
  const res = await apiClient.get('/reports/top-vegetables', { params: { from, to, by } });
  return res.data;
}

export async function getTopBuyers(from?: string, to?: string): Promise<any[]> {
  const res = await apiClient.get('/reports/top-buyers', { params: { from, to } });
  return res.data;
}

export async function getTopSellers(from?: string, to?: string): Promise<any[]> {
  const res = await apiClient.get('/reports/top-sellers', { params: { from, to } });
  return res.data;
}

export function downloadPurchasesCSV(from?: string, to?: string): void {
  const token = localStorage.getItem('token');
  const url = `http://localhost:3001/api/reports/export/purchases?from=${from || ''}&to=${to || ''}&token=${token || ''}`;
  window.open(url, '_blank');
}

export function downloadSalesCSV(from?: string, to?: string): void {
  const token = localStorage.getItem('token');
  const url = `http://localhost:3001/api/reports/export/sales?from=${from || ''}&to=${to || ''}&token=${token || ''}`;
  window.open(url, '_blank');
}
