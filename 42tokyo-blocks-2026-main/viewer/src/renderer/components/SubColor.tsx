import { Box } from '@mui/material';

export function SubColor({ children }: { children: React.ReactNode }) {
  return <Box component="span" color="text.secondary">{children}</Box>;
}