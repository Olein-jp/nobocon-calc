import { boardKeys, gradeKeys, isClassType } from '../lib/score';
import type { BoardKey, ClassType, GradeKey } from '../lib/score';

const MAX_COUNT = 999;

export type State = {
  counts: Record<GradeKey, number>;
  boards: Record<BoardKey, boolean>;
  classType: ClassType;
  classCounts: Record<GradeKey, number>;
  savedAt?: number;
};

export type Action =
  | { type: 'INCREMENT'; key: GradeKey }
  | { type: 'DECREMENT'; key: GradeKey }
  | { type: 'INCREMENT_CLASS_COUNT'; key: GradeKey }
  | { type: 'DECREMENT_CLASS_COUNT'; key: GradeKey }
  | { type: 'SET_CLASS_TYPE'; classType: ClassType }
  | { type: 'RESET_CLASS_SETTINGS' }
  | { type: 'TOGGLE_BOARD'; key: BoardKey }
  | { type: 'TOGGLE_ALL' }
  | { type: 'RESET' }
  | { type: 'RESTORE'; payload: Partial<State> };

const clampCount = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.min(MAX_COUNT, Math.max(0, Math.trunc(value)));
};

const createCounts = () => Object.fromEntries(gradeKeys.map((key) => [key, 0])) as Record<GradeKey, number>;
const createBoards = () =>
  Object.fromEntries(boardKeys.map((key) => [key, false])) as Record<BoardKey, boolean>;
const createClassCounts = () =>
  Object.fromEntries(gradeKeys.map((key) => [key, 0])) as Record<GradeKey, number>;

const restoreCounts = (source: unknown): Record<GradeKey, number> => {
  const next = createCounts();
  if (!source || typeof source !== 'object') return next;
  for (const key of gradeKeys) {
    next[key] = clampCount((source as Record<string, unknown>)[key]);
  }
  return next;
};

const restoreBoards = (source: unknown): Record<BoardKey, boolean> => {
  const next = createBoards();
  if (!source || typeof source !== 'object') return next;
  for (const key of boardKeys) {
    next[key] = Boolean((source as Record<string, unknown>)[key]);
  }
  return next;
};

export const initialState: State = {
  counts: createCounts(),
  boards: createBoards(),
  classType: 'general',
  classCounts: createClassCounts()
};

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'INCREMENT': {
      const next = Math.min(MAX_COUNT, state.counts[action.key] + 1);
      return { ...state, counts: { ...state.counts, [action.key]: next } };
    }
    case 'DECREMENT': {
      const current = state.counts[action.key];
      const next = Math.max(0, current - 1);
      return { ...state, counts: { ...state.counts, [action.key]: next } };
    }
    case 'INCREMENT_CLASS_COUNT': {
      const next = Math.min(MAX_COUNT, state.classCounts[action.key] + 1);
      return { ...state, classCounts: { ...state.classCounts, [action.key]: next } };
    }
    case 'DECREMENT_CLASS_COUNT': {
      const current = state.classCounts[action.key];
      const next = Math.max(0, current - 1);
      return { ...state, classCounts: { ...state.classCounts, [action.key]: next } };
    }
    case 'SET_CLASS_TYPE':
      return { ...state, classType: action.classType };
    case 'RESET_CLASS_SETTINGS':
      return { ...state, classType: 'general', classCounts: createClassCounts() };
    case 'TOGGLE_BOARD': {
      const next = !state.boards[action.key];
      return { ...state, boards: { ...state.boards, [action.key]: next } };
    }
    case 'TOGGLE_ALL': {
      const allOn = Object.values(state.boards).every(Boolean);
      const nextBoards = Object.fromEntries(
        Object.keys(state.boards).map((key) => [key, !allOn])
      ) as Record<string, boolean>;
      return { ...state, boards: nextBoards };
    }
    case 'RESET':
      return initialState;
    case 'RESTORE':
      return {
        ...initialState,
        ...action.payload,
        counts: restoreCounts(action.payload.counts),
        boards: restoreBoards(action.payload.boards),
        classCounts: restoreCounts(action.payload.classCounts),
        classType: isClassType(action.payload.classType) ? action.payload.classType : 'general',
        savedAt:
          typeof action.payload.savedAt === 'number' && Number.isFinite(action.payload.savedAt)
            ? action.payload.savedAt
            : undefined
      };
    default:
      return state;
  }
};
