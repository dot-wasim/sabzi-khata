import apiClient from './client';
import { Buyer } from '../utils/types';
import { offlineDb } from '../storage/offlineDb';

export async function getBuyers(search?: string): Promise<Buyer[]> {
  try {
    const res = await apiClient.get('/buyers', { params: { search } });
    return Array.isArray(res.data) ? res.data : res.data?.buyers || [];
  } catch (err) {
    return offlineDb.getBuyers(search);
  }
}

export async function getBuyer(id: number): Promise<any> {
  try {
    const res = await apiClient.get(`/buyers/${id}`);
    return res.data;
  } catch (err) {
    return offlineDb.getBuyer(id);
  }
}

export async function getBuyerLedger(id: number, from?: string, to?: string): Promise<any> {
  try {
    const res = await apiClient.get(`/buyers/${id}/ledger`, { params: { from, to } });
    return res.data;
  } catch (err) {
    return offlineDb.getBuyer(id);
  }
}

export async function createBuyer(data: any): Promise<Buyer> {
  try {
    const res = await apiClient.post('/buyers', data);
    return res.data;
  } catch (err) {
    return offlineDb.createBuyer(data);
  }
}

export async function updateBuyer(id: number, data: any): Promise<Buyer> {
  try {
    const res = await apiClient.put(`/buyers/${id}`, data);
    return res.data;
  } catch (err) {
    return { ...data, id };
  }
}

export async function deleteBuyer(id: number): Promise<void> {
  try {
    await apiClient.delete(`/buyers/${id}`);
  } catch (err) {
    // offline noop
  }
}
