import apiClient from './client';
import { offlineDb } from '../storage/offlineDb';

export async function getPinStatus(): Promise<{ pinSet: boolean }> {
  try {
    const res = await apiClient.get('/settings/pin-status');
    return res.data;
  } catch (err) {
    return offlineDb.getPinStatus();
  }
}

export async function verifyPin(pin: string): Promise<{ valid: boolean; needsSetup?: boolean; error?: string }> {
  try {
    const res = await apiClient.post('/settings/verify-pin', { pin });
    return res.data;
  } catch (err) {
    return offlineDb.verifyPin(pin);
  }
}

export async function setPin(newPin: string, currentPin?: string): Promise<{ message: string; pinSet: boolean }> {
  try {
    const res = await apiClient.post('/settings/set-pin', { newPin, currentPin });
    return res.data;
  } catch (err) {
    return offlineDb.setPin(newPin);
  }
}
