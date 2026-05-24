import { GridValidRowModel } from '@mui/x-data-grid';
import { BoardData, rowSize, colSize } from '../constants/boardData';
import { PIECE_MAPS } from '../constants/pieceData';
import { Move } from '../constants/gameLogSchema';

// ─── convertBoardData ────────────────────────────

export function convertBoardData(board: any[][]): GridValidRowModel[] {
  var i = 1;
  var result: BoardData[] = [];
  for (var row = 0; row < board.length; row++) {
    var data: BoardData = {
      id: i.toString(16).toUpperCase(),
      col1: board[row][0].toString(),
      col2: board[row][1].toString(),
      col3: board[row][2].toString(),
      col4: board[row][3].toString(),
      col5: board[row][4].toString(),
      col6: board[row][5].toString(),
      col7: board[row][6].toString(),
      col8: board[row][7].toString(),
      col9: board[row][8].toString(),
      col10: board[row][9].toString(),
      col11: board[row][10].toString(),
      col12: board[row][11].toString(),
      col13: board[row][12].toString(),
      col14: board[row][13].toString(),
    };
    result.push(data);
    i++;
  }
  return result;
}

// ─── ブロック数を計算する ──────────────────────────
export function countBlocks(board: GridValidRowModel[]): {
  p1: number;
  p2: number;
} {
  let p1 = 0;
  let p2 = 0;
  const cols = Array.from({ length: colSize }, (_, i) => `col${i + 1}`);
  board.forEach((row: any) => {
    cols.forEach((col) => {
      if (row[col] === '1') p1++;
      if (row[col] === '2') p2++;
    });
  });
  return { p1, p2 };
}

// ─── 回転（反時計回り90度）────────────────────────
// Pythonの np.rot90 と同じ動作

export function rotateCCW(map: number[][]): number[][] {
  const rows = map.length;
  const cols = map[0].length;
  // 反時計回り：(i, j) → (cols - 1 - j, i)
  const result: number[][] = Array.from({ length: cols }, () =>
    new Array(rows).fill(0),
  );
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      result[cols - 1 - j][i] = map[i][j];
    }
  }
  return result;
}

// ─── 左右反転 ────────────────────────────────────
// Pythonの np.fliplr と同じ動作

export function flipLR(map: number[][]): number[][] {
  return map.map((row) => [...row].reverse());
}

// ─── rotation_flip を適用してピースマップを返す ──
// Pythonの Block.__init__ と同じ処理
// ① rotation_count 回 反時計回りに回転
// ② reversed なら左右反転

export function getTransformedPieceMap(
  piece: string,
  rotationFlip: number,
): number[][] {
  const baseMap = PIECE_MAPS[piece];
  if (!baseMap) return [];

  const rotationCount = (rotationFlip & 0x06) >> 1; // ビット1-2
  const isReversed = (rotationFlip & 0x01) === 0x01; // ビット0

  let map = baseMap.map((row) => [...row]); // ディープコピー

  // ① 反時計回りに rotationCount 回回転
  const actualRotation = (4 - rotationCount) % 4;
  for (let i = 0; i < actualRotation; i++) {
    map = rotateCCW(map);
  }

  // ② 左右反転
  if (isReversed) {
    map = flipLR(map);
  }

  return map;
}

// ─── 盤面再構築 ──────────────────────────────────
// currentHand に応じて moves[0..currentHand-1] を順に適用する
// 戻り値は GridValidRowModel[]（BlocksBoardに渡せる形式）

export function reconstructBoard(
  moves: Move[],
  currentHand: number,
  p1Id: string,
): GridValidRowModel[] {
  // rowSize×colSize(14×14) の空盤面を作る（0 = 空）
  const board: number[][] = Array.from({ length: rowSize }, () =>
    new Array(colSize).fill(0),
  );

  // moves[0] から moves[currentHand-1] まで順に適用
  for (let i = 0; i < currentHand; i++) {
    const move = moves[i];

    // pass の場合は盤面に変更なし
    if (move.action === 'pass') continue;
    if (
      !move.piece ||
      move.pos === undefined ||
      move.rotation_flip === undefined
    )
      continue;

    // プレイヤー番号（P1 = 1、P2 = 2）
    const playerNum = move.player === p1Id ? 1 : 2;

    // ピースマップを取得（回転・反転適用済み）
    const pieceMap = getTransformedPieceMap(move.piece, move.rotation_flip);

    const [posX, posY] = [
      parseInt(move.pos[0], 16) - 1,
      parseInt(move.pos[1], 16) - 1,
    ];

    // ピースマップを盤面に配置
    for (let py = 0; py < pieceMap.length; py++) {
      for (let px = 0; px < pieceMap[py].length; px++) {
        if (pieceMap[py][px] === 1) {
          const boardX = posX + px;
          const boardY = posY + py;
          // 盤面の範囲内かチェック
          if (
            boardX >= 0 &&
            boardX < colSize &&
            boardY >= 0 &&
            boardY < rowSize
          ) {
            board[boardY][boardX] = playerNum;
          }
        }
      }
    }
  }

  return convertBoardData(board);
}

// ─── 残り駒リストを計算する ──────────────────────
// currentHand までに使った駒を除いた残り駒を返す

export function getRemainingPieces(
  moves: Move[],
  currentHand: number,
  playerId: string,
  allPieces: string[],
): string[] {
  const usedPieces = new Set<string>();

  for (let i = 0; i < currentHand; i++) {
    const move = moves[i];
    if (move.player === playerId && move.piece) {
      usedPieces.add(move.piece);
    }
  }

  return allPieces.filter((p) => !usedPieces.has(p));
}
