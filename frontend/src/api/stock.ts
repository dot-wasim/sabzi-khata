import apiClient from './client';
import { StockItem } from '../utils/types';

export async function getStock(date?: string): Promise<{ date: string; stock: StockItem[] }> {
  const res = await apiClient.get('/stock', { params: { date } });
  return res.data;
}
