import apiClient from './client';
import { Sale } from '../utils/types';
import { offlineDb } from '../storage/offlineDb';

export async function getSales(params?: { page?: number; limit?: number; from?: string; to?: string; buyerId?: number }): Promise<{ sales: Sale[]; pagination: any }> {
  try {
    const res = await apiClient.get('/sales', { params });
    return res.data;
  } catch (err) {
    return offlineDb.getSales();
  }
}

export async function getSale(id: number): Promise<Sale> {
  try {
    const res = await apiClient.get(`/sales/${id}`);
    return res.data;
  } catch (err) {
    return offlineDb.getSale(id);
  }
}

export async function createSale(data: any): Promise<Sale> {
  try {
    const res = await apiClient.post('/sales', data);
    return res.data;
  } catch (err) {
    return (await offlineDb.createSale(data)) as any;
  }
}

export async function updateSale(id: number, data: any): Promise<Sale> {
  const res = await apiClient.put(`/sales/${id}`, data);
  return res.data;
}

export async function deleteSale(id: number): Promise<void> {
  await apiClient.delete(`/sales/${id}`);
}
