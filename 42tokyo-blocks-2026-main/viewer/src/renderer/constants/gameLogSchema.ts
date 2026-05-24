// ─── ログ形式定義 ───────────────────────────────────────

export interface Player {
  id: string;
  name: string;
}

export interface Move {
  turn: number;
  player: string;
  piece?: string;
  rotation_flip?: number;
  pos?: [string, string];
  action?: string;
}

export interface EndInfo {
  reason: string;
  winner: string;
  score: Record<string, number>;
}

export interface GameLog {
  players: Player[];
  moves: Move[];
  end: EndInfo;
}

// ─── 終了理由定数 ─────────────────────────────
export const END_REASONS = ['normal', 'resign'];
