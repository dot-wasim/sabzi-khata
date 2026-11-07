import apiClient from './client';
import { Purchase } from '../utils/types';
import { offlineDb } from '../storage/offlineDb';

export async function getPurchases(params?: { page?: number; limit?: number; from?: string; to?: string; sellerId?: number }): Promise<{ purchases: Purchase[]; pagination: any }> {
  try {
    const res = await apiClient.get('/purchases', { params });
    return res.data;
  } catch (err) {
    return offlineDb.getPurchases();
  }
}

export async function getPurchase(id: number | string): Promise<Purchase> {
  try {
    const res = await apiClient.get(`/purchases/${id}`);
    return res.data;
  } catch (err) {
    return offlineDb.getPurchase(id);
  }
}

export async function createPurchase(data: any): Promise<Purchase> {
  try {
    const res = await apiClient.post('/purchases', data);
    return res.data;
  } catch (err) {
    return (await offlineDb.createPurchase(data)) as any;
  }
}

export async function updatePurchase(id: number | string, data: any): Promise<Purchase> {
  try {
    const res = await apiClient.put(`/purchases/${id}`, data);
    return res.data;
  } catch (err) {
    return (await offlineDb.updatePurchase(id, data)) as any;
  }
}

export async function deletePurchase(id: number): Promise<void> {
  await apiClient.delete(`/purchases/${id}`);
}
