import { boardKeys, gradeKeys, isClassType } from '../lib/score';
import type { BoardKey, ClassType, GradeKey } from '../lib/score';

const MAX_COUNT = 999;
const MAX_PLAYER_NAME_LENGTH = 16;
export const playerSlots = [
  { id: 'player1', label: '1人目' },
  { id: 'player2', label: '2人目' }
] as const;

export type PlayerId = (typeof playerSlots)[number]['id'];
export type ParticipantCount = 1 | 2;

export type PlayerState = {
  name: string;
  counts: Record<GradeKey, number>;
  boards: Record<BoardKey, boolean>;
  classType: ClassType;
  classCounts: Record<GradeKey, number>;
};

export type State = {
  players: Record<PlayerId, PlayerState>;
  activePlayerId: PlayerId;
  participantCount: ParticipantCount;
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
  | { type: 'SET_ACTIVE_PLAYER'; playerId: PlayerId }
  | { type: 'SET_PARTICIPANT_COUNT'; count: ParticipantCount }
  | { type: 'SET_PLAYER_NAME'; playerId: PlayerId; name: string }
  | { type: 'RESET_ACTIVE_PLAYER' }
  | { type: 'RESET_ALL' }
  | { type: 'RESTORE'; payload: unknown };

const clampCount = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.min(MAX_COUNT, Math.max(0, Math.trunc(value)));
};

const createCounts = () => Object.fromEntries(gradeKeys.map((key) => [key, 0])) as Record<GradeKey, number>;
const createBoards = () =>
  Object.fromEntries(boardKeys.map((key) => [key, false])) as Record<BoardKey, boolean>;
const createClassCounts = () =>
  Object.fromEntries(gradeKeys.map((key) => [key, 0])) as Record<GradeKey, number>;
const getDefaultPlayerName = (playerId: PlayerId) =>
  playerSlots.find(({ id }) => id === playerId)?.label ?? '参加者';
const normalizePlayerName = (value: string) => value.slice(0, MAX_PLAYER_NAME_LENGTH);
const restorePlayerName = (value: unknown, fallback: string) =>
  typeof value === 'string' && value !== fallback ? normalizePlayerName(value) : '';
const createPlayerState = (): PlayerState => ({
  name: '',
  counts: createCounts(),
  boards: createBoards(),
  classType: 'general',
  classCounts: createClassCounts()
});
const createPlayers = () =>
  Object.fromEntries(playerSlots.map(({ id }) => [id, createPlayerState()])) as Record<PlayerId, PlayerState>;

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
  players: createPlayers(),
  activePlayerId: 'player1',
  participantCount: 1
};

const isPlayerId = (value: unknown): value is PlayerId =>
  typeof value === 'string' && playerSlots.some(({ id }) => id === value);
const isParticipantCount = (value: unknown): value is ParticipantCount => value === 1 || value === 2;

const restorePlayerState = (playerId: PlayerId, source: unknown): PlayerState => {
  if (!source || typeof source !== 'object') return createPlayerState();
  const payload = source as Partial<PlayerState>;
  return {
    name: restorePlayerName(payload.name, getDefaultPlayerName(playerId)),
    counts: restoreCounts(payload.counts),
    boards: restoreBoards(payload.boards),
    classType: isClassType(payload.classType) ? payload.classType : 'general',
    classCounts: restoreCounts(payload.classCounts)
  };
};

const restoreState = (payload: unknown): State => {
  if (!payload || typeof payload !== 'object') return initialState;
  const source = payload as Partial<State> & Partial<PlayerState>;
  const savedAt =
    typeof source.savedAt === 'number' && Number.isFinite(source.savedAt) ? source.savedAt : undefined;

  if (source.players && typeof source.players === 'object') {
    const players = createPlayers();
    for (const { id } of playerSlots) {
      players[id] = restorePlayerState(id, (source.players as Partial<Record<PlayerId, unknown>>)[id]);
    }
    const participantCount = isParticipantCount(source.participantCount) ? source.participantCount : 1;
    const activePlayerId = isPlayerId(source.activePlayerId) ? source.activePlayerId : 'player1';
    return {
      players,
      activePlayerId: participantCount === 1 ? 'player1' : activePlayerId,
      participantCount,
      savedAt
    };
  }

  return {
    players: {
      ...createPlayers(),
      player1: restorePlayerState('player1', source)
    },
    activePlayerId: 'player1',
    participantCount: 1,
    savedAt
  };
};

const updateActivePlayer = (state: State, updater: (player: PlayerState) => PlayerState): State => ({
  ...state,
  players: {
    ...state.players,
    [state.activePlayerId]: updater(state.players[state.activePlayerId])
  }
});

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'INCREMENT': {
      return updateActivePlayer(state, (player) => {
        const next = Math.min(MAX_COUNT, player.counts[action.key] + 1);
        return { ...player, counts: { ...player.counts, [action.key]: next } };
      });
    }
    case 'DECREMENT': {
      return updateActivePlayer(state, (player) => {
        const current = player.counts[action.key];
        const next = Math.max(0, current - 1);
        return { ...player, counts: { ...player.counts, [action.key]: next } };
      });
    }
    case 'INCREMENT_CLASS_COUNT': {
      return updateActivePlayer(state, (player) => {
        const next = Math.min(MAX_COUNT, player.classCounts[action.key] + 1);
        return { ...player, classCounts: { ...player.classCounts, [action.key]: next } };
      });
    }
    case 'DECREMENT_CLASS_COUNT': {
      return updateActivePlayer(state, (player) => {
        const current = player.classCounts[action.key];
        const next = Math.max(0, current - 1);
        return { ...player, classCounts: { ...player.classCounts, [action.key]: next } };
      });
    }
    case 'SET_CLASS_TYPE':
      return updateActivePlayer(state, (player) => ({ ...player, classType: action.classType }));
    case 'RESET_CLASS_SETTINGS':
      return updateActivePlayer(state, (player) => ({
        ...player,
        classType: 'general',
        classCounts: createClassCounts()
      }));
    case 'TOGGLE_BOARD': {
      return updateActivePlayer(state, (player) => {
        const next = !player.boards[action.key];
        return { ...player, boards: { ...player.boards, [action.key]: next } };
      });
    }
    case 'TOGGLE_ALL': {
      const activePlayer = state.players[state.activePlayerId];
      const allOn = Object.values(activePlayer.boards).every(Boolean);
      const nextBoards = Object.fromEntries(
        Object.keys(activePlayer.boards).map((key) => [key, !allOn])
      ) as Record<BoardKey, boolean>;
      return updateActivePlayer(state, (player) => ({ ...player, boards: nextBoards }));
    }
    case 'SET_ACTIVE_PLAYER':
      return { ...state, activePlayerId: action.playerId };
    case 'SET_PARTICIPANT_COUNT':
      return {
        ...state,
        participantCount: action.count,
        activePlayerId: action.count === 1 ? 'player1' : state.activePlayerId
      };
    case 'SET_PLAYER_NAME':
      return {
        ...state,
        players: {
          ...state.players,
          [action.playerId]: {
            ...state.players[action.playerId],
            name: normalizePlayerName(action.name)
          }
        }
      };
    case 'RESET_ACTIVE_PLAYER':
      return {
        ...state,
        players: {
          ...state.players,
          [state.activePlayerId]: {
            ...createPlayerState(),
            name: state.players[state.activePlayerId].name
          }
        }
      };
    case 'RESET_ALL':
      return initialState;
    case 'RESTORE':
      return restoreState(action.payload);
    default:
      return state;
  }
};
