from __future__ import annotations
import asyncio
from re import U
import websockets
import numpy as np
import random

from blocks_duo.Block import Block
from blocks_duo.BlockType import BlockType
from blocks_duo.BlockRotation import BlockRotation


class PlayerClient:
    def __init__(self, player_number: int, socket: websockets.WebSocketClientProtocol, loop: asyncio.AbstractEventLoop):
        self._loop = loop
        self._socket = socket
        self._player_number = player_number
        self.p1Actions = ['U034', 'B037', 'J266', 'M149', 'O763', 'R0A3', 'F0C6', 'K113', 'T021', 'L5D2', 'G251', 'E291', 'D057', 'A053']
        self.p2Actions = ['A0AA', 'B098', 'N0A5', 'L659', 'K33B', 'J027', 'E2B9', 'C267', 'U07C', 'M3AD', 'O2BB', 'R41C']
        self.p1turn = 0
        self.p2turn = 0
        # 文字型で初期化したnumpy二次元配列
        self.grid = np.zeros((14, 14), dtype='U1')
        # 手持ちのブロックリスト
        self.block_list = []

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

    def random_choice_block(self):
        """手持ちのブロックリストからランダムに一つ選ぶメソッド."""
        try:
            block = self.block_list.pop(random.randrange(len(self.block_list)))
        except Exception as e:
            print("ERROR:", e)
        else:
            return block

    def generate_grid(self, board) -> None:
        """strで受け取ったboardをnumpy二次元配列に変換するメソッド."""
        row_list = [x[1:] for x in board.strip().split('\n')[1:]]
        i = 0
        for row in row_list:
            j = 0
            for chr in row:
                self.grid[i][j] = chr
                j += 1
            i += 1

    def create_action(self, board):
        actions: list[str]
        turn: int

        block = Block
        # デバック用のランダム選択描画
        # print("Block_list before:", self.block_list)
        # print("Random_choice:", self.random_choice_block())
        # print("Block_list after:", self.block_list)

        # デバック用の二次元配列描画
        self.generate_grid(board)
        print(self.grid)

        if self.player_number == 1:
            actions = self.p1Actions
            turn = self.p1turn
            self.p1turn += 1
        else:
            actions = self.p2Actions
            turn = self.p2turn
            self.p2turn += 1

        if len(actions) > turn:
            return actions[turn]
        else:
            # パスを選択
            return 'X000'
    
    @staticmethod
    async def create(url: str, loop: asyncio.AbstractEventLoop) -> PlayerClient:
        socket = await websockets.connect(url)
        print('PlayerClient: connected')
        player_number = await socket.recv()
        print(f'player_number: {player_number}')
        return PlayerClient(int(player_number), socket, loop)
