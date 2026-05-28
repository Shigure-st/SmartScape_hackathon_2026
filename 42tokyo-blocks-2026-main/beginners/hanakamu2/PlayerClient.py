from __future__ import annotations
import asyncio
from re import U
import websockets
import numpy as np
import random

from blocks_duo.Player import Player
from blocks_duo.Player import Position
from blocks_duo.Board import Board, EmptyChar, Player1Char, Player2Char
from blocks_duo.Block import Block
from blocks_duo.BlockType import BlockType
from blocks_duo.BlockRotation import BlockRotation

BLOCK_COLLISION = 1
BLOCK_EDGE = 2
BLOCK_CORNER = 3

LEFT_TOP = 0
RIGHT_TOP = 1
LEFT_BOTTOM = 2
RIGHT_BOTTOM = 3



class PlayerClient:
    def __init__(self, player_number: int, socket: websockets.WebSocketClientProtocol, loop: asyncio.AbstractEventLoop):
        self._loop = loop
        self._socket = socket
        self._player_number = player_number
        self.total_turn = 0
        # 手持ちのブロックリスト
        self.block_list = [
            'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
            'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U'
        ]
        # Boardのメソッドを活用するために使用
        self.player = Player(player_number, "target", "beginners", socket)

    @property
    def player_number(self) -> int:
        return self._player_number

    async def close(self):
        await self._socket.close()

    async def play(self):
        while True:
            board = await self._socket.recv()
            action = self.create_action(board)
            await self._socket.send(action)
            if action == 'X000':
                raise SystemExit

# === Board info === #

    def generate_board(self, board) -> None:
        """strで受け取ったboardをnumpy二次元配列に変換するメソッド."""
        current_board = Board()
        row_list = [x[1:] for x in board.strip().split('\n')[1:]]
        for i, row in enumerate(row_list):
            for j, chr in enumerate(row):
                if chr == EmptyChar:
                    current_board._Board__board[i][j] = 0
                elif chr == Player1Char:
                    current_board._Board__board[i][j] = 1
                elif chr == Player2Char:
                    current_board._Board__board[i][j] = 2
                else:
                    raise Exception
        return current_board

    def check_placeable(self, board) -> np.ndarray:
        """現在のボードの状況をマッピングするメソッド"""
        placeable_mask = np.zeros((14, 14), dtype=np.int64)

        for i in range(board.shape_x):
            for j in range(board.shape_y):
                padded_block = Board.PaddedBlock(
                    board,
                    Block(BlockType('A'), BlockRotation(0)),
                    Position(i + 1, j + 1)
                )
                if board.detect_side_connection(self.player, padded_block):
                    placeable_mask[j][i] = BLOCK_EDGE
                if board.detect_collision(padded_block):
                    placeable_mask[j][i] = BLOCK_COLLISION
                if board.can_place(self.player, padded_block):
                    placeable_mask[j][i] = BLOCK_CORNER

        return placeable_mask

    def get_corner_list(self, board, placeable_mask):
        """置くことができるブロックの角の座標のリストを返すメソッド"""
        corner_list = []

        for i in range(board.shape_x):
            for j in range(board.shape_y):
                if placeable_mask[j][i] == BLOCK_CORNER:
                    corner_list.append([j, i])

        return corner_list

    def get_zone_density(self, placeable_mask, zone):
        density = 0
        for y in range(7 * (zone & 2), 7 + 7 * (zone & 2)):
            for x in range(7 * (zone & 1), 7 + 7 * (zone & 1)):
                if placeable_mask[y][x] == BLOCK_COLLISION or placeable_mask[y][x] == BLOCK_EDGE:
                    density += 1
        return density / 49

    def get_center_density(self, placeable_mask):
        density = 0
        for x in range(4, 10):
            for y in range(4, 10):
                if placeable_mask[y][x] == BLOCK_COLLISION or placeable_mask[y][x] == BLOCK_EDGE:
                    density += 1
        return density / 36

    def prioritize_center(self, placeable_mask) -> bool:
        return np.random.rand() * 0.7 > self.get_center_density(placeable_mask)

# === Put Block === #

    def random_choice_block(self) -> str:
        """手持ちのブロックリストからランダムに一つ選ぶメソッド."""
        try:
            block = self.block_list.pop(random.randrange(len(self.block_list)))
        except Exception as e:
            print("ERROR:", e)
        else:
            return block

    def try_put_block(self, board, random_block, corner_list):
        """選んだブロックを置けるかを確認し、次の一手を返すメソッド"""
        block_type = BlockType(random_block)
        block_rotation = BlockRotation(0)
        block = Block(block_type, block_rotation)

        for y, x in corner_list:
            block_position = Position(x + 1, y + 1)
            try:
                board.assert_range(block, block_position)
                padded_block = Board.PaddedBlock(board, block, block_position)
                if board.can_place(self.player, padded_block):
                    random_block += f"0{str(hex(x + 1))[2:]}{str(hex(y + 1))[2:]}"
                    return random_block
            except Exception:
                continue

        return "X000"

    def try_all_blocks(self, given_board):
        """すべてのブロックを置けるか全探索"""
        # 現在のボードの状況をコピーしたBoardクラスのインスタンスを作成
        board = self.generate_board(given_board)
        # 現在のボードの状況をマッピング
        placeable_mask = self.check_placeable(board)
        # 現在のボードの状況をマッピング
        corner_list = self.get_corner_list(board, placeable_mask)
        # 置けなかったブロックを保存しておくリスト
        save = []

        while True:
            random_block = self.random_choice_block()
            next_action = self.try_put_block(board, random_block, corner_list)
            if next_action == "X000":
                save.append(random_block)
                if len(self.block_list) == 0:
                    self.block_list.extend(save)
                    return "X000"
            else:
                self.block_list.extend(save)
                if self.player_number == 2:
                    print(f"next action 2: {next_action}")
                return next_action

    def create_action(self, board):
        actions: list[str]
        action: str
        turn: int

        # 一手目は指定して打つ
        if self.total_turn == 0:
            self.block_list.pop(-1)
            self.total_turn += 1
            if self.player_number == 1:
                return "U034"
            else:
                return "U089"
        else:
            self.total_turn += 1
            return self.try_all_blocks(board)

    @staticmethod
    async def create(url: str, loop: asyncio.AbstractEventLoop) -> PlayerClient:
        socket = await websockets.connect(url)
        print('PlayerClient: connected')
        player_number = await socket.recv()
        print(f'player_number: {player_number}')
        return PlayerClient(int(player_number), socket, loop)
