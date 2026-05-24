import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import CurrentHandInfo from '../../renderer/components/CurrentHandInfo';
import { ReplayState } from '../../renderer/hooks/useReplayState';
import { Move, Player } from '../../renderer/constants/gameLogSchema';


// ─── テスト用共通データ ──────────────────────────

const players: Player[] = [
  { id: 'P1', name: 'ss_tarou_1' },
  { id: 'P2', name: 'ss_tarou_2' },
];

const moves: Move[] = [
  { turn: 1, player: 'P1', piece: 'U', rotation_flip: 0, pos: ['3','4']  },
  { turn: 2, player: 'P2', piece: 'A', rotation_flip: 0, pos: ['A','A']  },
  { turn: 3, player: 'P1', action: 'pass' },
];


// ─── ヘルパー ────────────────────────────────────

function getByContent(text: string) {
  return screen.getByText((_, el) => el?.textContent === text);
}

function makeReplayState(currentHand: number): ReplayState {
  return {
    currentHand,
    currentTurn: currentHand,
    lastHand: moves.length,
    lastTurn: moves[moves.length - 1].turn,
  };
}

function renderInfo(currentHand: number | null, customMoves = moves) {
  render(
    <CurrentHandInfo
      replayState={currentHand === null ? null : makeReplayState(currentHand)}
      moves={customMoves}
      players={players}
    />
  );
}

// ─── テスト表に対応するテスト ─────────────────────

describe('B001: 初期状態表示', () => {
  test('未読込（replayState=null）のとき全フィールドが "-" になる', () => {
    renderInfo(null);
    const dashes = screen.getAllByText('-');
    expect(dashes.every((el) => el.textContent === '-')).toBe(true);
  });

  test('currentHand=0 のとき全フィールドが "-" になる', () => {
    renderInfo(0);
    const dashes = screen.getAllByText('-');
    expect(dashes.every((el) => el.textContent === '-')).toBe(true);
  });
});

describe('B002: 1手進めた際の手情報表示', () => {
  test('currentHand=1 のとき P1 の情報が表示される', () => {
    renderInfo(1);
    expect(getByContent('先手(ss_tarou_1)')).toBeInTheDocument();
    expect(getByContent('1 手目')).toBeInTheDocument();
    expect(getByContent('U')).toBeInTheDocument();
    expect(getByContent('列3, 行4')).toBeInTheDocument();
    expect(getByContent('なし')).toBeInTheDocument();
    expect(getByContent('0度')).toBeInTheDocument();
  });

  test('currentHand=2 のとき P2 の情報が表示される', () => {
    renderInfo(2);
    expect(getByContent('後手(ss_tarou_2)')).toBeInTheDocument();
    expect(getByContent('2 手目')).toBeInTheDocument();
    expect(getByContent('A')).toBeInTheDocument();
    expect(getByContent('列A, 行A')).toBeInTheDocument();
  });
});

describe('B003: パス時の表示', () => {
  test('action=pass の手でピース・設置位置・回転・反転が "-" になる', () => {
    renderInfo(3);
    expect(getByContent('パス')).toBeInTheDocument();
    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThanOrEqual(3);
  });
});

// ─── テスト表以外のテスト ─────────────────────────

describe('playerLabel の表示', () => {
  test('players[0] が先手と表示される', () => {
    renderInfo(1);
    expect(getByContent('先手(ss_tarou_1)')).toBeInTheDocument();
  });

  test('players[1] が後手と表示される', () => {
    renderInfo(2);
    expect(getByContent('後手(ss_tarou_2)')).toBeInTheDocument();
  });
});

describe('rotation_flip の表示', () => {
  test('rotation_flip=1 のとき反転「あり」・回転「0度」と表示される', () => {
    renderInfo(1, [{ turn: 1, player: 'P1', piece: 'D', rotation_flip: 1, pos: ['1','1']  }]);
    expect(getByContent('あり')).toBeInTheDocument();
    expect(getByContent('0度')).toBeInTheDocument();
  });

  test('rotation_flip=6 のとき反転「なし」・回転「270度」と表示される', () => {
    renderInfo(1, [{ turn: 1, player: 'P1', piece: 'B', rotation_flip: 6, pos: ['1','1']  }]);
    expect(getByContent('なし')).toBeInTheDocument();
    expect(getByContent('270度')).toBeInTheDocument();
  });
});

describe('posLabel の表示', () => {
  test('pos=[0,0] のとき「列1, 行1」と表示される（1始まり）', () => {
    renderInfo(1, [{ turn: 1, player: 'P1', piece: 'A', rotation_flip: 0, pos: ['1','1']  }]);
    expect(getByContent('列1, 行1')).toBeInTheDocument();
  });

  test('pos=[13,13] のとき「列14, 行14」と表示される', () => {
    renderInfo(1, [{ turn: 1, player: 'P1', piece: 'A', rotation_flip: 0, pos: ['E','E']  }]);
    expect(getByContent('列E, 行E')).toBeInTheDocument();
  });
});