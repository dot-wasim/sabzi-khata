import apiClient from './client';
import { AuditLogEntry } from '../utils/types';

export async function getAuditLogs(params?: { page?: number; limit?: number; entity?: string; action?: string; from?: string; to?: string }): Promise<{ logs: AuditLogEntry[]; pagination: any }> {
  const res = await apiClient.get('/audit-log', { params });
  return res.data;
}
