import apiClient from './client';
import { Account, AccountTransaction } from '../utils/types';
import { offlineDb } from '../storage/offlineDb';

export async function getAccounts(): Promise<Account[]> {
  try {
    const res = await apiClient.get('/accounts');
    return Array.isArray(res.data) ? res.data : res.data?.accounts || [];
  } catch (err) {
    return offlineDb.getAccounts();
  }
}

export async function createAccount(data: {
  name: string;
  type: string;
  accountNumber?: string;
  openingBalance: number;
  isDefault?: boolean;
}): Promise<Account> {
  const res = await apiClient.post('/accounts', data);
  return res.data;
}

export async function updateAccount(id: number, data: Partial<Account>): Promise<Account> {
  const res = await apiClient.put(`/accounts/${id}`, data);
  return res.data;
}

export async function getAccountPassbook(id: number): Promise<{
  account: Account;
  openingBalance: number;
  currentBalance: number;
  transactions: AccountTransaction[];
}> {
  const res = await apiClient.get(`/accounts/${id}/passbook`);
  return res.data;
}

export async function transferAccount(data: {
  date: string;
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  notes?: string;
}): Promise<any> {
  const res = await apiClient.post('/accounts/transfer', data);
  return res.data;
}
