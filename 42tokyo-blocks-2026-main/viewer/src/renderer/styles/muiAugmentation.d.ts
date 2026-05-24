/*
 * theme.glassを有効にするための型宣言ファイル
 */

import '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Theme {
    glass: {
      backgroundColor: string;
      backdropFilter: string;
      borderRadius: number;
      border: string;
      boxShadow: string;
    };
  }
  interface ThemeOptions {
    glass?: {
      backgroundColor?: string;
      backdropFilter?: string;
      borderRadius?: number;
      border?: string;
      boxShadow?: string;
    };
  }
}
