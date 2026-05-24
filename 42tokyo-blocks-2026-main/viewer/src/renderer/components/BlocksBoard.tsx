import { useState, useMemo } from 'react'
import { Box, Typography, Paper } from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import redPiece from "../../../assets/icons/redblock.png"
import bluePiece from "../../../assets/icons/blueblock.png"
import piece1 from "../../../assets/icons/A.png"
import piece2 from "../../../assets/icons/B.png"
import piece3 from "../../../assets/icons/C.png"
import piece4 from "../../../assets/icons/D.png"
import piece5 from "../../../assets/icons/E.png"
import piece6 from "../../../assets/icons/F.png"
import piece7 from "../../../assets/icons/G.png"
import piece8 from "../../../assets/icons/H.png"
import piece9 from "../../../assets/icons/I.png"
import piece10 from "../../../assets/icons/J.png"
import piece11 from "../../../assets/icons/K.png"
import piece12 from "../../../assets/icons/L.png"
import piece13 from "../../../assets/icons/M.png"
import piece14 from "../../../assets/icons/N.png"
import piece15 from "../../../assets/icons/O.png"
import piece16 from "../../../assets/icons/P.png"
import piece17 from "../../../assets/icons/Q.png"
import piece18 from "../../../assets/icons/R.png"
import piece19 from "../../../assets/icons/S.png"
import piece20 from "../../../assets/icons/T.png"
import piece21 from "../../../assets/icons/U.png"
import { countBlocks } from '../utils/boardUtils'
import { SubColor } from '../components/SubColor';

// ─── サイズ定数（デフォルト値）────────────────────
const DEFAULT_ROW_HEIGHT = 58;
const DEFAULT_COL_WIDTH  = 40;
const DEFAULT_IMG_SIZE   = 48;
const DEFAULT_PLAYER_AREA_WIDTH = 220;


function getCellClassName(params:any):any{
    if (params.value === "1" ){
        return "red-cell"
    }
    if (params.value === "2" ){
        return "blue-cell"
    }
    return 'default-cell'
}
function renderCellParams(params:GridRenderCellParams){
    const value = params.value;
      return value === "1" ? (
        <img src={redPiece} alt="Image" style={{ width: '100%', height: '100%', objectFit: 'cover', padding: 0}}/>
      ) : value === "2" ? (
        <img src={bluePiece} alt="Image" style={{ width: '100%', height: '100%', objectFit: 'cover', padding: 0 }}/>
      ) : null;
}


var isLoop:boolean = false;

function viewaction(loopcount:number, beforeBoard:Function, afterBoard:Function){
    var counter = 0;
    isLoop = true;
    var id = setInterval(function() {
        counter++;
        if (counter < loopcount){
            if(counter % 2 == 0){
                afterBoard();
            }else{
                beforeBoard();
            }
        }else{
            clearInterval(id);
            isLoop = false;
            afterBoard();
        }
    },
    200
    )
}

// 型定義にアニメーション種別を追加
export type BoardAnimation = 'none' | 'blink';

type AnimationHandler = (
  currentBoard: any,
  nextBoard: any,
  setBoard: (board: any) => void,
) => void;

const ANIMATION_HANDLERS: Record<BoardAnimation, AnimationHandler> = {
  none: (_current, next, setBoard) => {
    setBoard(next);
  },
  blink: (current, next, setBoard) => {
    if (isLoop) return;
    viewaction(10, () => setBoard(current), () => setBoard(next));
  },
};

type BlocksBoardProps = {
  p1Name: string;
  p2Name: string;
  board: any;
  p1piece: string[];
  p2piece: string[];
  result: string;
  rowHeight?: number;   // ? = 省略可能
  colWidth?: number;
  imgSize?: number;
  playerWidth?: number;
  animation?: BoardAnimation;
};

export default function BlocksBoard(prop: BlocksBoardProps){
    const [board, setBoard] = useState(prop.board);
    const animation = prop.animation ?? 'blink'; // デフォルトは 'blink'（LiveView向け）
    const rowHeight     = prop.rowHeight ?? DEFAULT_ROW_HEIGHT;
    const colWidth      = prop.colWidth  ?? DEFAULT_COL_WIDTH;
    const imgSize       = prop.imgSize   ?? DEFAULT_IMG_SIZE;
    const playerWidth   = prop.playerWidth ?? DEFAULT_PLAYER_AREA_WIDTH;
    const counts = useMemo(() => countBlocks(board), [board]);
    
    const columns: GridColDef[] = useMemo(() => [
        { field:'id',    headerName:'',  width:colWidth, minWidth:colWidth, disableColumnMenu:true, sortable:false, resizable:false, cellClassName:'id_col' },
        { field:'col1',  headerName:'1', width:colWidth, minWidth:colWidth, disableColumnMenu:true, sortable:false, resizable:false, valueFormatter:({value})=>'', renderCell:(params:GridRenderCellParams)=>renderCellParams(params), cellClassName:(params)=>getCellClassName(params) },
        { field:'col2',  headerName:'2', width:colWidth, minWidth:colWidth, disableColumnMenu:true, sortable:false, resizable:false, valueFormatter:({value})=>'', renderCell:(params:GridRenderCellParams)=>renderCellParams(params), cellClassName:(params)=>getCellClassName(params) },
        { field:'col3',  headerName:'3', width:colWidth, minWidth:colWidth, disableColumnMenu:true, sortable:false, resizable:false, valueFormatter:({value})=>'', renderCell:(params:GridRenderCellParams)=>renderCellParams(params), cellClassName:(params)=>getCellClassName(params) },
        { field:'col4',  headerName:'4', width:colWidth, minWidth:colWidth, disableColumnMenu:true, sortable:false, resizable:false, valueFormatter:({value})=>'', renderCell:(params:GridRenderCellParams)=>renderCellParams(params), cellClassName:(params)=>getCellClassName(params) },
        { field:'col5',  headerName:'5', width:colWidth, minWidth:colWidth, disableColumnMenu:true, sortable:false, resizable:false, valueFormatter:({value})=>'', renderCell:(params:GridRenderCellParams)=>renderCellParams(params), cellClassName:(params)=>getCellClassName(params) },
        { field:'col6',  headerName:'6', width:colWidth, minWidth:colWidth, disableColumnMenu:true, sortable:false, resizable:false, valueFormatter:({value})=>'', renderCell:(params:GridRenderCellParams)=>renderCellParams(params), cellClassName:(params)=>getCellClassName(params) },
        { field:'col7',  headerName:'7', width:colWidth, minWidth:colWidth, disableColumnMenu:true, sortable:false, resizable:false, valueFormatter:({value})=>'', renderCell:(params:GridRenderCellParams)=>renderCellParams(params), cellClassName:(params)=>getCellClassName(params) },
        { field:'col8',  headerName:'8', width:colWidth, minWidth:colWidth, disableColumnMenu:true, sortable:false, resizable:false, valueFormatter:({value})=>'', renderCell:(params:GridRenderCellParams)=>renderCellParams(params), cellClassName:(params)=>getCellClassName(params) },
        { field:'col9',  headerName:'9', width:colWidth, minWidth:colWidth, disableColumnMenu:true, sortable:false, resizable:false, valueFormatter:({value})=>'', renderCell:(params:GridRenderCellParams)=>renderCellParams(params), cellClassName:(params)=>getCellClassName(params) },
        { field:'col10', headerName:'A', width:colWidth, minWidth:colWidth, disableColumnMenu:true, sortable:false, resizable:false, valueFormatter:({value})=>'', renderCell:(params:GridRenderCellParams)=>renderCellParams(params), cellClassName:(params)=>getCellClassName(params) },
        { field:'col11', headerName:'B', width:colWidth, minWidth:colWidth, disableColumnMenu:true, sortable:false, resizable:false, valueFormatter:({value})=>'', renderCell:(params:GridRenderCellParams)=>renderCellParams(params), cellClassName:(params)=>getCellClassName(params) },
        { field:'col12', headerName:'C', width:colWidth, minWidth:colWidth, disableColumnMenu:true, sortable:false, resizable:false, valueFormatter:({value})=>'', renderCell:(params:GridRenderCellParams)=>renderCellParams(params), cellClassName:(params)=>getCellClassName(params) },
        { field:'col13', headerName:'D', width:colWidth, minWidth:colWidth, disableColumnMenu:true, sortable:false, resizable:false, valueFormatter:({value})=>'', renderCell:(params:GridRenderCellParams)=>renderCellParams(params), cellClassName:(params)=>getCellClassName(params) },
        { field:'col14', headerName:'E', width:colWidth, minWidth:colWidth, disableColumnMenu:true, sortable:false, resizable:false, valueFormatter:({value})=>'', renderCell:(params:GridRenderCellParams)=>renderCellParams(params), cellClassName:(params)=>getCellClassName(params) },
    ], [colWidth]);
    
    // ─── board更新ロジックをアニメーション種別で分岐 ──
  if (board !== prop.board) {
    ANIMATION_HANDLERS[animation](board, prop.board, setBoard);
  }


    return (
        <Box
            className='blocks-view'
            sx={{
                display: 'flex',
                textAlign: 'center',
                justifyContent: 'center',
                gap: 4,  // 各エリア間のスペース
                minHeight: 560,
            }}
        >

            {/* 先手エリア */}
            <Paper
                sx={{
                    px: 2,
                    py: 2,
                    textAlign: 'initial',
                    width: playerWidth,
                }}
            >
                <Typography variant="h6" textAlign="center">先手　持ち牌</Typography>
                <Box sx={{ width: playerWidth }}>
                    <img className='img-1' src={piece1}  alt='picture' style={{ width: imgSize }} hidden={!prop.p1piece.includes("A")} />
                    <img className='img-1' src={piece2}  alt='picture' style={{ width: imgSize }} hidden={!prop.p1piece.includes("B")} />
                    <img className='img-1' src={piece3}  alt='picture' style={{ width: imgSize }} hidden={!prop.p1piece.includes("C")} />
                    <img className='img-1' src={piece4}  alt='picture' style={{ width: imgSize }} hidden={!prop.p1piece.includes("D")} />
                    <img className='img-1' src={piece5}  alt='picture' style={{ width: imgSize }} hidden={!prop.p1piece.includes("E")} />
                    <img className='img-1' src={piece6}  alt='picture' style={{ width: imgSize }} hidden={!prop.p1piece.includes("F")} />
                    <img className='img-1' src={piece7}  alt='picture' style={{ width: imgSize }} hidden={!prop.p1piece.includes("G")} />
                    <img className='img-1' src={piece8}  alt='picture' style={{ width: imgSize }} hidden={!prop.p1piece.includes("H")} />
                    <img className='img-1' src={piece9}  alt='picture' style={{ width: imgSize }} hidden={!prop.p1piece.includes("I")} />
                    <img className='img-1' src={piece10} alt='picture' style={{ width: imgSize }} hidden={!prop.p1piece.includes("J")} />
                    <img className='img-1' src={piece11} alt='picture' style={{ width: imgSize }} hidden={!prop.p1piece.includes("K")} />
                    <img className='img-1' src={piece12} alt='picture' style={{ width: imgSize }} hidden={!prop.p1piece.includes("L")} />
                    <img className='img-1' src={piece13} alt='picture' style={{ width: imgSize }} hidden={!prop.p1piece.includes("M")} />
                    <img className='img-1' src={piece14} alt='picture' style={{ width: imgSize }} hidden={!prop.p1piece.includes("N")} />
                    <img className='img-1' src={piece15} alt='picture' style={{ width: imgSize }} hidden={!prop.p1piece.includes("O")} />
                    <img className='img-1' src={piece16} alt='picture' style={{ width: imgSize }} hidden={!prop.p1piece.includes("P")} />
                    <img className='img-1' src={piece17} alt='picture' style={{ width: imgSize }} hidden={!prop.p1piece.includes("Q")} />
                    <img className='img-1' src={piece18} alt='picture' style={{ width: imgSize }} hidden={!prop.p1piece.includes("R")} />
                    <img className='img-1' src={piece19} alt='picture' style={{ width: imgSize }} hidden={!prop.p1piece.includes("S")} />
                    <img className='img-1' src={piece20} alt='picture' style={{ width: imgSize }} hidden={!prop.p1piece.includes("T")} />
                    <img className='img-1' src={piece21} alt='picture' style={{ width: imgSize }} hidden={!prop.p1piece.includes("U")} />
                </Box>
            </Paper>

            {/* 盤面 */}
            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                width: 'fit-content',
            }}>
                <Paper sx={{ overflow: 'hidden', maxWidth: (prop.colWidth ?? DEFAULT_COL_WIDTH) * 15 }}>
                    {/* スコア行 */}
                    <Typography variant="h6" sx={{ mb: 0.5, textOverflow: 'ellipsis' }}>
                        先手(<SubColor>{prop.p1Name}</SubColor>)  {counts.p1} vs {counts.p2}  後手(<SubColor>{prop.p2Name}</SubColor>)
                    </Typography>

                    {/* 結果表示 */}
                    {prop.result && (
                        <Typography variant="h6" sx={{ mb: 0.5 }}>
                        {prop.result}
                        </Typography>
                    )}
                </Paper>

                <DataGrid
                    rows={board}
                    columns={columns}
                    rowHeight={rowHeight}
                    hideFooter
                    autoHeight
                    scrollbarSize={0}
                    showCellVerticalBorder
                    density='compact'
                    sx={{
                    '& .MuiDataGrid-columnHeader': {
                            backgroundColor: 'aliceblue', // ヘッダーの背景色を変更
                    },
                    border: 'none',
                    color: 'rgba(0, 0, 0, 0.87)',
                    }}
                />
            </Box>

            {/* 後手エリア */}
            <Paper
                sx={{
                    px: 2,
                    py: 2,
                    textAlign: 'initial',
                    width: playerWidth,
                }}
            >
                <Typography variant="h6" textAlign="center">後手　持ち牌</Typography>
                <Box sx={{ width: playerWidth }}>
                    <img className='img-1' src={piece1}  alt='picture' hidden={!prop.p2piece.includes("A")} style={{ width: imgSize, filter: "invert(0%) sepia(0%) saturate(100%) hue-rotate(225deg)" }} />
                    <img className='img-1' src={piece2}  alt='picture' hidden={!prop.p2piece.includes("B")} style={{ width: imgSize, filter: "invert(0%) sepia(0%) saturate(100%) hue-rotate(225deg)" }} />
                    <img className='img-1' src={piece3}  alt='picture' hidden={!prop.p2piece.includes("C")} style={{ width: imgSize, filter: "invert(0%) sepia(0%) saturate(100%) hue-rotate(225deg)" }} />
                    <img className='img-1' src={piece4}  alt='picture' hidden={!prop.p2piece.includes("D")} style={{ width: imgSize, filter: "invert(0%) sepia(0%) saturate(100%) hue-rotate(225deg)" }} />
                    <img className='img-1' src={piece5}  alt='picture' hidden={!prop.p2piece.includes("E")} style={{ width: imgSize, filter: "invert(0%) sepia(0%) saturate(100%) hue-rotate(225deg)" }} />
                    <img className='img-1' src={piece6}  alt='picture' hidden={!prop.p2piece.includes("F")} style={{ width: imgSize, filter: "invert(0%) sepia(0%) saturate(100%) hue-rotate(225deg)" }} />
                    <img className='img-1' src={piece7}  alt='picture' hidden={!prop.p2piece.includes("G")} style={{ width: imgSize, filter: "invert(0%) sepia(0%) saturate(100%) hue-rotate(225deg)" }} />
                    <img className='img-1' src={piece8}  alt='picture' hidden={!prop.p2piece.includes("H")} style={{ width: imgSize, filter: "invert(0%) sepia(0%) saturate(100%) hue-rotate(225deg)" }} />
                    <img className='img-1' src={piece9}  alt='picture' hidden={!prop.p2piece.includes("I")} style={{ width: imgSize, filter: "invert(0%) sepia(0%) saturate(100%) hue-rotate(225deg)" }} />
                    <img className='img-1' src={piece10} alt='picture' hidden={!prop.p2piece.includes("J")} style={{ width: imgSize, filter: "invert(0%) sepia(0%) saturate(100%) hue-rotate(225deg)" }} />
                    <img className='img-1' src={piece11} alt='picture' hidden={!prop.p2piece.includes("K")} style={{ width: imgSize, filter: "invert(0%) sepia(0%) saturate(100%) hue-rotate(225deg)" }} />
                    <img className='img-1' src={piece12} alt='picture' hidden={!prop.p2piece.includes("L")} style={{ width: imgSize, filter: "invert(0%) sepia(0%) saturate(100%) hue-rotate(225deg)" }} />
                    <img className='img-1' src={piece13} alt='picture' hidden={!prop.p2piece.includes("M")} style={{ width: imgSize, filter: "invert(0%) sepia(0%) saturate(100%) hue-rotate(225deg)" }} />
                    <img className='img-1' src={piece14} alt='picture' hidden={!prop.p2piece.includes("N")} style={{ width: imgSize, filter: "invert(0%) sepia(0%) saturate(100%) hue-rotate(225deg)" }} />
                    <img className='img-1' src={piece15} alt='picture' hidden={!prop.p2piece.includes("O")} style={{ width: imgSize, filter: "invert(0%) sepia(0%) saturate(100%) hue-rotate(225deg)" }} />
                    <img className='img-1' src={piece16} alt='picture' hidden={!prop.p2piece.includes("P")} style={{ width: imgSize, filter: "invert(0%) sepia(0%) saturate(100%) hue-rotate(225deg)" }} />
                    <img className='img-1' src={piece17} alt='picture' hidden={!prop.p2piece.includes("Q")} style={{ width: imgSize, filter: "invert(0%) sepia(0%) saturate(100%) hue-rotate(225deg)" }} />
                    <img className='img-1' src={piece18} alt='picture' hidden={!prop.p2piece.includes("R")} style={{ width: imgSize, filter: "invert(0%) sepia(0%) saturate(100%) hue-rotate(225deg)" }} />
                    <img className='img-1' src={piece19} alt='picture' hidden={!prop.p2piece.includes("S")} style={{ width: imgSize, filter: "invert(0%) sepia(0%) saturate(100%) hue-rotate(225deg)" }} />
                    <img className='img-1' src={piece20} alt='picture' hidden={!prop.p2piece.includes("T")} style={{ width: imgSize, filter: "invert(0%) sepia(0%) saturate(100%) hue-rotate(225deg)" }} />
                    <img className='img-1' src={piece21} alt='picture' hidden={!prop.p2piece.includes("U")} style={{ width: imgSize, filter: "invert(0%) sepia(0%) saturate(100%) hue-rotate(225deg)" }} />
                </Box>
            </Paper>

        </Box>
    );

}
