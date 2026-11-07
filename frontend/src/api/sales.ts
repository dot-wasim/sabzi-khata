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

export async function getSale(id: number | string): Promise<Sale> {
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

export async function updateSale(id: number | string, data: any): Promise<Sale> {
  try {
    const res = await apiClient.put(`/sales/${id}`, data);
    return res.data;
  } catch (err) {
    return (await offlineDb.updateSale(id, data)) as any;
  }
}

export async function deleteSale(id: number): Promise<void> {
  await apiClient.delete(`/sales/${id}`);
}

export async function voidSale(id: number): Promise<Sale | null> {
  try {
    const res = await apiClient.post(`/sales/${id}/void`);
    return res.data;
  } catch (err) {
    return (await offlineDb.voidSale(id)) as any;
  }
}

export async function settlePendingRate(vegetableId: number, ratePaise: number, targetDate?: string): Promise<{ updatedBillsCount: number }> {
  try {
    const res = await apiClient.post('/sales/settle-pending-rate', { vegetableId, ratePaise, targetDate });
    return res.data;
  } catch (err) {
    return offlineDb.settlePendingRate(vegetableId, ratePaise, targetDate);
  }
}

export async function getPendingRateVegetables(targetDate?: string): Promise<any[]> {
  try {
    const res = await apiClient.get('/sales/pending-rates', { params: { date: targetDate } });
    return res.data;
  } catch (err) {
    return offlineDb.getPendingRateVegetables(targetDate);
  }
}
