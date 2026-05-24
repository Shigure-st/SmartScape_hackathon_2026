import {
  createInitialReplayState,
  isLoaded,
  applyStepForward,
  applyStepBackward,
  applyTurnForward,
  applyTurnBackward,
  applyJumpToFirst,
  applyJumpToLast,
  findLastIndexOfTurn,
  TOAST,
  ReplayState,
} from '../../renderer/hooks/useReplayState';
import { GameLog } from '../../renderer/constants/gameLogSchema';

// ─── テスト用データ ─────────────────────────────────
//
// sampleGameLog の moves 構造:
//   index 0: turn=1, P1, piece F
//   index 1: turn=1, P2, piece I5
//   index 2: turn=2, P1, piece L4
//   index 3: turn=2, P2, pass
//   index 4: turn=3, P1, piece T4   ← P2パス後、P1のみ
//   index 5: turn=4, P1, piece I3   ← P1のみ
//
// ターン → 手の対応:
//   turn=1: index 0,1 → lastIndex=1 → hand=2
//   turn=2: index 2,3 → lastIndex=3 → hand=4
//   turn=3: index 4   → lastIndex=4 → hand=5
//   turn=4: index 5   → lastIndex=5 → hand=6

/** 通常の試合ログ（パス後の片方プレイヤー続行を含む） */
const sampleGameLog: GameLog = {
  players: [
    { id: 'P1', name: 'ss_tarou' },
    { id: 'P2', name: 'ss_jirou' },
  ],
  moves: [
    { turn: 1, player: 'P1', piece: 'F', rotation_flip: 0, pos: ['1', '1'] },
    { turn: 1, player: 'P2', piece: 'I5', rotation_flip: 0, pos: ['A', 'A'] },
    { turn: 2, player: 'P1', piece: 'L4', rotation_flip: 1, pos: ['2', '1'] },
    { turn: 2, player: 'P2', action: 'pass' },
    { turn: 3, player: 'P1', piece: 'T4', rotation_flip: 0, pos: ['4', '1'] },
    { turn: 4, player: 'P1', piece: 'I3', rotation_flip: 2, pos: ['6', '1'] },
  ],
  end: {
    reason: 'normal',
    winner: 'P1',
    score: { P1: 50, P2: 30 },
  },
};

/** 空movesの試合ログ */
const emptyMovesGameLog: GameLog = {
  players: [
    { id: 'P1', name: 'ss_tarou' },
    { id: 'P2', name: 'ss_jirou' },
  ],
  moves: [],
  end: {
    reason: 'resign',
    winner: 'P2',
    score: { P1: 0, P2: 0 },
  },
};

/** 1手だけの試合ログ */
const singleMoveGameLog: GameLog = {
  players: [
    { id: 'P1', name: 'ss_tarou' },
    { id: 'P2', name: 'ss_jirou' },
  ],
  moves: [
    { turn: 1, player: 'P1', piece: 'F', rotation_flip: 0, pos: ['1', '1'] },
  ],
  end: {
    reason: 'resign',
    winner: 'P2',
    score: { P1: 5, P2: 0 },
  },
};

/** ヘルパー: sampleGameLog の初期状態を取得 */
function initSample(): ReplayState {
  return createInitialReplayState(sampleGameLog.moves);
}

// =============================================================
// テスト表記載テスト
// =============================================================

// ─── B001: 初期状態表示 ─────────────────────────────

test('B001: 初期化直後は currentHand=0（初期盤面）である', () => {
  const state = createInitialReplayState(sampleGameLog.moves);
  expect(state.currentHand).toBe(0);
});

// ─── C006: 未読込時進行禁止 ─────────────────────────

test('C006: 未読込状態（null）で isLoaded が false を返す', () => {
  expect(isLoaded(null)).toBe(false);
});

// ─── D001: 1手進む動作 ──────────────────────────────

test('D001: 1手進むと currentHand が1増加する', () => {
  const state = initSample();
  const result = applyStepForward(state, sampleGameLog.moves);
  expect(result.state.currentHand).toBe(1);
  expect(result.toast).toBeNull();
});

// ─── D002: 1手戻す動作 ──────────────────────────────

test('D002: 1手進んでから1手戻すと currentHand=0 に戻る', () => {
  const state = initSample();
  const r1 = applyStepForward(state, sampleGameLog.moves);
  const r2 = applyStepBackward(r1.state, sampleGameLog.moves);
  expect(r2.state.currentHand).toBe(0);
  expect(r2.state.currentTurn).toBe(0);
  expect(r2.toast).toBeNull();
});

// ─── D003: 1ターン進む動作 ──────────────────────────

test('D003: 1ターン進むと currentTurn が1増加し該当ターンの最後の手まで進む', () => {
  const state = initSample();
  const result = applyTurnForward(state, sampleGameLog.moves);
  expect(result.state.currentTurn).toBe(1);
  // turn=1 の最後のmove は index 1 → hand=2
  expect(result.state.currentHand).toBe(2);
  expect(result.toast).toBeNull();
});

// ─── D004: 1ターン戻す動作 ──────────────────────────

test('D004: 1ターン進んでから1ターン戻すと初期状態に戻る', () => {
  const state = initSample();
  const r1 = applyTurnForward(state, sampleGameLog.moves);
  const r2 = applyTurnBackward(r1.state, sampleGameLog.moves);
  expect(r2.state.currentTurn).toBe(0);
  expect(r2.state.currentHand).toBe(0);
  expect(r2.toast).toBeNull();
});

// ─── D005: 最初へ戻る動作 ───────────────────────────

test('D005: 途中まで進んだ状態から最初へ戻ると currentHand=0 になる', () => {
  let state = initSample();
  for (let i = 0; i < 4; i++) {
    state = applyStepForward(state, sampleGameLog.moves).state;
  }
  expect(state.currentHand).toBe(4);

  const result = applyJumpToFirst(state);
  expect(result.state.currentHand).toBe(0);
  expect(result.state.currentTurn).toBe(0);
  expect(result.toast).toBeNull();
});

// ─── D006: 最後へ進む動作 ───────────────────────────

test('D006: 最後へ進むと currentHand=lastHand になる', () => {
  const state = initSample();
  const result = applyJumpToLast(state);
  expect(result.state.currentHand).toBe(state.lastHand);
  expect(result.state.currentTurn).toBe(state.lastTurn);
  expect(result.toast).toBeNull();
});

// ─── E001: 未読込時操作禁止トースト ──────────────────

test('E001: 未読込時トーストメッセージが定義されている', () => {
  expect(TOAST.NOT_LOADED.text).toBe('まず牌譜を読み込んでください');
  expect(TOAST.NOT_LOADED.severity).toBe('warning');
});

// ─── E004: 読み込み後状態更新 ────────────────────────

test('E004: 通常ログ読み込み後に currentHand=0, currentTurn=0 で初期化される', () => {
  const state = createInitialReplayState(sampleGameLog.moves);
  expect(state.currentHand).toBe(0);
  expect(state.currentTurn).toBe(0);
});

// =============================================================
// 追加テスト（テスト表外）
// =============================================================

// ─── 初期化の補足テスト ─────────────────────────────

test('読込済み状態で isLoaded が true を返す', () => {
  const state = createInitialReplayState(sampleGameLog.moves);
  expect(isLoaded(state)).toBe(true);
});

test('通常ログ読み込み後に lastHand が moves.length と一致する', () => {
  const state = createInitialReplayState(sampleGameLog.moves);
  expect(state.lastHand).toBe(6);
});

test('通常ログ読み込み後に lastTurn が moves末尾の turn 値と一致する', () => {
  const state = createInitialReplayState(sampleGameLog.moves);
  expect(state.lastTurn).toBe(4);
});

test('空のmoves配列で初期化した場合、全て0になる', () => {
  const state = createInitialReplayState(emptyMovesGameLog.moves);
  expect(state.currentHand).toBe(0);
  expect(state.currentTurn).toBe(0);
  expect(state.lastHand).toBe(0);
  expect(state.lastTurn).toBe(0);
});

test('1手だけのmoves配列で lastHand=1, lastTurn=1 になる', () => {
  const state = createInitialReplayState(singleMoveGameLog.moves);
  expect(state.currentHand).toBe(0);
  expect(state.currentTurn).toBe(0);
  expect(state.lastHand).toBe(1);
  expect(state.lastTurn).toBe(1);
});

test('別のログで再初期化すると状態が上書きされる', () => {
  const state1 = createInitialReplayState(sampleGameLog.moves);
  expect(state1.lastHand).toBe(6);

  const state2 = createInitialReplayState(singleMoveGameLog.moves);
  expect(state2.lastHand).toBe(1);
  expect(state2.currentHand).toBe(0);
});

// ─── 1手進むの補足テスト ────────────────────────────

test('1手進むと currentTurn が該当moveのturn値に更新される', () => {
  const state = initSample();
  const result = applyStepForward(state, sampleGameLog.moves);
  // moves[0].turn === 1
  expect(result.state.currentTurn).toBe(1);
});

test('2手連続で進むと currentHand=2, currentTurn は moves[1].turn になる', () => {
  const state = initSample();
  const r1 = applyStepForward(state, sampleGameLog.moves);
  const r2 = applyStepForward(r1.state, sampleGameLog.moves);
  expect(r2.state.currentHand).toBe(2);
  // moves[1].turn === 1（同一ターン内の2手目）
  expect(r2.state.currentTurn).toBe(1);
});

test('ターン境界をまたいで3手進むと currentTurn が2になる', () => {
  let state = initSample();
  for (let i = 0; i < 3; i++) {
    state = applyStepForward(state, sampleGameLog.moves).state;
  }
  // moves[2].turn === 2
  expect(state.currentHand).toBe(3);
  expect(state.currentTurn).toBe(2);
});

test('最後の手（currentHand=lastHand）でさらに進むとトーストが出る', () => {
  let state = initSample();
  for (let i = 0; i < 6; i++) {
    state = applyStepForward(state, sampleGameLog.moves).state;
  }
  expect(state.currentHand).toBe(6);

  const result = applyStepForward(state, sampleGameLog.moves);
  expect(result.state.currentHand).toBe(6); // 変化なし
  expect(result.toast).toEqual(TOAST.LAST_HAND);
});

test('パス後にP1だけ続行するターン(turn=3,4)を正しく追跡する', () => {
  let state = initSample();
  const expectedTurns = [1, 1, 2, 2, 3, 4];
  for (let i = 0; i < 6; i++) {
    const result = applyStepForward(state, sampleGameLog.moves);
    state = result.state;
    expect(state.currentHand).toBe(i + 1);
    expect(state.currentTurn).toBe(expectedTurns[i]);
  }
});

// ─── 1手戻すの補足テスト ────────────────────────────

test('3手進んでから1手戻すと currentHand=2 になる', () => {
  let state = initSample();
  for (let i = 0; i < 3; i++) {
    state = applyStepForward(state, sampleGameLog.moves).state;
  }
  const result = applyStepBackward(state, sampleGameLog.moves);
  expect(result.state.currentHand).toBe(2);
  expect(result.state.currentTurn).toBe(1);
});

test('1手戻すと currentTurn が moves[currentHand-1].turn に正しく更新される', () => {
  let state = initSample();
  for (let i = 0; i < 4; i++) {
    state = applyStepForward(state, sampleGameLog.moves).state;
  }
  expect(state.currentTurn).toBe(2);

  // 1手戻す → currentHand=3, moves[2].turn=2
  const r1 = applyStepBackward(state, sampleGameLog.moves);
  expect(r1.state.currentHand).toBe(3);
  expect(r1.state.currentTurn).toBe(2);

  // もう1手戻す → currentHand=2, moves[1].turn=1
  const r2 = applyStepBackward(r1.state, sampleGameLog.moves);
  expect(r2.state.currentHand).toBe(2);
  expect(r2.state.currentTurn).toBe(1);
});

test('初期状態（currentHand=0）でさらに戻るとトーストが出る', () => {
  const state = initSample();
  const result = applyStepBackward(state, sampleGameLog.moves);
  expect(result.state.currentHand).toBe(0); // 変化なし
  expect(result.toast).toEqual(TOAST.FIRST_HAND);
});

test('全手進んでから全手戻すと初期状態に戻る', () => {
  let state = initSample();
  for (let i = 0; i < 6; i++) {
    state = applyStepForward(state, sampleGameLog.moves).state;
  }
  expect(state.currentHand).toBe(6);

  for (let i = 0; i < 6; i++) {
    state = applyStepBackward(state, sampleGameLog.moves).state;
  }
  expect(state.currentHand).toBe(0);
  expect(state.currentTurn).toBe(0);
});

// ─── 境界値テスト ───────────────────────────────────

test('1手だけのログで1手進んでからさらに進むとトーストが出る', () => {
  const moves = singleMoveGameLog.moves;
  let state = createInitialReplayState(moves);

  const r1 = applyStepForward(state, moves);
  expect(r1.state.currentHand).toBe(1);
  expect(r1.state.currentTurn).toBe(1);

  const r2 = applyStepForward(r1.state, moves);
  expect(r2.state.currentHand).toBe(1); // 変化なし
  expect(r2.toast).toEqual(TOAST.LAST_HAND);
});

test('空movesのログで1手進もうとするとトーストが出る', () => {
  const moves = emptyMovesGameLog.moves;
  const state = createInitialReplayState(moves);
  const result = applyStepForward(state, moves);
  expect(result.state.currentHand).toBe(0);
  expect(result.toast).toEqual(TOAST.LAST_HAND);
});

// ─── findLastIndexOfTurn ヘルパーのテスト ────────────

test('findLastIndexOfTurn: turn=1 の最後のインデックスは 1', () => {
  expect(findLastIndexOfTurn(sampleGameLog.moves, 1)).toBe(1);
});

test('findLastIndexOfTurn: turn=3 の最後のインデックスは 4（1手のみ）', () => {
  expect(findLastIndexOfTurn(sampleGameLog.moves, 3)).toBe(4);
});

test('findLastIndexOfTurn: 存在しないturnは -1 を返す', () => {
  expect(findLastIndexOfTurn(sampleGameLog.moves, 99)).toBe(-1);
});

// ─── 1ターン進むの補足テスト ────────────────────────

test('1ターン進むと turn=1 の全手（2手）が適用済みになる', () => {
  const state = initSample();
  const result = applyTurnForward(state, sampleGameLog.moves);
  expect(result.state.currentTurn).toBe(1);
  expect(result.state.currentHand).toBe(2);
});

test('2ターン連続で進むと turn=2 の最後の手まで進む', () => {
  let state = initSample();
  state = applyTurnForward(state, sampleGameLog.moves).state;
  state = applyTurnForward(state, sampleGameLog.moves).state;
  expect(state.currentTurn).toBe(2);
  expect(state.currentHand).toBe(4);
});

test('パス後の1手ターン（turn=3）で正しく1手分だけ進む', () => {
  let state = initSample();
  // turn=1,2 まで進める
  state = applyTurnForward(state, sampleGameLog.moves).state;
  state = applyTurnForward(state, sampleGameLog.moves).state;
  expect(state.currentHand).toBe(4);

  // turn=3 へ（P1のみ1手）
  state = applyTurnForward(state, sampleGameLog.moves).state;
  expect(state.currentTurn).toBe(3);
  expect(state.currentHand).toBe(5);
});

test('全ターン進めると lastTurn/lastHand に到達する', () => {
  let state = initSample();
  for (let i = 0; i < 4; i++) {
    state = applyTurnForward(state, sampleGameLog.moves).state;
  }
  expect(state.currentTurn).toBe(4);
  expect(state.currentHand).toBe(6);
});

test('最後のターンでさらに進むとトーストが出る', () => {
  let state = initSample();
  for (let i = 0; i < 4; i++) {
    state = applyTurnForward(state, sampleGameLog.moves).state;
  }
  const result = applyTurnForward(state, sampleGameLog.moves);
  expect(result.state.currentTurn).toBe(4);
  expect(result.toast).toEqual(TOAST.LAST_TURN);
});

// ─── 1ターン戻すの補足テスト ────────────────────────

test('turn=2 から1ターン戻すと turn=1 の最後の手に戻る', () => {
  let state = initSample();
  state = applyTurnForward(state, sampleGameLog.moves).state;
  state = applyTurnForward(state, sampleGameLog.moves).state;
  expect(state.currentTurn).toBe(2);

  const result = applyTurnBackward(state, sampleGameLog.moves);
  expect(result.state.currentTurn).toBe(1);
  expect(result.state.currentHand).toBe(2);
});

test('turn=1 から1ターン戻すと初期状態（turn=0, hand=0）に戻る', () => {
  let state = initSample();
  state = applyTurnForward(state, sampleGameLog.moves).state;
  expect(state.currentTurn).toBe(1);

  const result = applyTurnBackward(state, sampleGameLog.moves);
  expect(result.state.currentTurn).toBe(0);
  expect(result.state.currentHand).toBe(0);
});

test('初期状態でさらにターンを戻そうとするとトーストが出る', () => {
  const state = initSample();
  const result = applyTurnBackward(state, sampleGameLog.moves);
  expect(result.state.currentTurn).toBe(0);
  expect(result.toast).toEqual(TOAST.FIRST_TURN);
});

test('全ターン進んでから全ターン戻すと初期状態に戻る', () => {
  let state = initSample();
  for (let i = 0; i < 4; i++) {
    state = applyTurnForward(state, sampleGameLog.moves).state;
  }
  expect(state.currentTurn).toBe(4);
  expect(state.currentHand).toBe(6);

  for (let i = 0; i < 4; i++) {
    state = applyTurnBackward(state, sampleGameLog.moves).state;
  }
  expect(state.currentTurn).toBe(0);
  expect(state.currentHand).toBe(0);
});

// ─── 手操作とターン操作の混合テスト ─────────────────

test('1手進んだ後に1ターン進むと、次のターンの最後の手まで進む', () => {
  let state = initSample();
  // 1手進む → hand=1, turn=1
  state = applyStepForward(state, sampleGameLog.moves).state;
  expect(state.currentHand).toBe(1);
  expect(state.currentTurn).toBe(1);

  // 1ターン進む → turn=2 の最後 → hand=4
  state = applyTurnForward(state, sampleGameLog.moves).state;
  expect(state.currentTurn).toBe(2);
  expect(state.currentHand).toBe(4);
});

test('空movesのログで1ターン進もうとするとトーストが出る', () => {
  const moves = emptyMovesGameLog.moves;
  const state = createInitialReplayState(moves);
  const result = applyTurnForward(state, moves);
  expect(result.state.currentTurn).toBe(0);
  expect(result.toast).toEqual(TOAST.LAST_TURN);
});

// ─── 最初に戻るの補足テスト ─────────────────────────

test('初期状態から最初へ戻しても状態は変わらない', () => {
  const state = initSample();
  const result = applyJumpToFirst(state);
  expect(result.state.currentHand).toBe(0);
  expect(result.state.currentTurn).toBe(0);
});

test('最後まで進んでから最初へ戻ると初期状態になる', () => {
  const state = initSample();
  const r1 = applyJumpToLast(state);
  expect(r1.state.currentHand).toBe(6);

  const r2 = applyJumpToFirst(r1.state);
  expect(r2.state.currentHand).toBe(0);
  expect(r2.state.currentTurn).toBe(0);
  // lastHand/lastTurn は保持される
  expect(r2.state.lastHand).toBe(6);
  expect(r2.state.lastTurn).toBe(4);
});

// ─── 最後に進むの補足テスト ─────────────────────────

test('最後に進むと currentHand=lastHand, currentTurn=lastTurn になる', () => {
  const state = initSample();
  const result = applyJumpToLast(state);
  expect(result.state.currentHand).toBe(6);
  expect(result.state.currentTurn).toBe(4);
});

test('途中から最後に進んでも同じ結果になる', () => {
  let state = initSample();
  state = applyStepForward(state, sampleGameLog.moves).state;
  state = applyStepForward(state, sampleGameLog.moves).state;
  expect(state.currentHand).toBe(2);

  const result = applyJumpToLast(state);
  expect(result.state.currentHand).toBe(6);
  expect(result.state.currentTurn).toBe(4);
});

test('空movesのログで最後に進んでも hand=0, turn=0 のまま', () => {
  const state = createInitialReplayState(emptyMovesGameLog.moves);
  const result = applyJumpToLast(state);
  expect(result.state.currentHand).toBe(0);
  expect(result.state.currentTurn).toBe(0);
});

test('1手だけのログで最後に進むと hand=1, turn=1 になる', () => {
  const state = createInitialReplayState(singleMoveGameLog.moves);
  const result = applyJumpToLast(state);
  expect(result.state.currentHand).toBe(1);
  expect(result.state.currentTurn).toBe(1);
});

// ─── ジャンプ操作と他操作の混合テスト ────────────────

test('最後に進んでから1手戻すと最後の1手前になる', () => {
  const state = initSample();
  const r1 = applyJumpToLast(state);
  const r2 = applyStepBackward(r1.state, sampleGameLog.moves);
  expect(r2.state.currentHand).toBe(5);
  expect(r2.state.currentTurn).toBe(3);
});

test('最初に戻してから1手進むと hand=1 になる', () => {
  let state = initSample();
  state = applyJumpToLast(state).state;
  state = applyJumpToFirst(state).state;
  expect(state.currentHand).toBe(0);

  const result = applyStepForward(state, sampleGameLog.moves);
  expect(result.state.currentHand).toBe(1);
  expect(result.state.currentTurn).toBe(1);
});
