import { Box, Button, Typography, Paper } from '@mui/material';

type ModeSelectViewProps = {
  onSelect: (mode: 'live' | 'replay') => void;
};

export default function ModeSelectView({ onSelect }: ModeSelectViewProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
      }}
    >
      <Paper
        sx={{
          p: 6,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          minWidth: 360,
        }}
      >
        <Typography variant="h4">blocksduo</Typography>
        <Typography variant="body1">
          モードを選択してください
        </Typography>
        <Box sx={{ display: 'flex', gap: 3 }}>
          <Button
            variant="outlined"
            size="large"
            onClick={() => onSelect('live')}
            sx={{ px: 4, py: 2 }}
          >
            リアルタイム観戦
          </Button>
          <Button
            variant="outlined"
            size="large"
            onClick={() => onSelect('replay')}
            sx={{ px: 4, py: 2 }}
          >
            牌譜再生
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}