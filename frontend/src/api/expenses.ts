import apiClient from './client';
import { Expense } from '../utils/types';

export async function getExpenses(params?: { page?: number; limit?: number; category?: string; from?: string; to?: string }): Promise<{ expenses: Expense[]; pagination: any }> {
  const res = await apiClient.get('/expenses', { params });
  return res.data;
}

export async function createExpense(data: any): Promise<Expense> {
  const res = await apiClient.post('/expenses', data);
  return res.data;
}

export async function updateExpense(id: number, data: any): Promise<Expense> {
  const res = await apiClient.put(`/expenses/${id}`, data);
  return res.data;
}

export async function deleteExpense(id: number): Promise<void> {
  await apiClient.delete(`/expenses/${id}`);
}
