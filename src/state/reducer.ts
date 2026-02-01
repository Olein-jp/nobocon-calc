import { boardKeys, gradeKeys } from '../lib/score';

export type State = {
  counts: Record<string, number>;
  boards: Record<string, boolean>;
  savedAt?: number;
};

export type Action =
  | { type: 'INCREMENT'; key: string }
  | { type: 'DECREMENT'; key: string }
  | { type: 'TOGGLE_BOARD'; key: string }
  | { type: 'TOGGLE_ALL' }
  | { type: 'RESET' }
  | { type: 'RESTORE'; payload: State };

const createCounts = () => Object.fromEntries(gradeKeys.map((key) => [key, 0]));
const createBoards = () => Object.fromEntries(boardKeys.map((key) => [key, false]));

export const initialState: State = {
  counts: createCounts(),
  boards: createBoards()
};

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'INCREMENT': {
      const next = state.counts[action.key] + 1;
      return { ...state, counts: { ...state.counts, [action.key]: next } };
    }
    case 'DECREMENT': {
      const current = state.counts[action.key];
      const next = Math.max(0, current - 1);
      return { ...state, counts: { ...state.counts, [action.key]: next } };
    }
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
      return { ...action.payload };
    default:
      return state;
  }
};
