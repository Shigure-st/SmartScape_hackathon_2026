import { useState, useEffect } from 'react';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import icon from '../../assets/icon.svg';
import './App.css';
import LiveView from './pages/LiveView'
import ReplayView from './pages/ReplayView'
import ModeSelectView from './pages/ModeSelectView';
import { theme } from './styles/theme';
import { useWindowScale, CONTENT_WIDTH, CONTENT_HEIGHT } from './hooks/useWindowScale';
// MUIがデフォルトで使用するweightのフォントパッケージのみimport
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import '@fontsource/noto-sans-jp/300.css';
import '@fontsource/noto-sans-jp/400.css';
import '@fontsource/noto-sans-jp/500.css';
import '@fontsource/noto-sans-jp/700.css';


export default function App() {
  const [mode, setMode] = useState<'live' | 'replay' | 'select' | null>(null);
  const { scale } = useWindowScale();

  useEffect(() => {
    window.electron.ipcRenderer.getAppMode().then((m: string) => {
      setMode(m as 'live' | 'replay');
    });
  }, []);

  if (mode === null) return null;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Box style={{
          width: CONTENT_WIDTH,
          height: CONTENT_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}>
          <Router>
            <Routes>
              <Route
                path="/"
                element={
                  mode === 'select' ? (
                    <ModeSelectView onSelect={(m) => setMode(m)} />
                  ) : mode === 'replay' ? (
                    <ReplayView />
                  ) : (
                    <LiveView />
                  )
                }
              />
            </Routes>
          </Router>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
