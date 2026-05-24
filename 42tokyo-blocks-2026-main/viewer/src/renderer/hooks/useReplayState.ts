import { useState, useCallback, useRef } from 'react';
import { GameLog, Move } from '../constants/gameLogSchema';

// ─── 再生状態の型定義 ─────────────────────────────

export interface ReplayState {
  currentHand: number; // 現在のmoves配列インデックス（0=初期盤面）
  currentTurn: number; // 現在のターン番号（0=初期状態）
  lastHand: number; // moves.length
  lastTurn: number; // moves末尾のturn値
}

// ─── トーストメッセージの型 ─────────────────────────

export interface ToastMessage {
  text: string;
  severity: 'info' | 'warning'; // MUIのAlertコンポーネントseverityの中で使用するものだけに絞っている。
}

// ─── 操作結果の型（純粋関数の戻り値） ───────────────

export interface OperationResult {
  state: ReplayState;
  toast: ToastMessage | null;
}

// ─── フック戻り値の型 ──────────────────────────────

export interface UseReplayStateReturn {
  replayState: ReplayState | null; // null = 未読込
  toast: ToastMessage | null;
  clearToast: () => void;
  initialize: (gameLog: GameLog) => void;
  reset: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  turnForward: () => void;
  turnBackward: () => void;
  jumpToFirst: () => void;
  jumpToLast: () => void;
}

// ─── トーストメッセージ定数 ─────────────────────────

export const TOAST = {
  NOT_LOADED: {
    text: 'まず牌譜を読み込んでください',
    severity: 'warning' as const,
  },
  LAST_HAND: {
    text: 'これ以上進めません（最後の手）',
    severity: 'info' as const,
  },
  FIRST_HAND: {
    text: 'これ以上戻れません（最初の手）',
    severity: 'info' as const,
  },
  LAST_TURN: {
    text: 'これ以上進めません（最後のターン）',
    severity: 'info' as const,
  },
  FIRST_TURN: {
    text: 'これ以上戻れません（最初のターン）',
    severity: 'info' as const,
  },
};

// ─── 初期状態を生成する純粋関数 ─────────────────────

export function createInitialReplayState(moves: Move[]): ReplayState {
  if (moves.length === 0) {
    return { currentHand: 0, currentTurn: 0, lastHand: 0, lastTurn: 0 };
  }
  return {
    currentHand: 0,
    currentTurn: 0,
    lastHand: moves.length,
    lastTurn: moves[moves.length - 1].turn,
  };
}

// ─── 未読込判定 ─────────────────────────────────────

export function isLoaded(state: ReplayState | null): boolean {
  return state !== null;
}

// ─── 指定turnを持つ最後のmoveのインデックスを探す ──

export function findLastIndexOfTurn(moves: Move[], turn: number): number {
  for (let i = moves.length - 1; i >= 0; i--) {
    if (moves[i].turn === turn) {
      return i;
    }
  }
  return -1;
}

// ─── 1手進む（純粋関数） ────────────────────────────

export function applyStepForward(
  state: ReplayState,
  moves: Move[],
): OperationResult {
  // 境界チェック
  if (state.currentHand >= state.lastHand) {
    return { state, toast: TOAST.LAST_HAND };
  }

  const newHand = state.currentHand + 1;
  const newTurn = moves[newHand - 1].turn;

  return {
    state: { ...state, currentHand: newHand, currentTurn: newTurn },
    toast: null,
  };
}

// ─── 1手戻す（純粋関数） ────────────────────────────

export function applyStepBackward(
  state: ReplayState,
  moves: Move[],
): OperationResult {
  // 境界チェック
  if (state.currentHand <= 0) {
    return { state, toast: TOAST.FIRST_HAND };
  }

  const newHand = state.currentHand - 1;
  const newTurn = newHand === 0 ? 0 : moves[newHand - 1].turn;

  return {
    state: { ...state, currentHand: newHand, currentTurn: newTurn },
    toast: null,
  };
}

// ─── 1ターン進む（純粋関数） ────────────────────────

export function applyTurnForward(
  state: ReplayState,
  moves: Move[],
): OperationResult {
  if (state.currentTurn >= state.lastTurn) {
    return { state, toast: TOAST.LAST_TURN };
  }

  const newTurn = state.currentTurn + 1;
  const lastIndex = findLastIndexOfTurn(moves, newTurn);
  const newHand = lastIndex + 1;

  return {
    state: { ...state, currentHand: newHand, currentTurn: newTurn },
    toast: null,
  };
}

// ─── 1ターン戻す（純粋関数） ────────────────────────

export function applyTurnBackward(
  state: ReplayState,
  moves: Move[],
): OperationResult {
  if (state.currentTurn <= 0) {
    return { state, toast: TOAST.FIRST_TURN };
  }

  const newTurn = state.currentTurn - 1;

  if (newTurn === 0) {
    return {
      state: { ...state, currentHand: 0, currentTurn: 0 },
      toast: null,
    };
  }

  const lastIndex = findLastIndexOfTurn(moves, newTurn);
  const newHand = lastIndex + 1;

  return {
    state: { ...state, currentHand: newHand, currentTurn: newTurn },
    toast: null,
  };
}

// ─── 最初に戻る（純粋関数） ─────────────────────────
// 設計書 4.6a

export function applyJumpToFirst(state: ReplayState): OperationResult {
  return {
    state: { ...state, currentHand: 0, currentTurn: 0 },
    toast: null,
  };
}

// ─── 最後に進む（純粋関数） ─────────────────────────
// 設計書 4.6b

export function applyJumpToLast(state: ReplayState): OperationResult {
  return {
    state: {
      ...state,
      currentHand: state.lastHand,
      currentTurn: state.lastTurn,
    },
    toast: null,
  };
}

// ─── カスタムフック本体 ─────────────────────────────

export function useReplayState(): UseReplayStateReturn {
  const [replayState, setReplayState] = useState<ReplayState | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const movesRef = useRef<Move[]>([]);

  const clearToast = useCallback(() => {
    setToast(null);
  }, []);

  const initialize = useCallback((gameLog: GameLog) => {
    movesRef.current = gameLog.moves;
    const state = createInitialReplayState(gameLog.moves);
    setReplayState(state);
    setToast(null);
  }, []);

  const reset = useCallback(() => {
    setReplayState(null);
    setToast(null);
  }, []);

  const stepForward = useCallback(() => {
    if (replayState === null) {
      setToast(TOAST.NOT_LOADED);
      return;
    }
    const result = applyStepForward(replayState, movesRef.current);
    setReplayState(result.state);
    setToast(result.toast);
  }, [replayState]);

  const stepBackward = useCallback(() => {
    if (replayState === null) {
      setToast(TOAST.NOT_LOADED);
      return;
    }
    const result = applyStepBackward(replayState, movesRef.current);
    setReplayState(result.state);
    setToast(result.toast);
  }, [replayState]);

  const turnForward = useCallback(() => {
    if (replayState === null) {
      setToast(TOAST.NOT_LOADED);
      return;
    }
    const result = applyTurnForward(replayState, movesRef.current);
    setReplayState(result.state);
    setToast(result.toast);
  }, [replayState]);

  const turnBackward = useCallback(() => {
    if (replayState === null) {
      setToast(TOAST.NOT_LOADED);
      return;
    }
    const result = applyTurnBackward(replayState, movesRef.current);
    setReplayState(result.state);
    setToast(result.toast);
  }, [replayState]);

  const jumpToFirst = useCallback(() => {
    if (replayState === null) {
      setToast(TOAST.NOT_LOADED);
      return;
    }
    const result = applyJumpToFirst(replayState);
    setReplayState(result.state);
    setToast(result.toast);
  }, [replayState]);

  const jumpToLast = useCallback(() => {
    if (replayState === null) {
      setToast(TOAST.NOT_LOADED);
      return;
    }
    const result = applyJumpToLast(replayState);
    setReplayState(result.state);
    setToast(result.toast);
  }, [replayState]);

  return {
    replayState,
    toast,
    clearToast,
    initialize,
    reset,
    stepForward,
    stepBackward,
    turnForward,
    turnBackward,
    jumpToFirst,
    jumpToLast,
  };
}
