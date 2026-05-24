import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  Button,
  Alert,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  ButtonGroup,
  Paper,
} from '@mui/material';
import BlocksBoard from '../components/BlocksBoard';
import { default_data, default_pieces } from '../constants/boardData';
import { GameLog } from '../constants/gameLogSchema';
import { validateLogData } from '../utils/logValidator';
import { useReplayState } from '../hooks/useReplayState';
import {
  reconstructBoard,
  getRemainingPieces,
} from '../utils/boardUtils';
import CurrentHandInfo from '../components/CurrentHandInfo'


// ─── エラーメッセージ定数 ───────────────────────────
const ERROR_MESSAGES = {
  NO_LOG_FOLDER_SELECTED: 'ログフォルダを選択してください。',
  NO_MATCH_EXISTED: '牌譜が存在しません。',
  UNKNOWN_ERROR: '不明なエラー',
} as const;


export default function ReplayView() {
  // ─── state hook ──────────────────────────────────
  const [logsPath, setLogsPath] = useState<string | null>(null);
  const [matches, setMatches] = useState<string[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<string>('');
  const [gameLog, setGameLog] = useState<GameLog | null>(null);
  const [dialog, setDialog] = useState<{ message: string; severity: 'error' | 'info' } | null>(null);

  const {
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
  } = useReplayState();


  // ─── ファイル一覧を取得するヘルパー ───────────────
  const loadMatchList = async (targetPath: string) => {
    const files = await window.electron.ipcRenderer.getMatchList(targetPath);
    setMatches(files);
    setSelectedMatch(files[0]);
  };

  // ─── 起動時：保存済みパスがあればファイル一覧を取得 ──
  useEffect(() => {
    window.electron.ipcRenderer
      .resolveLogsPath()
      .then((resolvedPath) => {
        if (resolvedPath === null) {
          // パス未設定（初回起動など）→ フォルダ選択を案内
          setDialog({
            message: ERROR_MESSAGES.NO_LOG_FOLDER_SELECTED,
            severity: 'info',
          });
          return;
        }
        // パスが取得できた → stateに保存してファイル一覧を取得
        setLogsPath(resolvedPath);
        return loadMatchList(resolvedPath);
      })
      .catch((e: Error) => {
        // パスは取得できたがフォルダが消えているなどの異常系
        setDialog({ message: e.message, severity: 'error' });
      });
  }, []); // 初回レンダリング時のみ実行

  // ─── フォルダ選択ボタン押下 ───────────────────────
  const handleSelectLogsFolder = async () => {
    try {
      // フォルダを選択・保存してパスを受け取る
      const selectedPath = await window.electron.ipcRenderer.selectLogsFolder();
      setLogsPath(selectedPath);
      // 受け取ったパスでファイル一覧を取得する
      await loadMatchList(selectedPath);
      setDialog(null);
    } catch (e: any) {
      setDialog({ message: e.message, severity: 'error' });
    }
  };


  // ─── 読み込みボタン押下 ───────────────────────────
  const handleLoad = async () => {
    if (!logsPath) {
      setDialog({ message: ERROR_MESSAGES.NO_LOG_FOLDER_SELECTED, severity: 'error' });
      return;
    }
    if (!selectedMatch) {
      setDialog({ message: ERROR_MESSAGES.NO_MATCH_EXISTED, severity: 'error' });
      return;
    }

    try {
      const json = await window.electron.ipcRenderer.readLogFile(logsPath, selectedMatch);
      const result = validateLogData(json);

      if (!result.valid) {
        setDialog({ message: result.error, severity: 'error' });
        return;
      }

      setGameLog(result.data);
      initialize(result.data);
      setDialog(null);
    } catch (e: any) {
      setDialog({ message: e.message, severity: 'error' });
    }
  };

  // ─── 盤面・残り駒を再構築する ──────────────────────
  const currentBoard = useMemo(() => {
    if (!gameLog || !replayState) return default_data;
    return reconstructBoard(
      gameLog.moves,
      replayState.currentHand,
      gameLog.players[0].id,
    );
  }, [gameLog, replayState?.currentHand]);

  const p1RemainingPieces = useMemo(() => {
    if (!gameLog || !replayState) return default_pieces;
    return getRemainingPieces(
      gameLog.moves,
      replayState.currentHand,
      gameLog.players[0].id,
      default_pieces,
    );
  }, [gameLog, replayState?.currentHand]);

  const p2RemainingPieces = useMemo(() => {
    if (!gameLog || !replayState) return default_pieces;
    return getRemainingPieces(
      gameLog.moves,
      replayState.currentHand,
      gameLog.players[1].id,
      default_pieces,
    );
  }, [gameLog, replayState?.currentHand]);

  const resultLabel = useMemo(() => {
    if(!replayState || !gameLog || replayState?.currentHand !== replayState?.lastHand) return '';
    const winner = gameLog.end.winner;
    if (winner === 'draw') return '引き分け';
    return `勝者　${gameLog.players.find((p) => p.id === winner)?.name ?? winner}`;
  }, [replayState, gameLog]);

  // ─── 描画 ─────────────────────────────────────────
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
      {/* ヘッダー */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          height: 100,
          gap: 4,
          px: 5,
          mb: 3,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        {/* タイトル */}
        <Typography variant="h4" sx={{ mr: 2, marginRight: 'auto' }}>
          牌譜再生
        </Typography>

        {/* ログフォルダ選択ボタン */}
        <Button
          variant="outlined"
          size="large"
          onClick={handleSelectLogsFolder}
        >
          ログフォルダ選択
        </Button>

        {/* 試合選択ドロップダウン */}
        <FormControl size="small" sx={{ minWidth: 240 }}>
          <InputLabel>
            試合選択
          </InputLabel>
          <Select
            value={selectedMatch}
            label="試合選択"
            onChange={(e) => setSelectedMatch(e.target.value as string)}
          >
            {matches.map((m) => (
              <MenuItem
                key={m} 
                value={m} 
              >
                {m}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* 読み込みボタン */}
        <Button
          variant="outlined"
          size="large"
          onClick={handleLoad}
        >
          読み込み
        </Button>
      </Box>

      {/* エラーダイアログ（ポップアップ） */}
      <Dialog open={dialog !== null} onClose={() => setDialog(null)}>
        <DialogTitle>
          {dialog?.severity === 'info' ? 'お知らせ' : 'エラー'}
        </DialogTitle>
        <DialogContent>
          <Alert severity={dialog?.severity ?? 'error'}>
            {dialog?.message}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>閉じる</Button>
        </DialogActions>
      </Dialog>

      {/* トースト通知 */}
      <Snackbar
        open={toast !== null}
        autoHideDuration={3000}
        onClose={clearToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {toast ? (
          <Alert onClose={clearToast} severity={toast.severity} variant="filled" sx={{ width: '100%' }}>
            {toast.text}
          </Alert>
        ) : undefined}
      </Snackbar>

      {/* 盤面 */}
      <BlocksBoard
        p1Name={gameLog?.players[0].name ?? ''}
        p2Name={gameLog?.players[1].name ?? ''}
        board={currentBoard}
        p1piece={p1RemainingPieces}
        p2piece={p2RemainingPieces}
        result={resultLabel}
        rowHeight={44}
        colWidth={32}
        imgSize={46}
        animation="none"
      />

      {/* 再生コントロール */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          px: 5,
          mt: 3,
          minHeight: 180,
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        {/* 左右の余白用（現在手情報と対称にするため） */}
        <Box sx={{ flex: 1 }} />

        {/* 再生ボタン（中央） */}
        <ButtonGroup
          variant="outlined"
          size="large"
        >
          <Button onClick={jumpToFirst}>
            最初
          </Button>
          <Button onClick={turnBackward}>
            ◁ ターン
          </Button>
          <Button onClick={stepBackward}>
            ◁ 1手
          </Button>
          <Button onClick={stepForward}>
            1手 ▷
          </Button>
          <Button onClick={turnForward}>
            ターン ▷
          </Button>
          <Button onClick={jumpToLast}>
            最後
          </Button>
        </ButtonGroup>

        {/* 現在手情報（右端） */}
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <Paper
            sx={{
              p: 2,
              width: 300,
            }}
          >
            <Typography variant="subtitle1" sx={{ mb: 1 }}>現在手情報</Typography>
            <CurrentHandInfo
              replayState={replayState}
              moves={gameLog?.moves ?? []}
              players={gameLog?.players ?? []}
            />
          </Paper>
        </Box>
      </Box>
    </Box>
  )};