import apiClient from './client';
import { Payment } from '../utils/types';

export async function getPayments(params?: { page?: number; limit?: number; direction?: string; sellerId?: number; buyerId?: number; from?: string; to?: string }): Promise<{ payments: Payment[]; pagination: any }> {
  const res = await apiClient.get('/payments', { params });
  return res.data;
}

export async function createPayment(data: any): Promise<Payment> {
  const res = await apiClient.post('/payments', data);
  return res.data;
}

export async function updatePayment(id: number, data: any): Promise<Payment> {
  const res = await apiClient.put(`/payments/${id}`, data);
  return res.data;
}

export async function deletePayment(id: number): Promise<void> {
  await apiClient.delete(`/payments/${id}`);
}
