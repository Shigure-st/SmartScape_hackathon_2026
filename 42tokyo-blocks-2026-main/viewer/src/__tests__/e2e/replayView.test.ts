import { test, expect, _electron as electron } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// ビルド済みのエントリーポイントへのパス
const appDir = path.join(__dirname, '../../../release/app');

// ビルド時のアプリ名
const appName = 'blocksview-smartscape';

// テスト用のログファイル名
const invalidJson = 'invalid.json';
const brokenSchemaJson = 'broken_schema.json';
const validJson = 'valid.json';
const validDrawJson = 'valid_draw.json';

// テスト用のlogsディレクトリ
const fixturesDir = path.join(__dirname, '../fixtures');
const testLogsDir = path.join(fixturesDir, 'logs');
const emptyLogsDir = path.join(fixturesDir, 'empty_logs');
const invalidJsonPath = path.join(testLogsDir, invalidJson);
const brokenJsonPath = path.join(testLogsDir, brokenSchemaJson);
const validJsonPath = path.join(testLogsDir, validJson);
const validDrawJsonPath = path.join(testLogsDir, validDrawJson);

// ─── フィクスチャの準備・削除 ────────────────────────

test.beforeAll(async () => {
  // テスト用のlogsディレクトリを作成
  fs.mkdirSync(testLogsDir, { recursive: true });
  fs.mkdirSync(emptyLogsDir, { recursive: true });

  // 不正JSON
  fs.writeFileSync(invalidJsonPath, '{ this is not valid json !!!', 'utf-8');

  // スキーマ不正JSON（パースはできるがバリデーション失敗）
  fs.writeFileSync(
    brokenJsonPath,
    JSON.stringify({ invalid: 'schema', missing: 'required fields' }),
    'utf8',
  );

  // 正常JSON（P1勝利）
  const validGameLog = {
    players: [
      { id: 'P1', name: 'ss_tarou' },
      { id: 'P2', name: 'ss_hanako' },
    ],
    moves: [
      { turn: 1, player: 'P1', piece: 'A', rotation_flip: 0, pos: ['5', '5'] },
      { turn: 1, player: 'P2', piece: 'A', rotation_flip: 0, pos: ['A', 'A'] },
      { turn: 2, player: 'P1', piece: 'B', rotation_flip: 0, pos: ['6', '6'] },
      { turn: 2, player: 'P2', piece: 'B', rotation_flip: 0, pos: ['9', '8'] },
      { turn: 3, player: 'P1', piece: 'C', rotation_flip: 0, pos: ['7', '8'] },
      { turn: 3, player: 'P2', piece: 'C', rotation_flip: 0, pos: ['8', 'A'] },
      { turn: 4, player: 'P1', piece: 'D', rotation_flip: 0, pos: ['8', '6'] },
      { turn: 4, player: 'P2', action: 'pass' },
      { turn: 5, player: 'P1', piece: 'E', rotation_flip: 0, pos: ['A', '3'] },
      { turn: 6, player: 'P1', action: 'pass' },
    ],
    end: {
      reason: 'normal',
      winner: 'P1',
      score: { P1: 13, P2: 6 },
    },
  };
  fs.writeFileSync(validJsonPath, JSON.stringify(validGameLog), 'utf8');

  // 正常JSON（引き分け）
  const validDrawGameLog = {
    players: [
      { id: 'P1', name: 'ss_tarou' },
      { id: 'P2', name: 'ss_hanako' },
    ],
    moves: [
      { turn: 1, player: 'P1', piece: 'A', rotation_flip: 0, pos: ['5', '5'] },
      { turn: 1, player: 'P2', piece: 'A', rotation_flip: 0, pos: ['A', 'A'] },
      { turn: 2, player: 'P1', piece: 'B', rotation_flip: 0, pos: ['6', '6'] },
      { turn: 2, player: 'P2', piece: 'B', rotation_flip: 0, pos: ['9', '8'] },
      { turn: 3, player: 'P1', piece: 'C', rotation_flip: 0, pos: ['7', '8'] },
      { turn: 3, player: 'P2', piece: 'C', rotation_flip: 0, pos: ['8', 'A'] },
      { turn: 4, player: 'P1', action: 'pass' },
      { turn: 4, player: 'P2', action: 'pass' },
    ],
    end: {
      reason: 'normal',
      winner: 'draw',
      score: { P1: 6, P2: 6 },
    },
  };
  fs.writeFileSync(validDrawJsonPath, JSON.stringify(validDrawGameLog), 'utf8');
});

test.beforeEach(async () => {
  // ログフォルダへのパスを保存したファイルを削除
  await deleteLogPathFile();
});

test.afterAll(async () => {
  // フィクスチャを削除
  if (fs.existsSync(fixturesDir)) {
    fs.rmSync(fixturesDir, { recursive: true });
  }
  // ログフォルダへのパスを保存したファイルを削除
  await deleteLogPathFile();
});

// ─── ヘルパー関数 ────────────────────────────────────

async function launchApp(
  logsPath?: string,
  mock?: (app: any) => Promise<void>,
) {
  const env: Record<string, string> = {
    ...(process.env as Record<string, string>),
    NODE_ENV: 'production',
    VIEWER_MODE: 'replay',
  };
  if (logsPath) {
    env.LOGS_PATH = logsPath;
  }

  const app = await electron.launch({
    args: [appDir],
    env,
  });

  // モックが必要であれば起動直後に登録
  if (mock) {
    await mock(app);
  }

  const page = await app.firstWindow();
  return { app, page };
}

async function deleteLogPathFile() {
  let userDataPath: string;

  if (process.platform === 'win32') {
    userDataPath = path.join(process.env.APPDATA!, appName);
  } else if (process.platform === 'darwin') {
    userDataPath = path.join(
      process.env.HOME!,
      'Library',
      'Application Support',
      appName,
    );
  } else {
    userDataPath = path.join(process.env.HOME!, '.config', appName);
  }

  const logFile = path.join(userDataPath, 'logs-path.txt');

  if (fs.existsSync(logFile)) {
    fs.unlinkSync(logFile);
  }
}

// ─── 正常JSONを読み込むまでの共通操作 ──────
async function loadValidLog(page: any) {
  await expect(page.locator('text=牌譜再生')).toBeVisible({ timeout: 15000 });
  await page.locator('.MuiSelect-select').click();
  await page.getByRole('option', { name: validJson, exact: true }).click();
  await page.locator('text=読み込み').click();
}

// ─── 現在手情報の5項目を確認するヘルパー ──────
type HandInfo = {
  hand: string; // 例: '1 手目' / '- 手目'
  piece: string; // 例: 'A' / 'パス' / '-'
  flip: string; // 例: 'なし' / 'あり' / '-'
  pos: string; // 例: '列5, 行5' / '-'
  rotation: string; // 例: '0度' / '-'
};

async function expectCurrentHandInfo(page: any, expected: HandInfo) {
  await expect(page.locator('text=' + expected.hand)).toBeVisible({
    timeout: 5000,
  });
  await expect(
    page
      .locator('text=ピース')
      .locator('..')
      .locator('text=' + expected.piece),
  ).toBeVisible({ timeout: 5000 });
  await expect(
    page
      .locator('text=反転')
      .locator('..')
      .locator('text=' + expected.flip),
  ).toBeVisible({ timeout: 5000 });
  await expect(
    page
      .locator('text=設置位置')
      .locator('..')
      .locator('text=' + expected.pos),
  ).toBeVisible({ timeout: 5000 });
  await expect(
    page
      .locator('text=回転')
      .locator('..')
      .locator('text=' + expected.rotation),
  ).toBeVisible({ timeout: 5000 });
}

// ─── スコア表示を確認するヘルパー ──────
async function expectScore(page: any, p1: number, p2: number) {
  await expect(page.locator(`text=${p1} vs ${p2}`)).toBeVisible({
    timeout: 5000,
  });
}

/**
 * ダイアログをモックして指定パスを返す（ユーザーがフォルダを選択した想定）
 */
async function mockDialogSelect(
  app: Awaited<ReturnType<typeof electron.launch>>,
  folderPath: string,
) {
  await app.evaluate(({ dialog }, selectedPath) => {
    dialog.showOpenDialog = async () => ({
      canceled: false,
      filePaths: [selectedPath],
    });
  }, folderPath);
}

/**
 * ダイアログをモックしてキャンセルを返す（ユーザーがキャンセルした想定）
 */
async function mockDialogCancel(
  app: Awaited<ReturnType<typeof electron.launch>>,
) {
  await app.evaluate(({ dialog }) => {
    dialog.showOpenDialog = async () => ({
      canceled: true,
      filePaths: [],
    });
  });
}

/*
 * 正常系
 */

// ─── F001: 起動時ファイル一覧取得 ─────────────────
test.describe('F001: 起動時ファイル一覧取得', () => {
  test('F001-1: ログフォルダ環境変数を渡して起動すると、起動時に試合一覧が表示される', async () => {
    const buttons = [invalidJson, brokenSchemaJson];
    test.setTimeout(60000);

    const { app, page } = await launchApp(testLogsDir);

    try {
      await expect(page.locator('text=牌譜再生')).toBeVisible({
        timeout: 15000,
      });

      await page.locator('.MuiSelect-select').click();

      for (const logFile of buttons) {
        await expect(
          page.getByRole('option', { name: logFile, exact: true }),
        ).toBeVisible({ timeout: 5000 });
      }
    } finally {
      await app.close();
    }
  });
  test('F001-2: 環境変数なしかつログパスファイルなしで起動したとき、infoダイアログを表示される', async () => {
    test.setTimeout(60000);

    const { app, page } = await launchApp();

    try {
      await expect(page.locator('text=牌譜再生')).toBeVisible({
        timeout: 15000,
      });

      await expect(page.locator('text=お知らせ')).toBeVisible({
        timeout: 10000,
      });
      await expect(page.locator('.MuiAlert-message')).toContainText(
        'ログフォルダを選択してください。',
      );
    } finally {
      await app.close();
    }
  });
});

// ─── F002: 起動時ファイル一覧取得 ─────────────────
test.describe('F002: フォルダ選択後ファイル一覧取得', () => {
  test('F002-1: フォルダ選択後、試合ログ一覧が表示される', async () => {
    const buttons = [invalidJson, brokenSchemaJson];
    test.setTimeout(60000);

    const { app, page } = await launchApp('', (app) =>
      mockDialogSelect(app, testLogsDir),
    );

    try {
      await page.locator('text=閉じる').click();
      await expect(page.locator('text=牌譜再生')).toBeVisible({
        timeout: 15000,
      });
      await page.locator('text=ログフォルダ選択').click();

      await page.locator('.MuiSelect-select').click();

      for (const logFile of buttons) {
        await expect(
          page.getByRole('option', { name: logFile, exact: true }),
        ).toBeVisible({ timeout: 5000 });
      }
    } finally {
      await app.close();
    }
  });
});

// ─── F003: 正常JSON読込 ───────────────────────────

test.describe('F003: 正常JSON読込', () => {
  test('F003-1: 正常JSONを読み込むと再生状態が初期化される', async () => {
    test.setTimeout(60000);
    const { app, page } = await launchApp(testLogsDir);
    try {
      await loadValidLog(page);
      // ダイアログが出ないこと
      await expect(page.locator('text=エラー')).not.toBeVisible();
      // スコア行にプレイヤー名が表示される
      await expect(page.locator('text=先手(ss_tarou)')).toBeVisible({
        timeout: 5000,
      });
    } finally {
      await app.close();
    }
  });
});

// ─── F004: 状態初期化確認 ────────────────────────

test.describe('F004: 状態初期化確認', () => {
  test('F004-1: 読み込み直後の現在手情報が初期状態である', async () => {
    test.setTimeout(60000);
    const { app, page } = await launchApp(testLogsDir);
    try {
      await loadValidLog(page);
      // currentHand=0 → 手目が "-" 表示
      await expect(page.locator('text=- 手目')).toBeVisible({ timeout: 5000 });
    } finally {
      await app.close();
    }
  });
});

// ─── F005: 1手進む操作 ───────────────────────────
test.describe('F005: 1手進む操作', () => {
  test('F005-1: 「1手 ▷」押下で現在手情報が1手目に更新される', async () => {
    test.setTimeout(60000);
    const { app, page } = await launchApp(testLogsDir);
    try {
      await loadValidLog(page);
      await page.getByRole('button', { name: '1手 ▷', exact: true }).click();
      await expectCurrentHandInfo(page, {
        hand: '1 手目',
        piece: 'A',
        flip: 'なし',
        pos: '列5, 行5',
        rotation: '0度',
      });
      await expectScore(page, 1, 0); // P1: A(1)
    } finally {
      await app.close();
    }
  });
});

// ─── F006: 1手戻す操作 ───────────────────────────
test.describe('F006: 1手戻す操作', () => {
  test('F006-1: 1手進めた後に「◁ 1手」で初期状態に戻る', async () => {
    test.setTimeout(60000);
    const { app, page } = await launchApp(testLogsDir);
    try {
      await loadValidLog(page);
      await page.getByRole('button', { name: '1手 ▷', exact: true }).click();
      await expectCurrentHandInfo(page, {
        hand: '1 手目',
        piece: 'A',
        flip: 'なし',
        pos: '列5, 行5',
        rotation: '0度',
      });
      await page.getByRole('button', { name: '◁ 1手', exact: true }).click();
      await expectCurrentHandInfo(page, {
        hand: '- 手目',
        piece: '-',
        flip: '-',
        pos: '-',
        rotation: '-',
      });
      await expectScore(page, 0, 0); // 初期状態
    } finally {
      await app.close();
    }
  });
});

// ─── F007: 1ターン進む操作 ──────────────────────
// turn1の末尾 = 2手目（P2: A, pos=['A','A'], rotation_flip=0）
test.describe('F007: 1ターン進む操作', () => {
  test('F007-1: 「ターン ▷」押下でターン末尾まで進む', async () => {
    test.setTimeout(60000);
    const { app, page } = await launchApp(testLogsDir);
    try {
      await loadValidLog(page);
      await page.getByRole('button', { name: 'ターン ▷', exact: true }).click();
      await expectCurrentHandInfo(page, {
        hand: '2 手目',
        piece: 'A',
        flip: 'なし',
        pos: '列A, 行A',
        rotation: '0度',
      });
      await expectScore(page, 1, 1); // P1: A(1), P2: A(1)
    } finally {
      await app.close();
    }
  });
});

// ─── F008: 1ターン戻す操作 ──────────────────────
test.describe('F008: 1ターン戻す操作', () => {
  test('F008-1: 1ターン進めた後に「◁ ターン」で戻る', async () => {
    test.setTimeout(60000);
    const { app, page } = await launchApp(testLogsDir);
    try {
      await loadValidLog(page);
      await page.getByRole('button', { name: 'ターン ▷', exact: true }).click();
      await expectCurrentHandInfo(page, {
        hand: '2 手目',
        piece: 'A',
        flip: 'なし',
        pos: '列A, 行A',
        rotation: '0度',
      });
      await page.getByRole('button', { name: '◁ ターン', exact: true }).click();
      await expectCurrentHandInfo(page, {
        hand: '- 手目',
        piece: '-',
        flip: '-',
        pos: '-',
        rotation: '-',
      });
      await expectScore(page, 0, 0); // 初期状態
    } finally {
      await app.close();
    }
  });
});

// ─── F009: 最初へ戻る操作 ───────────────────────
test.describe('F009: 最初へ戻る操作', () => {
  test('F009-1: 進めた後に「最初」で初期状態に戻る', async () => {
    test.setTimeout(60000);
    const { app, page } = await launchApp(testLogsDir);
    try {
      await loadValidLog(page);
      await page.getByRole('button', { name: '1手 ▷', exact: true }).click();
      await page.getByRole('button', { name: '1手 ▷', exact: true }).click();
      await page.getByRole('button', { name: '最初', exact: true }).click();
      await expectCurrentHandInfo(page, {
        hand: '- 手目',
        piece: '-',
        flip: '-',
        pos: '-',
        rotation: '-',
      });
      await expectScore(page, 0, 0); // 初期状態
    } finally {
      await app.close();
    }
  });
});

// ─── F010: 最後へ進む操作 ───────────────────────
// 最終手(10手目) = P1のpass
test.describe('F010: 最後へ進む操作', () => {
  test('F010-1: 「最後」押下で最終手に達する', async () => {
    test.setTimeout(60000);
    const { app, page } = await launchApp(testLogsDir);
    try {
      await loadValidLog(page);
      await page.getByRole('button', { name: '最後', exact: true }).click();
      await expectCurrentHandInfo(page, {
        hand: '10 手目',
        piece: 'パス',
        flip: '-',
        pos: '-',
        rotation: '-',
      });
      await expectScore(page, 13, 6); // P1: A+B+C+D+E=13, P2: A+B+C=6
    } finally {
      await app.close();
    }
  });
});

// ─── F011: 手進行時の現在手情報更新 ─────────────
test.describe('F011: 手進行時の現在手情報更新', () => {
  test('F011-1: 1手進むと現在手情報の5項目が更新される', async () => {
    test.setTimeout(60000);
    const { app, page } = await launchApp(testLogsDir);
    try {
      await loadValidLog(page);
      await page.getByRole('button', { name: '1手 ▷', exact: true }).click();
      await expectCurrentHandInfo(page, {
        hand: '1 手目',
        piece: 'A',
        flip: 'なし',
        pos: '列5, 行5',
        rotation: '0度',
      });
      await expectScore(page, 1, 0); // P1: A(1)
    } finally {
      await app.close();
    }
  });
});

// ─── F012: パス処理反映 ─────────────────────────
// 8手目 = P2のpass
test.describe('F012: パス処理反映', () => {
  test('F012-1: pass手では現在手情報がパス表示になる', async () => {
    test.setTimeout(60000);
    const { app, page } = await launchApp(testLogsDir);
    try {
      await loadValidLog(page);
      for (let i = 0; i < 8; i++) {
        await page.getByRole('button', { name: '1手 ▷', exact: true }).click();
      }
      await expectCurrentHandInfo(page, {
        hand: '8 手目',
        piece: 'パス',
        flip: '-',
        pos: '-',
        rotation: '-',
      });
      await expectScore(page, 9, 6); // P1: A+B+C+D=9, P2: A+B+C=6（P2はpass）
    } finally {
      await app.close();
    }
  });
});

// ─── F013: 最終手でのend情報表示 ────────────────

test.describe('F013: 最終手でのend情報表示', () => {
  test('F013-1: 「最後」押下で勝者が表示される', async () => {
    test.setTimeout(60000);
    const { app, page } = await launchApp(testLogsDir);
    try {
      await loadValidLog(page);
      await page.getByRole('button', { name: '最後', exact: true }).click();
      await expect(page.locator('text=勝者　ss_tarou')).toBeVisible({
        timeout: 5000,
      });
      await expectScore(page, 13, 6); // P1: A+B+C+D+E=13, P2: A+B+C=6
    } finally {
      await app.close();
    }
  });

  test('F013-2: 引き分けの場合「引き分け」が表示される', async () => {
    test.setTimeout(60000);
    const { app, page } = await launchApp(testLogsDir);
    try {
      await expect(page.locator('text=牌譜再生')).toBeVisible({
        timeout: 15000,
      });
      await page.locator('.MuiSelect-select').click();
      await page
        .getByRole('option', { name: validDrawJson, exact: true })
        .click();
      await page.locator('text=読み込み').click();
      await page.getByRole('button', { name: '最後', exact: true }).click();
      await expect(page.locator('text=8 手目')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('text=引き分け')).toBeVisible({
        timeout: 5000,
      });
      await expectScore(page, 6, 6); // P1: A+B+C=6, P2: A+B+C=6
    } finally {
      await app.close();
    }
  });
});

// ─── F014: ファイル変更後の試合更新 ─────────────

test.describe('F014: ファイル変更後の試合更新', () => {
  test('F014-1: ファイルを変更して別の試合を読み込める', async () => {
    test.setTimeout(60000);
    const { app, page } = await launchApp(testLogsDir);
    try {
      await loadValidLog(page);
      // 別ファイルに切り替えてエラーになることを確認（異なるJSONへの切り替え）
      await page.locator('.MuiSelect-select').click();
      await page
        .getByRole('option', { name: brokenSchemaJson, exact: true })
        .click();
      await page.locator('text=読み込み').click();
      await expect(page.locator('text=エラー')).toBeVisible({ timeout: 10000 });
      await page.locator('text=閉じる').click();
      // 再度validJsonに戻して読み込む
      await page.locator('.MuiSelect-select').click();
      await page.getByRole('option', { name: validJson, exact: true }).click();
      await page.locator('text=読み込み').click();
      await expect(page.locator('text=先手(ss_tarou)')).toBeVisible({
        timeout: 5000,
      });
      await expectScore(page, 0, 0); // 初期状態
    } finally {
      await app.close();
    }
  });
});

// ─── F015: 進む戻る連続操作の整合性 ─────────────

test.describe('F015: 進む戻る連続操作の整合性', () => {
  test('F015-1: 進む/戻るを連続操作しても手目と表示が一致する', async () => {
    test.setTimeout(60000);
    const { app, page } = await launchApp(testLogsDir);
    try {
      await loadValidLog(page);

      // 2手進む → 2手目(P2: A, A,A)
      await page.getByRole('button', { name: '1手 ▷', exact: true }).click();
      await page.getByRole('button', { name: '1手 ▷', exact: true }).click();
      await expectCurrentHandInfo(page, {
        hand: '2 手目',
        piece: 'A',
        flip: 'なし',
        pos: '列A, 行A',
        rotation: '0度',
      });
      await expectScore(page, 1, 1); // P1: A(1), P2: A(1)

      // 1手戻る → 1手目(P1: A, 5,5)
      await page.getByRole('button', { name: '◁ 1手', exact: true }).click();
      await expectCurrentHandInfo(page, {
        hand: '1 手目',
        piece: 'A',
        flip: 'なし',
        pos: '列5, 行5',
        rotation: '0度',
      });
      await expectScore(page, 1, 0); // P1: A(1), P2: まだ置いていない

      // また1手進む → 2手目(P2: A, A,A)
      await page.getByRole('button', { name: '1手 ▷', exact: true }).click();
      await expectCurrentHandInfo(page, {
        hand: '2 手目',
        piece: 'A',
        flip: 'なし',
        pos: '列A, 行A',
        rotation: '0度',
      });
      await expectScore(page, 1, 1); // P1: A(1), P2: A(1)

      // 最初に戻る
      await page.getByRole('button', { name: '最初', exact: true }).click();
      await expectCurrentHandInfo(page, {
        hand: '- 手目',
        piece: '-',
        flip: '-',
        pos: '-',
        rotation: '-',
      });
      await expectScore(page, 0, 0); // 初期状態

      // 最後に進む → 10手目(P1: pass)
      await page.getByRole('button', { name: '最後', exact: true }).click();
      await expectCurrentHandInfo(page, {
        hand: '10 手目',
        piece: 'パス',
        flip: '-',
        pos: '-',
        rotation: '-',
      });
      await expectScore(page, 13, 6); // P1: A+B+C+D+E=13, P2: A+B+C=6
    } finally {
      await app.close();
    }
  });
});

/*
 * 異常系
 */

// ─── F101: ファイル不在時エラー ─────────────────

test.describe('F101: ファイル不在時エラー', () => {
  test('F101-1: フォルダ選択ボタンを押して、有効なフォルダが読み込まれなければErrorレベルのダイアログを表示される。', async () => {
    test.setTimeout(60000);

    const { app, page } = await launchApp(testLogsDir, (app) =>
      mockDialogSelect(app, emptyLogsDir),
    );

    try {
      await expect(page.locator('text=牌譜再生')).toBeVisible({
        timeout: 15000,
      });

      await page.locator('text=ログフォルダ選択').click();

      await expect(page.locator('text=エラー')).toBeVisible({
        timeout: 10000,
      });
      await expect(page.locator('.MuiAlert-message')).toContainText(
        'ログファイルが見つかりません',
      );
    } finally {
      await app.close();
    }
  });

  test('F101-2: フォルダ選択ボタンを押して、ダイアログをキャンセルしたらErrorレベルのダイアログを表示される。', async () => {
    test.setTimeout(60000);

    const { app, page } = await launchApp(testLogsDir, (app) =>
      mockDialogCancel(app),
    );

    try {
      await expect(page.locator('text=牌譜再生')).toBeVisible({
        timeout: 15000,
      });

      await page.locator('text=ログフォルダ選択').click();
      await expect(page.locator('text=エラー')).toBeVisible({
        timeout: 10000,
      });
      await expect(page.locator('.MuiAlert-message')).toContainText(
        'ログフォルダが選択されませんでした。',
      );
    } finally {
      await app.close();
    }
  });
});

// ─── F102: 不正ファイル選択時エラー表示 ───────────────

test.describe('F102: 不正ファイル選択時エラー表示', () => {
  test('F102-1: 不正なファイルを読み込んだ際エラーダイアログが表示される', async () => {
    test.setTimeout(60000);

    const { app, page } = await launchApp(testLogsDir);

    try {
      await expect(page.locator('text=牌譜再生')).toBeVisible({
        timeout: 15000,
      });

      await page.locator('.MuiSelect-select').click();
      await page.getByRole('option', { name: invalidJson }).click();
      await page.locator('text=読み込み').click();

      await expect(page.locator('text=エラー')).toBeVisible({ timeout: 10000 });

      await page.locator('text=閉じる').click();
      await expect(page.locator('text=エラー')).not.toBeVisible();
    } finally {
      await app.close();
    }
  });
});

// ─── F103: JSONバリデーションエラー ───────────────────

test.describe('F103: JSONバリデーションエラー', () => {
  test('F103-1: 不正JSON読込時にエラーダイアログが表示される', async () => {
    test.setTimeout(60000);

    const { app, page } = await launchApp(testLogsDir);

    try {
      await expect(page.locator('text=牌譜再生')).toBeVisible({
        timeout: 15000,
      });

      await page.locator('.MuiSelect-select').click();
      await page.getByRole('option', { name: brokenSchemaJson }).click();

      await page.locator('text=読み込み').click();

      await expect(page.locator('text=エラー')).toBeVisible({ timeout: 10000 });

      await page.locator('text=閉じる').click();
      await expect(page.locator('text=エラー')).not.toBeVisible();
    } finally {
      await app.close();
    }
  });
});

// ─── F104: 未読込時全操作 ─────────────────────

test.describe('F104: 未読込時全操作', () => {
  const buttons = [
    { id: '1', label: '最初' },
    { id: '2', label: '◁ ターン' },
    { id: '3', label: '◁ 1手' },
    { id: '4', label: '1手 ▷' },
    { id: '5', label: 'ターン ▷' },
    { id: '6', label: '最後' },
  ];
  for (const { id, label } of buttons) {
    test(`F104-${id}: 読み込み前に「${label}」ボタン押下時トーストが表示される`, async () => {
      test.setTimeout(60000);

      const { app, page } = await launchApp(testLogsDir);

      try {
        await expect(page.locator('text=牌譜再生')).toBeVisible({
          timeout: 15000,
        });

        await page.getByRole('button', { name: label, exact: true }).click();

        await expect(
          page.locator('.MuiSnackbar-root .MuiAlert-message'),
        ).toBeVisible({ timeout: 5000 });
      } finally {
        await app.close();
      }
    });
  }
});

// ─── F105: エラー表示連携 ───────────

test.describe('F105: エラー表示連携', () => {
  test('F105-1: 不正JSON読込後に状態が未読込のままである', async () => {
    test.setTimeout(60000);

    const { app, page } = await launchApp(testLogsDir);

    try {
      await expect(page.locator('text=牌譜再生')).toBeVisible({
        timeout: 15000,
      });

      await page.locator('.MuiSelect-select').click();
      await page.getByRole('option', { name: brokenSchemaJson }).click();
      await page.locator('text=読み込み').click();

      await expect(page.locator('text=エラー')).toBeVisible({ timeout: 10000 });
      await page.locator('text=閉じる').click();

      const scoreText = await page
        .locator('.MuiTypography-h6')
        .first()
        .textContent();
      expect(scoreText).not.toContain('ss_tarou');

      await page.locator('text=1手 ▷').click();
      await expect(
        page.locator('.MuiSnackbar-root .MuiAlert-message'),
      ).toBeVisible({ timeout: 5000 });
    } finally {
      await app.close();
    }
  });
});
