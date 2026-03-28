import type { State } from '../state/reducer';

const STORAGE_KEY = 'nobocon-calc:v2';
const LEGACY_STORAGE_KEY = 'nobocon-calc:v1';
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

const parseStoredState = (raw: string | null): Partial<State> | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Partial<State>;
  } catch {
    return null;
  }
};

const isFreshState = (savedAt: unknown) =>
  typeof savedAt === 'number' && Number.isFinite(savedAt) && Date.now() - savedAt <= TTL_MS;

export const loadState = (): Partial<State> | null => {
  try {
    const current = parseStoredState(window.localStorage.getItem(STORAGE_KEY));
    if (current?.savedAt && isFreshState(current.savedAt)) {
      return current;
    }

    const legacy = parseStoredState(window.localStorage.getItem(LEGACY_STORAGE_KEY));
    if (legacy?.savedAt && isFreshState(legacy.savedAt)) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      return legacy;
    }

    if (current || legacy) {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    }

    return null;
  } catch {
    return null;
  }
};

export const saveState = (state: State): StorageStatus => {
  try {
    const payload: State = { ...state, savedAt: Date.now() };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return { available: true };
  } catch (error) {
    return { available: false, reason: error instanceof Error ? error.message : 'save failed' };
  }
};

export const clearState = () => {
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_STORAGE_KEY);
};

export const ttlMs = TTL_MS;
