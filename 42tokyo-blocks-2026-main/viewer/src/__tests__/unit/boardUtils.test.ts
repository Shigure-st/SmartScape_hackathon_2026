// src/__tests__/boardUtils.test.ts
import {
  rotateCCW,
  flipLR,
  getTransformedPieceMap,
  reconstructBoard,
  getRemainingPieces,
} from '../../renderer/utils/boardUtils';
import { Move } from '../../renderer/constants/gameLogSchema';

const ALL_PIECES = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
];

const COLS = [
  'col1',
  'col2',
  'col3',
  'col4',
  'col5',
  'col6',
  'col7',
  'col8',
  'col9',
  'col10',
  'col11',
  'col12',
  'col13',
  'col14',
];

// ─── テスト表に対応するテスト ─────────────────────

describe('B005: 初期盤面表示', () => {
  test('currentHand=0 のとき全マスが空（"0"）', () => {
    const moves: Move[] = [
      { turn: 1, player: 'P1', piece: 'A', rotation_flip: 0, pos: ['1', '1'] },
    ];
    const board = reconstructBoard(moves, 0, 'P1');
    board.forEach((row: any) => {
      COLS.forEach((col) => expect(row[col]).toBe('0'));
    });
  });
});

describe('B006: ピース配置表示', () => {
  test('1手目適用後にピースが盤面に反映される', () => {
    const moves: Move[] = [
      { turn: 1, player: 'P1', piece: 'A', rotation_flip: 0, pos: ['1', '1'] },
    ];
    const board = reconstructBoard(moves, 1, 'P1');
    expect(board[0].col1).toBe('1');
  });

  test('B006: 2手分適用後に両プレイヤーのピースが反映される', () => {
    const moves: Move[] = [
      { turn: 1, player: 'P1', piece: 'A', rotation_flip: 0, pos: ['1', '1'] },
      { turn: 2, player: 'P2', piece: 'A', rotation_flip: 0, pos: ['2', '1'] },
    ];
    const board = reconstructBoard(moves, 2, 'P1');
    expect(board[0].col1).toBe('1');
    expect(board[0].col2).toBe('2');
  });

  test('B006: passの手は盤面に影響しない', () => {
    const moves: Move[] = [{ turn: 1, player: 'P1', action: 'pass' }];
    const board = reconstructBoard(moves, 1, 'P1');
    board.forEach((row: any) => {
      COLS.forEach((col) => expect(row[col]).toBe('0'));
    });
  });

  test('B006: 複数手を進めた後に正しくピースが反映される', () => {
    const moves: Move[] = [
      { turn: 1, player: 'P1', piece: 'B', rotation_flip: 0, pos: ['1', '1'] },
      { turn: 2, player: 'P2', piece: 'A', rotation_flip: 0, pos: ['6', '6'] },
      { turn: 3, player: 'P1', piece: 'A', rotation_flip: 0, pos: ['3', '3'] },
    ];
    const board = reconstructBoard(moves, 3, 'P1');
    // P1のB（縦2マス）
    expect(board[0].col1).toBe('1');
    expect(board[1].col1).toBe('1');
    // P2のA
    expect(board[5].col6).toBe('2');
    // P1のA
    expect(board[2].col3).toBe('1');
  });
});

// ─── テスト表以外のテスト ─────────────────────────

describe('rotateCCW', () => {
  test('2×2を反時計回りに90度回転する', () => {
    expect(
      rotateCCW([
        [1, 2],
        [3, 4],
      ]),
    ).toEqual([
      [2, 4],
      [1, 3],
    ]);
  });

  test('4回回転すると元に戻る', () => {
    const input = [
      [1, 0],
      [1, 1],
    ];
    let map = input;
    for (let i = 0; i < 4; i++) map = rotateCCW(map);
    expect(map).toEqual(input);
  });

  test('縦長の配列を回転すると横長になる', () => {
    expect(rotateCCW([[1], [1]])).toEqual([[1, 1]]);
  });
});

describe('flipLR', () => {
  test('左右反転する', () => {
    expect(
      flipLR([
        [1, 0],
        [1, 1],
      ]),
    ).toEqual([
      [0, 1],
      [1, 1],
    ]);
  });

  test('左右対称な形は反転しても同じ', () => {
    const u = [
      [0, 1, 0],
      [1, 1, 1],
      [0, 1, 0],
    ];
    expect(flipLR(u)).toEqual(u);
  });
});

describe('getTransformedPieceMap', () => {
  test('rotation_flip=0 のとき基本形状のまま', () => {
    expect(getTransformedPieceMap('A', 0)).toEqual([[1]]);
  });

  test('rotation_flip=0 のときピースBは縦2マス', () => {
    expect(getTransformedPieceMap('B', 0)).toEqual([[1], [1]]);
  });

  test('rotation_flip=1 のときピースDは左右反転', () => {
    expect(getTransformedPieceMap('D', 1)).toEqual([
      [0, 1],
      [1, 1],
    ]);
  });

  test('rotation_flip=2 のときピースBは反時計回り1回で横2マス', () => {
    expect(getTransformedPieceMap('B', 2)).toEqual([[1, 1]]);
  });

  test('rotation_flip=4 のときピースBは2回回転で縦2マスに戻る', () => {
    expect(getTransformedPieceMap('B', 4)).toEqual([[1], [1]]);
  });

  test('存在しないピースは空配列を返す', () => {
    expect(getTransformedPieceMap('Z', 0)).toEqual([]);
  });
});

describe('reconstructBoard', () => {
  test('P2のピースAをpos=[0,0]に置いたとき col1行1が"2"になる', () => {
    const moves: Move[] = [
      { turn: 1, player: 'P2', piece: 'A', rotation_flip: 0, pos: ['1', '1'] },
    ];
    const board = reconstructBoard(moves, 1, 'P1');
    expect(board[0].col1).toBe('2');
  });

  test('ピースB（縦2マス）をpos=[0,0]に置いたとき2行が塗られる', () => {
    const moves: Move[] = [
      { turn: 1, player: 'P1', piece: 'B', rotation_flip: 0, pos: ['1', '1'] },
    ];
    const board = reconstructBoard(moves, 1, 'P1');
    expect(board[0].col1).toBe('1');
    expect(board[1].col1).toBe('1');
    expect(board[0].col2).toBe('0');
  });

  test('currentHand=1 のとき1手目だけが反映される', () => {
    const moves: Move[] = [
      { turn: 1, player: 'P1', piece: 'A', rotation_flip: 0, pos: ['1', '1'] },
      { turn: 2, player: 'P2', piece: 'A', rotation_flip: 0, pos: ['2', '1'] },
    ];
    const board = reconstructBoard(moves, 1, 'P1');
    expect(board[0].col1).toBe('1');
    expect(board[0].col2).toBe('0'); // 2手目はまだ適用されていない
  });
});

describe('getRemainingPieces', () => {
  const moves: Move[] = [
    { turn: 1, player: 'P1', piece: 'A', rotation_flip: 0, pos: ['1', '1'] },
    { turn: 2, player: 'P2', piece: 'B', rotation_flip: 0, pos: ['2', '2'] },
    { turn: 3, player: 'P1', piece: 'C', rotation_flip: 0, pos: ['3', '3'] },
  ];

  test('currentHand=0 のとき全駒が残っている', () => {
    expect(getRemainingPieces(moves, 0, 'P1', ALL_PIECES)).toEqual(ALL_PIECES);
  });

  test('currentHand=1 のとき P1 の A が消えている', () => {
    const result = getRemainingPieces(moves, 1, 'P1', ALL_PIECES);
    expect(result).not.toContain('A');
    expect(result).toContain('C');
  });

  test('currentHand=2 のとき P2 の手は P1 の駒に影響しない', () => {
    const result = getRemainingPieces(moves, 2, 'P1', ALL_PIECES);
    expect(result).not.toContain('A');
    expect(result).toContain('C');
  });

  test('currentHand=3 のとき P1 の A と C が消えている', () => {
    const result = getRemainingPieces(moves, 3, 'P1', ALL_PIECES);
    expect(result).not.toContain('A');
    expect(result).not.toContain('C');
    expect(result).toContain('B');
  });

  test('passの手は駒消費としてカウントされない', () => {
    const movesWithPass: Move[] = [{ turn: 1, player: 'P1', action: 'pass' }];
    expect(getRemainingPieces(movesWithPass, 1, 'P1', ALL_PIECES)).toEqual(
      ALL_PIECES,
    );
  });
});
