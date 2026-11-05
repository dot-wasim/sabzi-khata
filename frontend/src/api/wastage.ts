import apiClient from './client';
import { Wastage } from '../utils/types';

export async function getWastages(params?: { page?: number; limit?: number; vegetableId?: number; from?: string; to?: string }): Promise<{ wastages: Wastage[]; pagination: any }> {
  const res = await apiClient.get('/wastage', { params });
  return res.data;
}

export async function createWastage(data: any): Promise<Wastage> {
  const res = await apiClient.post('/wastage', data);
  return res.data;
}

export async function updateWastage(id: number, data: any): Promise<Wastage> {
  const res = await apiClient.put(`/wastage/${id}`, data);
  return res.data;
}

export async function deleteWastage(id: number): Promise<void> {
  await apiClient.delete(`/wastage/${id}`);
}
