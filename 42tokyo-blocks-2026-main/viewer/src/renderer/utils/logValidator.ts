import { PIECE_MAPS } from '../constants/pieceData';
import { VALID_POS_VALUES } from '../constants/boardData';
import { Player, GameLog, END_REASONS } from '../constants/gameLogSchema';

// ─── エラーメッセージ定数 ─────────────────────────────

export const VALIDATION_ERRORS = {
  ROOT_NOT_OBJECT: 'JSONのルートがオブジェクトではありません',
  PLAYERS_MISSING: 'players が存在しないか配列ではありません',
  MOVES_MISSING: 'moves が存在しないか配列ではありません',
  END_MISSING: 'end が存在しないかオブジェクトではありません',
  PLAYERS_MIN: 'players は2名のみ有効です',
  PLAYER_ID_INVALID: 'players の id が不正です',
  PLAYER_NAME_INVALID: 'players の name が不正です',
  TURN_INVALID: (turn: unknown) => `moves の turn が不正です: ${turn}`,
  TURN_MUST_START_AT_1: (turn: number) =>
    `turn は1から始まる必要があります: ${turn}`,
  TURN_NOT_ASCENDING: (index: number, turn: number) =>
    `moves[${index}]: turn が昇順ではありません: ${turn}`,
  TURN_HAS_GAP: (index: number, turn: number, prev: number) =>
    `moves[${index}]: turn に欠番があります（${prev} → ${turn}）`,
  TURN_TOO_MANY_MOVES: (turn: number) =>
    `turn ${turn}: 同一ターンに3つ以上のmoveがあります`,
  TURN_DUPLICATE_PLAYER: (turn: number, player: string) =>
    `turn ${turn}: 同一ターンにプレイヤー ${player} が複数存在します`,
  PLAYER_NOT_FOUND: (player: string) =>
    `moves の player が players に存在しません: ${player}`,
  PIECE_OR_ACTION_REQUIRED: (turn: number, index: number) =>
    `moves[${index}] (turn ${turn}): piece か action のどちらかが必要です`,
  PIECE_AND_ACTION_EXCLUSIVE: (turn: number, index: number) =>
    `moves[${index}] (turn ${turn}): piece と action は同時に存在できません`,
  PIECE_INVALID: (turn: number, index: number) =>
    `moves[${index}] (turn ${turn}): piece が不正です`,
  POS_INVALID: (turn: number, index: number) =>
    `moves[${index}] (turn ${turn}): pos が不正です`,
  ROTATION_FLIP_INVALID: (turn: number, index: number) =>
    `moves[${index}] (turn ${turn}): rotation_flip が不正です`,
  END_REASON_INVALID: (reason: unknown) => `end.reason が不正です: ${reason}`,
  END_WINNER_INVALID: (winner: unknown) => `end.winner が不正です: ${winner}`,
  END_SCORE_INVALID: (score: unknown) => `end.score が不正です: ${score}`,
  END_SCORE_MISSING: (id: string) => `end.score に ${id} のスコアがありません`,
};

// ─── validateLogData ─────────────────────────────

export type ValidationResult =
  | { valid: true; data: GameLog }
  | { valid: false; error: string };

export function validateLogData(data: unknown): ValidationResult {
  // 1. オブジェクトかどうか(unknown型を扱う際には、型の確認必須)
  if (typeof data !== 'object' || data === null) {
    return { valid: false, error: VALIDATION_ERRORS.ROOT_NOT_OBJECT };
  }

  const d = data as Record<string, unknown>;

  // 2. players, moves, endキーの存在確認
  if (!Array.isArray(d.players)) {
    return { valid: false, error: VALIDATION_ERRORS.PLAYERS_MISSING };
  }
  if (!Array.isArray(d.moves)) {
    return { valid: false, error: VALIDATION_ERRORS.MOVES_MISSING };
  }
  if (typeof d.end !== 'object' || d.end === null) {
    return { valid: false, error: VALIDATION_ERRORS.END_MISSING };
  }

  // 3. players のバリデーション
  if (d.players.length != 2) {
    return { valid: false, error: VALIDATION_ERRORS.PLAYERS_MIN };
  }
  for (const p of d.players) {
    if (typeof p.id !== 'string' || p.id === '') {
      return { valid: false, error: VALIDATION_ERRORS.PLAYER_ID_INVALID };
    }
    if (typeof p.name !== 'string' || p.name === '') {
      return { valid: false, error: VALIDATION_ERRORS.PLAYER_NAME_INVALID };
    }
  }

  const playerIds = (d.players as Player[]).map((p) => p.id);

  // 4. moves のバリデーション
  // ターンごとのmove数・プレイヤー重複チェック用
  const turnMoveCounts = new Map<number, number>();
  const turnPlayerSets = new Map<number, Set<string>>();

  for (let i = 0; i < d.moves.length; i++) {
    const m = d.moves[i];

    // turn の型チェックを先に行う
    if (typeof m.turn !== 'number' || !Number.isInteger(m.turn) || m.turn < 1) {
      return { valid: false, error: VALIDATION_ERRORS.TURN_INVALID(m.turn) };
    }
    // turn が1から始まるか
    if (i === 0 && m.turn !== 1) {
      return {
        valid: false,
        error: VALIDATION_ERRORS.TURN_MUST_START_AT_1(m.turn),
      };
    }
    // turn が昇順か（前のmoveのturn以上であること）
    if (i > 0) {
      const prevTurn = d.moves[i - 1].turn;
      if (m.turn < prevTurn) {
        return {
          valid: false,
          error: VALIDATION_ERRORS.TURN_NOT_ASCENDING(i, m.turn),
        };
      }
      // 欠番チェック（前のturnから2以上増えていたら欠番）
      if (m.turn > prevTurn + 1) {
        return {
          valid: false,
          error: VALIDATION_ERRORS.TURN_HAS_GAP(i, m.turn, prevTurn),
        };
      }
    }
    // 同一turnのmove数チェック（最大2）
    const count = (turnMoveCounts.get(m.turn) ?? 0) + 1;
    if (count > 2) {
      return {
        valid: false,
        error: VALIDATION_ERRORS.TURN_TOO_MANY_MOVES(m.turn),
      };
    }
    turnMoveCounts.set(m.turn, count);
    // 同一turnに同一playerの重複チェック
    const playerSet = turnPlayerSets.get(m.turn) ?? new Set<string>();
    if (playerSet.has(m.player)) {
      return {
        valid: false,
        error: VALIDATION_ERRORS.TURN_DUPLICATE_PLAYER(m.turn, m.player),
      };
    }
    playerSet.add(m.player);
    turnPlayerSets.set(m.turn, playerSet);
    // player が players.id に存在するか
    if (!playerIds.includes(m.player)) {
      return {
        valid: false,
        error: VALIDATION_ERRORS.PLAYER_NOT_FOUND(m.player),
      };
    }
    // piece/pos/rotation_flip と action の排他チェック
    const hasPiece = m.piece !== undefined;
    const hasAction = m.action !== undefined;
    if (!hasPiece && !hasAction) {
      return {
        valid: false,
        error: VALIDATION_ERRORS.PIECE_OR_ACTION_REQUIRED(m.turn, i),
      };
    }
    if (hasPiece && hasAction) {
      return {
        valid: false,
        error: VALIDATION_ERRORS.PIECE_AND_ACTION_EXCLUSIVE(m.turn, i),
      };
    }
    // piece があるとき pos と rotation_flip も必須
    if (hasPiece) {
      if (typeof m.piece !== 'string' || m.piece === '') {
        return {
          valid: false,
          error: VALIDATION_ERRORS.PIECE_INVALID(m.turn, i),
        };
      }
      // ピースが定義済みかチェック
      if (!(m.piece in PIECE_MAPS)) {
        return {
          valid: false,
          error: VALIDATION_ERRORS.PIECE_INVALID(m.turn, i),
        };
      }
      if (
        !Array.isArray(m.pos) ||
        m.pos.length !== 2 ||
        typeof m.pos[0] !== 'string' ||
        typeof m.pos[1] !== 'string' ||
        !VALID_POS_VALUES.has(m.pos[0]) ||
        !VALID_POS_VALUES.has(m.pos[1])
      ) {
        return {
          valid: false,
          error: VALIDATION_ERRORS.POS_INVALID(m.turn, i),
        };
      }
      if (
        typeof m.rotation_flip !== 'number' ||
        !Number.isInteger(m.rotation_flip) ||
        m.rotation_flip < 0 ||
        m.rotation_flip > 7
      ) {
        return {
          valid: false,
          error: VALIDATION_ERRORS.ROTATION_FLIP_INVALID(m.turn, i),
        };
      }
    }
  }

  // 5. end のバリデーション
  const end = d.end as Record<string, unknown>;
  // end.resonのバリデーション
  if (
    typeof end.reason !== 'string' ||
    end.reason === '' ||
    !END_REASONS.includes(end.reason as string)
  ) {
    return {
      valid: false,
      error: VALIDATION_ERRORS.END_REASON_INVALID(end.reason),
    };
  }
  // end.winnerのバリデーション
  const validWinners = [...playerIds, 'draw'];
  if (
    typeof end.winner !== 'string' ||
    end.winner === '' ||
    !validWinners.includes(end.winner as string)
  ) {
    return {
      valid: false,
      error: VALIDATION_ERRORS.END_WINNER_INVALID(end.winner),
    };
  }
  // end.scoreのバリデーション
  if (typeof end.score !== 'object' || end.score === null) {
    return {
      valid: false,
      error: VALIDATION_ERRORS.END_SCORE_INVALID(end.score),
    };
  }
  for (const id of playerIds) {
    if (typeof (end.score as Record<string, unknown>)[id] !== 'number') {
      return { valid: false, error: VALIDATION_ERRORS.END_SCORE_MISSING(id) };
    }
  }

  return { valid: true, data: data as GameLog };
}
