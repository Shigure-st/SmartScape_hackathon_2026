import { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { GridRowsProp } from '@mui/x-data-grid';
import BlocksBoard from '../components/BlocksBoard';
import { default_data, default_pieces } from '../constants/boardData';
import { convertBoardData } from '../utils/boardUtils';

let defaultData :GridRowsProp = default_data;
let defaultPiece = default_pieces;


export default function LiveView() {
  const [p1Name, setP1Name] = useState("");
  const [p2Name, setP2Name] = useState("");
  const [winName, setWinName] = useState("");
  const [board, setBoard] = useState(defaultData);
  const [p1piece, setP1Piece] = useState(defaultPiece);
  const [p2piece, setP2Piece] = useState(defaultPiece);
  const [score, setScore] = useState("");

  useEffect(() => {
    window.electron.ipcRenderer.review('view-message', (json:any) => {
      var boardData = convertBoardData(json.board)
      setP1Name(json.p1Name)
      setP2Name(json.p2Name)
      setBoard(boardData)//受け取った情報で最新へ更新
      
      //setBoard(json.board)
      setP1Piece(json.p1piece)
      setP2Piece(json.p2piece)
      setScore(json.p1Name + ":" + json.score[json.p1Name] + "勝　　" + json.p2Name + ":" + json.score[json.p2Name] + "勝")
    });
    window.electron.ipcRenderer.resultView('result-message', (json:any) => {
      setWinName(json.winName)
    });
  }, []); // 初回マウント時のみ登録

  return (
    <Box  sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
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
        <Typography variant="h4" sx={{ mr: 2, marginRight: 'auto' }}>
          リアルタイム観戦
        </Typography>
      </Box>
      <Typography variant="h6" textAlign="center" sx={{ mb: 1 }}>
        {score}
      </Typography>
      <BlocksBoard
        p1Name={p1Name}
        p2Name={p2Name}
        board={board}
        p1piece={p1piece}
        p2piece={p2piece}
        result={winName}
      />
      {/* 表示のバランスをとるためのBox */}
      <Box sx={{ flex: 0.5 }} />
    </Box>
  );
}
