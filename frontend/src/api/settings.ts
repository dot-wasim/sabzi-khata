import apiClient from './client';

export async function getPinStatus(): Promise<{ pinSet: boolean }> {
  const res = await apiClient.get('/settings/pin-status');
  return res.data;
}

export async function verifyPin(pin: string): Promise<{ valid: boolean; needsSetup?: boolean; error?: string }> {
  const res = await apiClient.post('/settings/verify-pin', { pin });
  return res.data;
}

export async function setPin(newPin: string, currentPin?: string): Promise<{ message: string; pinSet: boolean }> {
  const res = await apiClient.post('/settings/set-pin', { newPin, currentPin });
  return res.data;
}
