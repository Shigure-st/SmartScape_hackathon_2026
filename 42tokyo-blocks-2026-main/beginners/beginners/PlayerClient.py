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



class PlayerClient:
    def __init__(self, player_number: int, socket: websockets.WebSocketClientProtocol, loop: asyncio.AbstractEventLoop):
        self._loop = loop
        self._socket = socket
        self._player_number = player_number
        self.p1Actions = ['U034', 'B037', 'J266', 'M149', 'O763', 'R0A3', 'F0C6', 'K113', 'T021', 'L5D2', 'G251', 'E291', 'D057', 'A053']
        self.p2Actions = ['A0AA', 'B098', 'N0A5', 'L659', 'K33B', 'J027', 'E2B9', 'C267', 'U07C', 'M3AD', 'O2BB', 'R41C']
        self.p1turn = 0
        self.p2turn = 0
        self.total_turn = 0
        # 文字型で初期化したnumpy二次元配列
        self.board = Board()
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

    def random_choice_block(self) -> str:
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
        for i, row in enumerate(row_list):
            for j, chr in enumerate(row):
                if chr == EmptyChar:
                    self.board._Board__board[i][j] = 0
                elif chr == Player1Char:
                    self.board._Board__board[i][j] = 1
                elif chr == Player2Char:
                    self.board._Board__board[i][j] = 2
                else:
                    raise Exception

    def check_placeable(self) -> np.ndarray:
        placeable_mask = np.zeros((14, 14), dtype=np.int64)

        for i in range(self.board.shape_x):
            for j in range(self.board.shape_y):
                padded_block = Board.PaddedBlock(
                    self.board,
                    Block(BlockType('A'), BlockRotation(0)),
                    Position(i + 1, j + 1)
                )
                if self.board.detect_side_connection(self.player, padded_block):
                    placeable_mask[j][i] = BLOCK_EDGE
                if self.board.detect_collision(padded_block):
                    placeable_mask[j][i] = BLOCK_COLLISION
                if self.board.can_place(self.player, padded_block):
                    placeable_mask[j][i] = BLOCK_CORNER

        return placeable_mask

    def get_corner_list(self, placeable_mask):
        corner_list = []

        for i in range(self.board.shape_x):
            for j in range(self.board.shape_y):
                if placeable_mask[j][i] == BLOCK_CORNER:
                    corner_list.append([j, i])

        return corner_list

    def try_put_block(self, random_block, corner_list):
        print(f"random block: {random_block}")

        block_type = BlockType(random_block)
        block_rotation = BlockRotation(0)
        block = Block(block_type, block_rotation)

        for y, x in corner_list:
            block_position = Position(x + 1, y + 1)
            padded_block = Board.PaddedBlock(self.board, block, block_position)

            try:
                self.board.assert_range(block, block_position)
                if not self.board.can_place(self.player, padded_block):
                    raise Exception
                random_block += '0'
                random_block += str(hex(x + 1))[2:]
                random_block += str(hex(y + 1))[2:]
                return random_block
            except Exception:
                continue

        return "X000"

    def try_all_blocks(self):
        placeable_mask = self.check_placeable()
        corner_list = self.get_corner_list(placeable_mask)
        dump = []

        while True:
            random_block = self.random_choice_block()
            next_action = self.try_put_block(random_block, corner_list)
            if next_action == "X000":
                dump.append(random_block)
                if len(self.block_list) == 0:
                    self.block_list.extend(dump)
                    return "X000"
            else:
                self.block_list.append(dump)
                if self.player_number == 2:
                    print(f"next action 2: {next_action}")
                return next_action

    def create_action(self, board):
        actions: list[str]
        action: str
        turn: int

        # block_id = self.random_choice_block()

        # block_type = BlockType(block_id)
        # block_rotation = BlockRotation(0)
        # block_position = Position(4, 4)

        # block = Block(block_type, block_rotation)
        # padded_block = Board.PaddedBlock(self.board, block, block_position)

        # PaddedBlockのpropertyの表示
        # print(f"padded block map: {padded_block.map}")
        # print(f"padded block block map: {padded_block.block_map}")
        # print(f"padded block edge map: {padded_block.edge_map}")
        # print(f"padded block corner map: {padded_block.corner_map}")

        # try:
        #     self.board.can_place(self.player, padded_block)
        #     self.board.try_place_block(self.player, block, block_position)
        # except Exception as e:
        #     print("An exception caught:", e)

        # デバック用のランダム選択描画
        # print("Block_list before:", self.block_list)
        # print("Random_choice:", self.random_choice_block())
        # print("Block_list after:", self.block_list)

        # デバック用の二次元配列描画
        self.generate_grid(board)
        # print(self.board)

        # 置くスペースがある場所の取得
        # print("-----------------test-----------------")
        # print(corner_list)
        # print("--------------------------------------")

        if self.total_turn == 0:
            self.block_list.pop(-1)
            self.total_turn += 1
            if self.player_number == 1:
                return "U034"
            else:
                return "U089"
        else:
            self.total_turn += 1
            return self.try_all_blocks()

    @staticmethod
    async def create(url: str, loop: asyncio.AbstractEventLoop) -> PlayerClient:
        socket = await websockets.connect(url)
        print('PlayerClient: connected')
        player_number = await socket.recv()
        print(f'player_number: {player_number}')
        return PlayerClient(int(player_number), socket, loop)
