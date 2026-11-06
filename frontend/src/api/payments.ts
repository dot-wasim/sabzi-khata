import apiClient from './client';
import { Payment } from '../utils/types';
import { offlineDb } from '../storage/offlineDb';

export async function getPayments(params?: { page?: number; limit?: number; direction?: string; sellerId?: number; buyerId?: number; from?: string; to?: string }): Promise<{ payments: Payment[]; pagination: any }> {
  try {
    const res = await apiClient.get('/payments', { params });
    return res.data;
  } catch (err) {
    return offlineDb.getPayments(params);
  }
}

export async function createPayment(data: any): Promise<Payment> {
  try {
    const res = await apiClient.post('/payments', data);
    return res.data;
  } catch (err) {
    const res = await offlineDb.createPayment(data);
    return res as unknown as Payment;
  }
}

export async function updatePayment(id: number, data: any): Promise<Payment> {
  try {
    const res = await apiClient.put(`/payments/${id}`, data);
    return res.data;
  } catch (err) {
    return { ...data, id };
  }
}

export async function deletePayment(id: number): Promise<void> {
  try {
    await apiClient.delete(`/payments/${id}`);
  } catch (err) {
    // offline noop
  }
}

