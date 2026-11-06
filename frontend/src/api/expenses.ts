import apiClient from './client';
import { Expense } from '../utils/types';
import { offlineDb } from '../storage/offlineDb';

export async function getExpenses(params?: { page?: number; limit?: number; category?: string; from?: string; to?: string }): Promise<{ expenses: Expense[]; pagination: any }> {
  try {
    const res = await apiClient.get('/expenses', { params });
    return res.data;
  } catch (err) {
    return offlineDb.getExpenses(params);
  }
}

export async function createExpense(data: any): Promise<Expense> {
  try {
    const res = await apiClient.post('/expenses', data);
    return res.data;
  } catch (err) {
    return offlineDb.createExpense(data) as any;
  }
}

export async function updateExpense(id: number, data: any): Promise<Expense> {
  const res = await apiClient.put(`/expenses/${id}`, data);
  return res.data;
}

export async function deleteExpense(id: number): Promise<void> {
  await apiClient.delete(`/expenses/${id}`);
}
