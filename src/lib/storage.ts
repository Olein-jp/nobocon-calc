import type { State } from '../state/reducer';

const STORAGE_KEY = 'nobocon-calc:v1';
const TTL_MS = 12 * 60 * 60 * 1000;

export type StorageStatus =
  | { available: true }
  | { available: false; reason: string };

export const checkStorage = (): StorageStatus => {
  try {
    const testKey = '__nobocon_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return { available: true };
  } catch (error) {
    return { available: false, reason: error instanceof Error ? error.message : 'localStorage unavailable' };
  }
};

export const loadState = (): State | null => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as State;
    if (!parsed?.savedAt) return null;
    const isFresh = Date.now() - parsed.savedAt <= TTL_MS;
    if (!isFresh) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const saveState = (state: State) => {
  const payload: State = { ...state, savedAt: Date.now() };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};

export const clearState = () => {
  window.localStorage.removeItem(STORAGE_KEY);
};

export const ttlMs = TTL_MS;
