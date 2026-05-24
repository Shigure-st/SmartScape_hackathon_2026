/* eslint import/prefer-default-export: off */
import fs from 'fs';
import { URL } from 'url';
import path from 'path';

export function resolveHtmlPath(htmlFileName: string) {
  if (process.env.NODE_ENV === 'development') {
    const port = process.env.PORT || 1212;
    const url = new URL(`http://localhost:${port}`);
    url.pathname = htmlFileName;
    return url.href;
  }
  return `file://${path.resolve(__dirname, '../renderer/', htmlFileName)}`;
}

// ─── ダイアログ結果の検証 ─────────────────────────
export function validateSelectedPath(result: {
  canceled: boolean;
  filePaths: string[];
}): string {
  if (result.canceled || result.filePaths.length === 0) {
    throw new Error('ログフォルダが選択されませんでした。');
  }

  return result.filePaths[0];
}

// ─── フォルダ存在チェック ─────────────────────────
export function validateDirectoryExists(path: string): void {
  if (!fs.existsSync(path)) {
    throw new Error(`フォルダが見つかりません: ${path}`);
  }
}

// ─── JSONファイル一覧取得 ─────────────────────────
export function getJsonFiles(logsPath: string): string[] {
  const jsonFiles = fs
    .readdirSync(logsPath)
    .filter((file) => file.endsWith('.json'));

  return jsonFiles;
}
