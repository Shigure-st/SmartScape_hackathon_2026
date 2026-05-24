/*
 * MUIのコンポーネントに適用するデフォルトデザインを定義するファイル
 */
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  typography: {
    fontFamily: [
      'Noto Sans JP', // Googleの日本語用フォント
      'Roboto', // 英数字用フォント (Material-UIのデフォルト)
      'sans-serif', // 何らかの理由で上記が読み込めなかった時用のフォント
    ].join(','),
  },
  palette: {
    common: {},
    primary: {
      main: 'rgba(255, 255, 255, 0.8)', // Button等の文字用
    },
    text: {
      primary: 'rgba(255, 255, 255, 0.8)', // 静的テキスト用
      secondary: 'rgb(3, 3, 3)', // 動的テキスト用
    },
  },
  glass: {
    // コンポーネントで共通して使用するスタイル
    backgroundColor: 'rgba(43, 43, 43, 0.15)',
    backdropFilter: 'blur(8px)',
    borderRadius: 4,
    border: '1px solid rgba(34, 34, 34, 0)',
    boxShadow: '3px 3px 6px rgba(0, 0, 0, 0.3)',
  },
  components: {
    MuiTypography: {
      styleOverrides: {
        root: ({ theme }) => ({
          color: theme.palette.text.primary,
        }),
      },
    },
    MuiButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          ...theme.glass,
          color: theme.palette.text.primary,
          '&:hover': {
            border: '1px solid rgba(43, 43, 43, 0.15)',
            transform: 'scale(1.05)',
          },
        }),
      },
    },
    MuiButtonGroup: {
      styleOverrides: {
        root: ({ theme }) => ({
          ...theme.glass,
          border: '1px solid transparent',
          // 中のButtonからglass系スタイルを除去
          '& .MuiButton-root': {
            backgroundColor: 'transparent',
            backdropFilter: 'none',
            boxShadow: 'none',
            borderRadius: 0,
          },
        }),
        grouped: ({ theme }) => ({
          border: '1px solid rgba(43, 43, 43, 0.15)',
          color: theme.palette.text.primary,
          '&:hover': {
            border: '1px solid rgba(43, 43, 43, 0.15)',
          },
        }),
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: ({ theme }) => ({
          ...theme.glass,
          backdropFilter: 'none', // hoverするとぼやけるのでblurを無効化
          color: theme.palette.text.secondary,
          transition: 'transform 0.1s ease',
          '&:hover': {
            transform: 'scale(1.05)',
          },
          '& .MuiOutlinedInput-notchedOutline': {
            border: '1px solid rgba(43, 43, 43, 0.15)',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            border: '1px solid rgba(43, 43, 43, 0.15)',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            border: '1px solid rgba(43, 43, 43, 0.15)',
          },
          '& .MuiSvgIcon-root': {
            color: theme.palette.text.primary,
          },
        }),
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: ({ theme }) => ({
          color: theme.palette.text.primary,
          '&.Mui-focused': {
            color: theme.palette.text.primary,
          },
        }),
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: ({ theme }) => ({
          ...theme.glass,
        }),
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: ({ theme }) => ({
          color: theme.palette.text.secondary,
          '&:hover': {
            backgroundColor: 'rgba(98, 96, 96, 0.15)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
          },
        }),
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: ({ theme }) => ({
          ...theme.glass,
        }),
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: ({ theme }) => ({
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          '& .MuiTypography-root': {
            color: theme.palette.text.secondary,
          },
          '& .MuiButton-root': {
            color: theme.palette.text.secondary,
            backdropFilter: 'none',
            '&:hover': {
              backgroundColor: 'rgb(255, 255, 255)',
            },
          },
        }),
      },
    },
  },
});
