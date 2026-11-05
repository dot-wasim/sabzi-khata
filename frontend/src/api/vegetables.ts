import apiClient from './client';
import { Vegetable } from '../utils/types';
import { offlineDb } from '../storage/offlineDb';

export async function getVegetables(search?: string): Promise<Vegetable[]> {
  try {
    const res = await apiClient.get('/vegetables', { params: { search } });
    return Array.isArray(res.data) ? res.data : res.data?.vegetables || [];
  } catch (err) {
    console.warn('Network API failed, using offline phone storage for vegetables:', err);
    return offlineDb.getVegetables();
  }
}

export async function createVegetable(data: { nameEn: string; nameHi: string; unit: string; category?: string }): Promise<Vegetable> {
  try {
    const res = await apiClient.post('/vegetables', data);
    return res.data;
  } catch (err) {
    return offlineDb.createVegetable(data);
  }
}

export async function updateVegetable(id: number, data: Partial<Vegetable>): Promise<Vegetable> {
  try {
    const res = await apiClient.put(`/vegetables/${id}`, data);
    return res.data;
  } catch (err) {
    return offlineDb.updateVegetable(id, data);
  }
}

export async function deleteVegetable(id: number): Promise<void> {
  try {
    await apiClient.delete(`/vegetables/${id}`);
  } catch (err) {
    await offlineDb.deleteVegetable(id);
  }
}
