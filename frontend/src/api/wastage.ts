import apiClient from './client';
import { Wastage } from '../utils/types';
import { offlineDb } from '../storage/offlineDb';

export async function getWastages(params?: { page?: number; limit?: number; vegetableId?: number; from?: string; to?: string }): Promise<{ wastages: Wastage[]; pagination: any }> {
  try {
    const res = await apiClient.get('/wastage', { params });
    return res.data;
  } catch (err) {
    return offlineDb.getWastages() as any;
  }
}

export async function createWastage(data: any): Promise<Wastage> {
  try {
    const res = await apiClient.post('/wastage', data);
    return res.data;
  } catch (err) {
    return offlineDb.createWastage(data) as any;
  }
}

export async function updateWastage(id: number, data: any): Promise<Wastage> {
  const res = await apiClient.put(`/wastage/${id}`, data);
  return res.data;
}

export async function deleteWastage(id: number): Promise<void> {
  await apiClient.delete(`/wastage/${id}`);
}
