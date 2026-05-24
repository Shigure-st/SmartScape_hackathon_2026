import { validateLogData } from '../../renderer/utils/logValidator';

// ─── テスト用の正常なベースデータ ─────────────────────
// 各テストではこれを元に一部を壊して異常系を作る

/** 正常: 通常の試合（パス後の片方続行を含む） */
const validGameLog = {
  players: [
    { id: 'P1', name: 'ss_tarou' },
    { id: 'P2', name: 'ss_jirou' },
  ],
  moves: [
    { turn: 1, player: 'P1', piece: 'F', rotation_flip: 0, pos: ['1', '1'] },
    { turn: 1, player: 'P2', piece: 'I', rotation_flip: 0, pos: ['A', 'A'] },
    { turn: 2, player: 'P1', piece: 'L', rotation_flip: 1, pos: ['2', '1'] },
    { turn: 2, player: 'P2', action: 'pass' },
    { turn: 3, player: 'P1', piece: 'T', rotation_flip: 0, pos: ['4', '1'] },
    { turn: 4, player: 'P1', piece: 'I', rotation_flip: 2, pos: ['6', '1'] },
    { turn: 5, player: 'P1', action: 'pass' },
  ],
  end: {
    reason: 'normal',
    winner: 'P1',
    score: { P1: 50, P2: 30 },
  },
};

/** 正常: 最小構成（1ターン2手のみ） */
const minimalValidLog = {
  players: [
    { id: 'P1', name: 'ss_tarou' },
    { id: 'P2', name: 'ss_jirou' },
  ],
  moves: [
    { turn: 1, player: 'P1', piece: 'A', rotation_flip: 0, pos: ['1', '1'] },
    { turn: 1, player: 'P2', piece: 'B', rotation_flip: 0, pos: ['2', '2'] },
  ],
  end: { reason: 'normal', winner: 'P1', score: { P1: 10, P2: 5 } },
};

/** 正常: 1手のみ（1ターン1手） */
const singleMoveLog = {
  players: [
    { id: 'P1', name: 'ss_tarou' },
    { id: 'P2', name: 'ss_jirou' },
  ],
  moves: [
    { turn: 1, player: 'P1', piece: 'A', rotation_flip: 0, pos: ['1', '1'] },
  ],
  end: { reason: 'resign', winner: 'P2', score: { P1: 0, P2: 0 } },
};

/** 正常: movesが空 */
const emptyMovesLog = {
  players: [
    { id: 'P1', name: 'ss_tarou' },
    { id: 'P2', name: 'ss_jirou' },
  ],
  moves: [],
  end: { reason: 'resign', winner: 'P2', score: { P1: 0, P2: 0 } },
};

// =============================================================
// テスト表記載テスト
// =============================================================

// ─── players バリデーション ──────────────────────────

describe('C001: players バリデーション', () => {
  // C001: players要素存在確認
  test('C001-1: playersが存在しない場合はinvalid', () => {
    const data = {
      moves: [],
      end: { reason: 'normal', winner: 'P1', score: { P1: 0, P2: 0 } },
    };
    const result = validateLogData(data);
    expect(result.valid).toBe(false);
  });

  test('C001-2: playersが1名だけの場合はinvalid', () => {
    const data = {
      players: [{ id: 'P1', name: 'ss_tarou' }],
      moves: [],
      end: { reason: 'normal', winner: 'P1', score: { P1: 0 } },
    };
    const result = validateLogData(data);
    expect(result.valid).toBe(false);
  });

  test('C001-3: playerのidが空文字の場合はinvalid', () => {
    const data = {
      players: [
        { id: '', name: 'ss_tarou' },
        { id: 'P2', name: 'ss_jirou' },
      ],
      moves: [],
      end: { reason: 'normal', winner: 'P2', score: { '': 0, P2: 0 } },
    };
    const result = validateLogData(data);
    expect(result.valid).toBe(false);
  });

  test('C001-4: playerのidが文字列ではない場合はinvalid', () => {
    const data = {
      players: [
        { id: 1, name: 'ss_tarou' },
        { id: 2, name: 'ss_jirou' },
      ],
      moves: [],
      end: { reason: 'normal', winner: 'P2', score: { '': 0, P2: 0 } },
    };
    const result = validateLogData(data);
    expect(result.valid).toBe(false);
  });

  test('C001-5: playerのnameが空文字の場合はinvalid', () => {
    const data = {
      players: [
        { id: 'P1', name: '' },
        { id: 'P2', name: 'ss_jirou' },
      ],
      moves: [],
      end: { reason: 'normal', winner: 'P1', score: { P1: 0, P2: 0 } },
    };
    const result = validateLogData(data);
    expect(result.valid).toBe(false);
  });

  test('C001-6: playerのnameが文字列ではない場合はinvalid', () => {
    const data = {
      players: [
        { id: 'P1', name: 'ss_tarou' },
        { id: 'P2', name: 12345 },
      ],
      moves: [],
      end: { reason: 'normal', winner: 'P1', score: { P1: 0, P2: 0 } },
    };
    const result = validateLogData(data);
    expect(result.valid).toBe(false);
  });
});

// ─── moves バリデーション ────────────────────────────

describe('C002: moves バリデーション', () => {
  // C002: moves要素存在確認
  test('C002-1: movesが存在しない場合はinvalid', () => {
    const data = {
      players: [
        { id: 'P1', name: 'ss_tarou' },
        { id: 'P2', name: 'ss_jirou' },
      ],
      end: { reason: 'normal', winner: 'P1', score: { P1: 0, P2: 0 } },
    };
    const result = validateLogData(data);
    expect(result.valid).toBe(false);
  });

  test('C002-2: movesが空のデータはvalid', () => {
    const result = validateLogData(emptyMovesLog);
    expect(result.valid).toBe(true);
  });

  test('C002-3: 1手だけのデータはvalid', () => {
    const result = validateLogData(singleMoveLog);
    expect(result.valid).toBe(true);
  });
});

// ─── moves.turn バリデーション ────────────────────────────

describe('C003: moves.turn バリデーション', () => {
  // C003: turn連続性チェック
  test('C003-1: turnが連続でない場合はinvalid', () => {
    const data = {
      players: [
        { id: 'P1', name: 'ss_tarou' },
        { id: 'P2', name: 'ss_jirou' },
      ],
      moves: [
        {
          turn: 1,
          player: 'P1',
          piece: 'A',
          rotation_flip: 0,
          pos: ['1', '1'],
        },
        {
          turn: 1,
          player: 'P2',
          piece: 'B',
          rotation_flip: 0,
          pos: ['2', '2'],
        },
        {
          turn: 3,
          player: 'P1',
          piece: 'C',
          rotation_flip: 0,
          pos: ['3', '3'],
        },
      ],
      end: { reason: 'normal', winner: 'P1', score: { P1: 0, P2: 0 } },
    };
    const result = validateLogData(data);
    expect(result.valid).toBe(false);
  });

  test('C003-2: turnが1から始まらない場合はinvalid', () => {
    const data = {
      players: [
        { id: 'P1', name: 'ss_tarou' },
        { id: 'P2', name: 'ss_jirou' },
      ],
      moves: [
        {
          turn: 2,
          player: 'P1',
          piece: 'A',
          rotation_flip: 0,
          pos: ['1', '1'],
        },
      ],
      end: { reason: 'normal', winner: 'P1', score: { P1: 0, P2: 0 } },
    };
    const result = validateLogData(data);
    expect(result.valid).toBe(false);
  });

  test('C003-3: turnが昇順でない（逆戻り）場合はinvalid', () => {
    const data = {
      players: [
        { id: 'P1', name: 'ss_tarou' },
        { id: 'P2', name: 'ss_jirou' },
      ],
      moves: [
        {
          turn: 1,
          player: 'P1',
          piece: 'A',
          rotation_flip: 0,
          pos: ['1', '1'],
        },
        {
          turn: 1,
          player: 'P2',
          piece: 'B',
          rotation_flip: 0,
          pos: ['2', '2'],
        },
        {
          turn: 2,
          player: 'P1',
          piece: 'C',
          rotation_flip: 0,
          pos: ['3', '3'],
        },
        {
          turn: 1,
          player: 'P2',
          piece: 'D',
          rotation_flip: 0,
          pos: ['4', '4'],
        }, // 逆戻り
      ],
      end: { reason: 'normal', winner: 'P1', score: { P1: 0, P2: 0 } },
    };
    const result = validateLogData(data);
    expect(result.valid).toBe(false);
  });

  test('C003-4: turnが0の場合はinvalid', () => {
    const data = {
      players: [
        { id: 'P1', name: 'ss_tarou' },
        { id: 'P2', name: 'ss_jirou' },
      ],
      moves: [
        {
          turn: 0,
          player: 'P1',
          piece: 'A',
          rotation_flip: 0,
          pos: ['1', '1'],
        },
      ],
      end: { reason: 'normal', winner: 'P1', score: { P1: 0, P2: 0 } },
    };
    const result = validateLogData(data);
    expect(result.valid).toBe(false);
  });

  test('C003-5: turnが負の数の場合はinvalid', () => {
    const data = {
      players: [
        { id: 'P1', name: 'ss_tarou' },
        { id: 'P2', name: 'ss_jirou' },
      ],
      moves: [
        {
          turn: -1,
          player: 'P1',
          piece: 'A',
          rotation_flip: 0,
          pos: ['1', '1'],
        },
      ],
      end: { reason: 'normal', winner: 'P1', score: { P1: 0, P2: 0 } },
    };
    const result = validateLogData(data);
    expect(result.valid).toBe(false);
  });

  test('C003-6: turnが小数の場合はinvalid', () => {
    const data = {
      players: [
        { id: 'P1', name: 'ss_tarou' },
        { id: 'P2', name: 'ss_jirou' },
      ],
      moves: [
        {
          turn: 1.5,
          player: 'P1',
          piece: 'A',
          rotation_flip: 0,
          pos: ['1', '1'],
        },
      ],
      end: { reason: 'normal', winner: 'P1', score: { P1: 0, P2: 0 } },
    };
    const result = validateLogData(data);
    expect(result.valid).toBe(false);
  });

  test('C003-7: turnが数値でない場合はinvalid', () => {
    const data = {
      players: [
        { id: 'P1', name: 'ss_tarou' },
        { id: 'P2', name: 'ss_jirou' },
      ],
      moves: [
        {
          turn: '1',
          player: 'P1',
          piece: 'A',
          rotation_flip: 0,
          pos: ['1', '1'],
        },
      ], // turnが文字列
      end: { reason: 'normal', winner: 'P1', score: { P1: 0, P2: 0 } },
    };
    const result = validateLogData(data);
    expect(result.valid).toBe(false);
  });

  test('C003-8: 同一turnに3つ以上のmoveがある場合はinvalid', () => {
    const data = {
      players: [
        { id: 'P1', name: 'ss_tarou' },
        { id: 'P2', name: 'ss_jirou' },
      ],
      moves: [
        {
          turn: 1,
          player: 'P1',
          piece: 'A',
          rotation_flip: 0,
          pos: ['1', '1'],
        },
        {
          turn: 1,
          player: 'P2',
          piece: 'B',
          rotation_flip: 0,
          pos: ['2', '2'],
        },
        {
          turn: 1,
          player: 'P1',
          piece: 'C',
          rotation_flip: 0,
          pos: ['3', '3'],
        }, // 3つ目
      ],
      end: { reason: 'normal', winner: 'P1', score: { P1: 0, P2: 0 } },
    };
    const result = validateLogData(data);
    expect(result.valid).toBe(false);
  });

  test('C003-9: 同一turnに同一playerが複数存在する場合はinvalid', () => {
    const data = {
      players: [
        { id: 'P1', name: 'ss_tarou' },
        { id: 'P2', name: 'ss_jirou' },
      ],
      moves: [
        {
          turn: 1,
          player: 'P1',
          piece: 'A',
          rotation_flip: 0,
          pos: ['1', '1'],
        },
        {
          turn: 1,
          player: 'P1',
          piece: 'B',
          rotation_flip: 0,
          pos: ['2', '2'],
        }, // P1が2回
      ],
      end: { reason: 'normal', winner: 'P1', score: { P1: 0, P2: 0 } },
    };
    const result = validateLogData(data);
    expect(result.valid).toBe(false);
  });

  test('C003-10: 同一turnに2人のmoveがある最小構成はvalid', () => {
    const result = validateLogData(minimalValidLog);
    expect(result.valid).toBe(true);
  });
});

// ─── moves.piece / action / pos バリデーション ───────────────────

describe('C004: moves.action, moves.piece, moves.pos バリデーション', () => {
  // C004: actionとpiece排他チェック
  test('C004-1: pieceとactionが同時に存在する場合はinvalid', () => {
    const data = {
      players: [
        { id: 'P1', name: 'ss_tarou' },
        { id: 'P2', name: 'ss_jirou' },
      ],
      moves: [
        {
          turn: 1,
          player: 'P1',
          piece: 'A',
          rotation_flip: 0,
          pos: ['1', '1'],
          action: 'pass',
        },
      ],
      end: { reason: 'normal', winner: 'P1', score: { P1: 0, P2: 0 } },
    };
    const result = validateLogData(data);
    expect(result.valid).toBe(false);
  });

  test('C004-2: pieceもactionもない場合はinvalid', () => {
    const data = {
      players: [
        { id: 'P1', name: 'ss_tarou' },
        { id: 'P2', name: 'ss_jirou' },
      ],
      moves: [
        { turn: 1, player: 'P1' }, // pieceもactionもない
      ],
      end: { reason: 'normal', winner: 'P1', score: { P1: 0, P2: 0 } },
    };
    const result = validateLogData(data);
    expect(result.valid).toBe(false);
  });

  test('C004-3: pieceが空文字の場合はinvalid', () => {
    const data = {
      players: [
        { id: 'P1', name: 'ss_tarou' },
        { id: 'P2', name: 'ss_jirou' },
      ],
      moves: [
        { turn: 1, player: 'P1', piece: '', rotation_flip: 0, pos: ['1', '1'] },
      ],
      end: { reason: 'normal', winner: 'P1', score: { P1: 0, P2: 0 } },
    };
    const result = validateLogData(data);
    expect(result.valid).toBe(false);
  });

  test('C004-4: pieceがあるのにposがない場合はinvalid', () => {
    const data = {
      players: [
        { id: 'P1', name: 'ss_tarou' },
        { id: 'P2', name: 'ss_jirou' },
      ],
      moves: [
        { turn: 1, player: 'P1', piece: 'A', rotation_flip: 0 }, // posがない
      ],
      end: { reason: 'normal', winner: 'P1', score: { P1: 0, P2: 0 } },
    };
    const result = validateLogData(data);
    expect(result.valid).toBe(false);
  });

  test('C004-5: pieceがあるのにrotation_flipがない場合はinvalid', () => {
    const data = {
      players: [
        { id: 'P1', name: 'ss_tarou' },
        { id: 'P2', name: 'ss_jirou' },
      ],
      moves: [
        { turn: 1, player: 'P1', piece: 'A', pos: ['1', '1'] }, // rotation_flipがない
      ],
      end: { reason: 'normal', winner: 'P1', score: { P1: 0, P2: 0 } },
    };
    const result = validateLogData(data);
    expect(result.valid).toBe(false);
  });

  test('C004-6: posの要素数が2でない場合はinvalid', () => {
    const data = {
      players: [
        { id: 'P1', name: 'ss_tarou' },
        { id: 'P2', name: 'ss_jirou' },
      ],
      moves: [
        { turn: 1, player: 'P1', piece: 'A', rotation_flip: 0, pos: ['0'] }, // 要素が1つ
      ],
      end: { reason: 'normal', winner: 'P1', score: { P1: 0, P2: 0 } },
    };
    const result = validateLogData(data);
    expect(result.valid).toBe(false);
  });

  // 値の型エラー
  test('C004-7: pieceが文字列でない場合はinvalid', () => {
    const data = {
      players: [
        { id: 'P1', name: 'ss_tarou' },
        { id: 'P2', name: 'ss_jirou' },
      ],
      moves: [
        { turn: 1, player: 'P1', piece: 0, rotation_flip: 0, pos: ['A', 'A'] }, // pieceが数値
      ],
      end: { reason: 'normal', winner: 'P1', score: { P1: 0, P2: 0 } },
    };
    const result = validateLogData(data);
    expect(result.valid).toBe(false);
  });

  test('C004-8: rotation_flipが数値でない場合はinvalid', () => {
    const data = {
      players: [
        { id: 'P1', name: 'ss_tarou' },
        { id: 'P2', name: 'ss_jirou' },
      ],
      moves: [
        { turn: 1, player: 'P1', piece: 0, rotation_flip: 0, pos: ['A', 'A'] }, // rotation_flipが数値
      ],
      end: { reason: 'normal', winner: 'P1', score: { P1: 0, P2: 0 } },
    };
    const result = validateLogData(data);
    expect(result.valid).toBe(false);
  });

  test('C004-9: posが文字列でない場合はinvalid', () => {
    const data = {
      players: [
        { id: 'P1', name: 'ss_tarou' },
        { id: 'P2', name: 'ss_jirou' },
      ],
      moves: [
        {
          turn: 1,
          player: 'P1',
          piece: 'A',
          rotation_flip: '0',
          pos: ['A', 'A'],
        }, // posが文字列
      ],
      end: { reason: 'normal', winner: 'P1', score: { P1: 0, P2: 0 } },
    };
    const result = validateLogData(data);
    expect(result.valid).toBe(false);
  });

  // 値の範囲エラー
  test('C004-10: pieceがA~Uでない場合はinvalid', () => {
    const data = {
      players: [
        { id: 'P1', name: 'ss_tarou' },
        { id: 'P2', name: 'ss_jirou' },
      ],
      moves: [
        {
          turn: 1,
          player: 'P1',
          piece: 'V',
          rotation_flip: 0,
          pos: ['A', 'A'],
        }, // pieceがV
      ],
      end: { reason: 'normal', winner: 'P1', score: { P1: 0, P2: 0 } },
    };
    const result = validateLogData(data);
    expect(result.valid).toBe(false);
  });

  test('C004-11: rotation_flipが0~7より小さい場合はinvalid', () => {
    const data = {
      players: [
        { id: 'P1', name: 'ss_tarou' },
        { id: 'P2', name: 'ss_jirou' },
      ],
      moves: [
        {
          turn: 1,
          player: 'P1',
          piece: 'A',
          rotation_flip: -1,
          pos: ['A', 'A'],
        }, // rotation_flipが負数
      ],
      end: { reason: 'normal', winner: 'P1', score: { P1: 0, P2: 0 } },
    };
    const result = validateLogData(data);
    expect(result.valid).toBe(false);
  });

  test('C004-12: rotation_flipが0~7より大きい場合はinvalid', () => {
    const data = {
      players: [
        { id: 'P1', name: 'ss_tarou' },
        { id: 'P2', name: 'ss_jirou' },
      ],
      moves: [
        {
          turn: 1,
          player: 'P1',
          piece: 'A',
          rotation_flip: 8,
          pos: ['A', 'A'],
        }, // rotation_flipが0~7より大きい
      ],
      end: { reason: 'normal', winner: 'P1', score: { P1: 0, P2: 0 } },
    };
    const result = validateLogData(data);
    expect(result.valid).toBe(false);
  });

  test('C004-13: posが1~Eでない場合はinvalid', () => {
    const data = {
      players: [
        { id: 'P1', name: 'ss_tarou' },
        { id: 'P2', name: 'ss_jirou' },
      ],
      moves: [
        {
          turn: 1,
          player: 'P1',
          piece: 'A',
          rotation_flip: 4,
          pos: ['F', 'F'],
        }, // posが(F, F)
      ],
      end: { reason: 'normal', winner: 'P1', score: { P1: 0, P2: 0 } },
    };
    const result = validateLogData(data);
    expect(result.valid).toBe(false);
  });
});

// ─── moves.player バリデーション ───────────────────

describe('C005: moves.player バリデーション', () => {
  // C005: player一致チェック
  test('C005-1: move.playerがplayers.idと一致しない場合はinvalid', () => {
    const data = {
      players: [
        { id: 'P1', name: 'ss_tarou' },
        { id: 'P2', name: 'ss_jirou' },
      ],
      moves: [
        {
          turn: 1,
          player: 'P3',
          piece: 'A',
          rotation_flip: 0,
          pos: ['1', '1'],
        }, // P3は存在しない
      ],
      end: { reason: 'normal', winner: 'P1', score: { P1: 0, P2: 0 } },
    };
    const result = validateLogData(data);
    expect(result.valid).toBe(false);
  });

  test('C005-2: パス後に片方プレイヤーだけ続行するデータはvalid', () => {
    const result = validateLogData(validGameLog);
    expect(result.valid).toBe(true);
  });

  // 型エラー
  test('C005-3: playerが文字列ではない場合はinvalid', () => {
    const data = {
      players: [
        { id: 'P1', name: 'ss_tarou' },
        { id: 'P2', name: 'ss_jirou' },
      ],
      moves: [{ turn: 1, player: 1, piece: 'A', rotation_flip: 0, pos: ['A'] }],
      end: { reason: 'normal', winner: 'P1', score: { P1: 0, P2: 0 } },
    };
    const result = validateLogData(data);
    expect(result.valid).toBe(false);
  });
});

// =============================================================
// 追加テスト（テスト表外）
// =============================================================

// ─── ルート構造 ─────────────────────────────────────
describe('JSONのルート構造 バリデーション', () => {
  test('ルートがnullの場合はinvalid', () => {
    const result = validateLogData(null);
    expect(result.valid).toBe(false);
  });

  test('ルートが文字列の場合はinvalid', () => {
    const result = validateLogData('not an object');
    expect(result.valid).toBe(false);
  });

  test('ルートが配列の場合はinvalid', () => {
    const result = validateLogData([1, 2, 3]);
    expect(result.valid).toBe(false);
  });
});

// ─── end バリデーション ─────────────────────────────

describe('end バリデーション', () => {
  test('endが存在しない場合はinvalid', () => {
    const data = {
      players: [
        { id: 'P1', name: 'ss_tarou' },
        { id: 'P2', name: 'ss_jirou' },
      ],
      moves: [],
    };
    const result = validateLogData(data);
    expect(result.valid).toBe(false);
  });

  test('end.reasonがない場合はinvalid', () => {
    const data = {
      ...minimalValidLog,
      end: { winner: 'P1', score: { P1: 0, P2: 0 } },
    };
    const result = validateLogData(data);
    expect(result.valid).toBe(false);
  });

  test('end.winnerがない場合はinvalid', () => {
    const data = {
      ...minimalValidLog,
      end: { reason: 'normal', score: { P1: 0, P2: 0 } },
    };
    const result = validateLogData(data);
    expect(result.valid).toBe(false);
  });

  test('end.scoreがない場合はinvalid', () => {
    const data = {
      ...minimalValidLog,
      end: { reason: 'normal', winner: 'P1' },
    };
    const result = validateLogData(data);
    expect(result.valid).toBe(false);
  });

  test('end.reasonがNULLである場合はinvalid', () => {
    const data = {
      ...minimalValidLog,
      end: { reason: null, winner: 'P1', score: { P1: 0, P2: 0 } },
    };
    const result = validateLogData(data);
    expect(result.valid).toBe(false);
  });

  test('end.winnerがNULLである場合はinvalid', () => {
    const data = {
      ...minimalValidLog,
      end: { reason: 'normal', winner: null, score: { P1: 0, P2: 0 } },
    };
    const result = validateLogData(data);
    expect(result.valid).toBe(false);
  });

  test('end.scoreがNULLである場合はinvalid', () => {
    const data = {
      ...minimalValidLog,
      end: { reason: 'normal', winner: 'P1', score: null },
    };
    const result = validateLogData(data);
    expect(result.valid).toBe(false);
  });

  test('end.reasonが空文字の場合はinvalid', () => {
    const data = {
      ...minimalValidLog,
      end: { reason: '', winner: 'P1', score: { P1: 0, P2: 0 } },
    };
    const result = validateLogData(data);
    expect(result.valid).toBe(false);
  });

  test('end.winnerがplayers.idにもdrawにも一致しない場合はinvalid', () => {
    const data = {
      ...minimalValidLog,
      end: { reason: 'normal', winner: 'P3', score: { P1: 0, P2: 0 } },
    };
    const result = validateLogData(data);
    expect(result.valid).toBe(false);
  });

  test('end.scoreが存在しない場合はinvalid', () => {
    const data = {
      ...minimalValidLog,
      end: { reason: 'normal', winner: 'P1' },
    };
    const result = validateLogData(data);
    expect(result.valid).toBe(false);
  });

  test('end.scoreにプレイヤーのスコアが欠けている場合はinvalid', () => {
    const data = {
      ...minimalValidLog,
      end: { reason: 'normal', winner: 'P1', score: { P1: 10 } }, // P2がない
    };
    const result = validateLogData(data);
    expect(result.valid).toBe(false);
  });

  test('end.scoreの値が数値でない場合はinvalid', () => {
    const data = {
      ...minimalValidLog,
      end: { reason: 'normal', winner: 'P1', score: { P1: 'ten', P2: 5 } },
    };
    const result = validateLogData(data);
    expect(result.valid).toBe(false);
  });

  test('end.winnerが "draw" のデータはvalid', () => {
    const data = {
      ...minimalValidLog,
      end: { reason: 'normal', winner: 'draw', score: { P1: 30, P2: 30 } },
    };
    const result = validateLogData(data);
    expect(result.valid).toBe(true);
  });

  // 値の範囲エラー
  test('end.winnerがplayer.idかdraw以外のデータはinvalid', () => {
    const data = {
      ...minimalValidLog,
      end: { reason: 'normal', winner: 'unknown', score: { P1: 30, P2: 30 } },
    };
    const result = validateLogData(data);
    expect(result.valid).toBe(false);
  });

  test('end.reasonがnormal/resign以外のデータはinvalid', () => {
    const data = {
      ...minimalValidLog,
      end: { reason: 'unknown', winner: 'draw', score: { P1: 30, P2: 30 } },
    };
    const result = validateLogData(data);
    expect(result.valid).toBe(false);
  });
});
