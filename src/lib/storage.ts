import type { State } from '../state/reducer';

const STORAGE_KEY = 'nobocon-calc:v3';
const LEGACY_STORAGE_KEYS = ['nobocon-calc:v2', 'nobocon-calc:v1'];
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

const parseStoredState = (raw: string | null): unknown | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const isFreshState = (savedAt: unknown) =>
  typeof savedAt === 'number' && Number.isFinite(savedAt) && Date.now() - savedAt <= TTL_MS;

const getSavedAt = (state: unknown) => {
  if (!state || typeof state !== 'object') return undefined;
  return (state as { savedAt?: unknown }).savedAt;
};

export const loadState = (): unknown | null => {
  try {
    const current = parseStoredState(window.localStorage.getItem(STORAGE_KEY));
    if (isFreshState(getSavedAt(current))) {
      return current;
    }

    for (const legacyKey of LEGACY_STORAGE_KEYS) {
      const legacy = parseStoredState(window.localStorage.getItem(legacyKey));
      if (isFreshState(getSavedAt(legacy))) {
        window.localStorage.removeItem(STORAGE_KEY);
        return legacy;
      }
    }

    if (current || LEGACY_STORAGE_KEYS.some((legacyKey) => window.localStorage.getItem(legacyKey))) {
      window.localStorage.removeItem(STORAGE_KEY);
      LEGACY_STORAGE_KEYS.forEach((legacyKey) => window.localStorage.removeItem(legacyKey));
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
  LEGACY_STORAGE_KEYS.forEach((legacyKey) => window.localStorage.removeItem(legacyKey));
};

export const ttlMs = TTL_MS;
