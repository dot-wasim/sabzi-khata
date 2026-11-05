import apiClient from './client';
import { User } from '../utils/types';
import { offlineDb } from '../storage/offlineDb';

export async function login(username: string, password: string): Promise<{ token: string; user: User }> {
  try {
    const res = await apiClient.post('/auth/login', { username, password });
    return res.data;
  } catch (err) {
    console.warn('Network API failed, using offline phone storage:', err);
    return (await offlineDb.login(username, password)) as { token: string; user: User };
  }
}

export async function getMe(): Promise<{ user: User }> {
  try {
    const res = await apiClient.get('/auth/me');
    return res.data;
  } catch (err) {
    return (await offlineDb.getMe()) as { user: User };
  }
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<{ message: string }> {
  const res = await apiClient.put('/auth/change-password', { oldPassword, newPassword });
  return res.data;
}
