import apiClient from './client';
import { Seller } from '../utils/types';
import { offlineDb } from '../storage/offlineDb';

export async function getSellers(search?: string, type?: string, ownFarmerOnly?: boolean): Promise<Seller[]> {
  try {
    const res = await apiClient.get('/sellers', { params: { search, type, ownFarmerOnly } });
    return Array.isArray(res.data) ? res.data : res.data?.sellers || [];
  } catch (err) {
    return offlineDb.getSellers(search);
  }
}

export async function getSeller(id: number): Promise<any> {
  try {
    const res = await apiClient.get(`/sellers/${id}`);
    return res.data;
  } catch (err) {
    return offlineDb.getSeller(id);
  }
}

export async function getSellerLedger(id: number, from?: string, to?: string): Promise<any> {
  try {
    const res = await apiClient.get(`/sellers/${id}/ledger`, { params: { from, to } });
    return res.data;
  } catch (err) {
    return offlineDb.getSeller(id);
  }
}

export async function createSeller(data: any): Promise<Seller> {
  try {
    const res = await apiClient.post('/sellers', data);
    return res.data;
  } catch (err) {
    return (await offlineDb.createSeller(data)) as any;
  }
}

export async function updateSeller(id: number, data: any): Promise<Seller> {
  try {
    const res = await apiClient.put(`/sellers/${id}`, data);
    return res.data;
  } catch (err) {
    return { ...data, id };
  }
}

export async function deleteSeller(id: number): Promise<void> {
  try {
    await apiClient.delete(`/sellers/${id}`);
  } catch (err) {
    // offline noop
  }
}
