import { Box, Typography, Divider } from '@mui/material';
import { Move, EndInfo, Player } from '../constants/gameLogSchema';
import { ReplayState } from '../hooks/useReplayState';
import { SubColor } from './SubColor';

// ─── 型定義 ──────────────────────────────────────

type CurrentHandInfoProps = {
  replayState: ReplayState | null;
  moves: Move[];
  players: Player[];
};

// ─── rotation_flip を人間が読める形に変換 ─────────

function describeRotationFlip(rotationFlip: number): string {
  const rotationCount = (rotationFlip & 0x06) >> 1;
  const isReversed = (rotationFlip & 0x01) === 0x01;
  const degrees = rotationCount * 90;
  return `${degrees}度${isReversed ? '・反転あり' : '・反転なし'}`;
}

// ─── 表示用ラベルコンポーネント ───────────────────
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography variant="body2" sx={{ minWidth: 60 }}>
        {label}
      </Typography>
      <Typography variant="body2" color="text.secondary" >{value}</Typography>
    </Box>
  );
}

export default function CurrentHandInfo({
  replayState,
  moves,
  players,
}: CurrentHandInfoProps) {

  // 表示する値を決定する
  const isLoaded   = replayState !== null;
  const handIndex  = replayState?.currentHand ?? 0;
  const hasMove    = isLoaded && handIndex > 0;
  const move: Move | null = hasMove ? moves[handIndex - 1] : null;
  const isPass     = move?.action === 'pass';

  // 各フィールドの表示値
  const playerLabel = (() => {
    if (!hasMove || !move) return <SubColor>-</SubColor>;
    const playerIndex = players.findIndex((p) => p.id === move.player);
    const player = players[playerIndex];
    if (!player) return <SubColor>{move.player}</SubColor>;
    const turn = playerIndex === 0 ? '先手' : '後手';
    return (
    <>
      {turn}(<SubColor>{player.name}</SubColor>)
    </>
  );
  })();

  // 初期盤面（currentHand == 0）
  const handLabel  = hasMove
    ? <><SubColor>{handIndex}</SubColor> 手目</>
    : <><SubColor>-</SubColor> 手目</>;
  const pieceLabel = !hasMove ? '-' : isPass ? 'パス' : (move?.piece ?? '-');
  const posLabel = !hasMove || isPass ? '-' : `列${move?.pos?.[0] ?? '-'}, 行${move?.pos?.[1] ?? '-'}`;
  const flipLabel  = !hasMove || isPass ? '-' : (move?.rotation_flip !== undefined ? (move.rotation_flip & 0x01 ? 'あり' : 'なし') : '-');
  const rotLabel   = !hasMove || isPass ? '-' : (move?.rotation_flip !== undefined ? `${((move.rotation_flip & 0x06) >> 1) * 90}度` : '-');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>

      {/* 1行目：プレイヤーと手目 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2">
          {playerLabel}
        </Typography>
        <Typography variant="body2">
          {handLabel}
        </Typography>
      </Box>

      <Divider />

      {/* 2行目：ピース・反転 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <InfoRow label="ピース"   value={pieceLabel} />
        <InfoRow label="反転"     value={flipLabel} />
      </Box>

      {/* 3行目：設置位置・回転 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <InfoRow label="設置位置" value={posLabel} />
        <InfoRow label="回転"     value={rotLabel} />
      </Box>
    </Box>
  );
}