from __future__ import annotations
import asyncio
from re import U
import websockets
import numpy as np
import random
import copy
import time

from blocks_duo.Player import Player
from blocks_duo.Player import Position
from blocks_duo.Board import Board, EmptyChar, Player1Char, Player2Char
from blocks_duo.Block import Block
from blocks_duo.BlockType import BlockType
from blocks_duo.BlockRotation import BlockRotation

BLOCK_COLLISION = 1
BLOCK_EDGE = 2
BLOCK_CORNER = 3
ENEMY_BLOCK_COLLISION = 4
ENEMY_BLOCK_EDGE = 5
ENEMY_BLOCK_CORNER = 6



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
        self.block_tier_list = [
            # ['U'], # 5block 8corner
            ['R', 'T'], # 5block 7corner
            ['S', 'Q', 'O', 'L'], # 5block 6corner
            ['P', 'N', 'M', 'K'], # 5block 5corner
            ['I', 'G'], # 4block 6corner
            ['J'], # 5block 4corner
            ['F'], # 4block 5corner
            ['D'], # 3block 5corner
            ['H', 'E'], # 4block 4corner
            ['C'], # 3block 4corner
            ['B'], # 2block 4corner
            ['A'], # 1block 4corner
        ]
        # Boardのメソッドを活用するために使用
        self.player = Player(player_number, "target", "beginners", socket)
        if player_number == 1:
            self.enemy_player = Player(2, "target", "beginners", socket)
        else:
            self.enemy_player = Player(1, "target", "beginners", socket)


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

    def pop_largest_block(self) -> str:
        """手持ちのブロックリストからマスが多い順に一つ持ってくるメソッド."""
        try:
            block = self.block_list.pop()
        except Exception as e:
            print("ERROR:", e)
        else:
            return block


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

    def enemy_placeable(self, board) -> np.ndarray:
        """相手のボードの状況をマッピングするメソッド"""
        enemy_placeable_mask = np.zeros((14, 14), dtype=np.int64)

        for i in range(board.shape_x):
            for j in range(board.shape_y):
                padded_block = Board.PaddedBlock(
                    board,
                    Block(BlockType('A'), BlockRotation(0)),
                    Position(i + 1, j + 1)
                )

                if board.detect_side_connection(self.enemy_player, padded_block):
                    enemy_placeable_mask[j][i] = BLOCK_EDGE
                if board.detect_collision(padded_block):
                    enemy_placeable_mask[j][i] = BLOCK_COLLISION
                if board.can_place(self.enemy_player, padded_block):
                    enemy_placeable_mask[j][i] = BLOCK_CORNER
        return enemy_placeable_mask

    def get_enemy_corner_list(self, board, enemy_placeable_mask) -> list[list[int, int]]:
        """相手が置くことができるブロックの角の座標のリストを返すメソッド"""
        enemy_corner_list = []

        for i in range(board.shape_x):
            for j in range(board.shape_y):
                if enemy_placeable_mask[j][i] == BLOCK_CORNER:
                    enemy_corner_list.append([j, i])

        return enemy_corner_list

    def get_corner_list(self, board, placeable_mask):
        """置くことができるブロックの角の座標のリストを返すメソッド"""
        corner_list = []

        for i in range(board.shape_x):
            for j in range(board.shape_y):
                if placeable_mask[j][i] == BLOCK_CORNER:
                    corner_list.append([j, i])

        return corner_list

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

    def count_placeable(self, board, corner_list, next_action_dict, tier_list) -> str | None:
        """
        ブロックを配置可能座標に全ての回転で設置して
        次のターンの配置可能数を辞書に保存する
        """
        for tier_block in tier_list:
            for i in range(8):
                block_type = BlockType(tier_block)
                block_rotation = BlockRotation(i)
                block = Block(block_type, block_rotation)

                # print("CORNER_LIST", corner_list)
                for y, x in corner_list:
                    start = time.time()
                    block_position = Position(x + 1, y + 1)
                    try:
                        board.assert_range(block, block_position)
                        padded_block = Board.PaddedBlock(board, block, block_position)
                        if board.can_place(self.player, padded_block):
                            # print("BLOCK:", tier_block)
                            tmp_string = tier_block
                            tmp_string += f"{i}{str(hex(x + 1))[2:]}{str(hex(y + 1))[2:]}"
                            next_action_dict[tmp_string] = self.get_available_block_count(board, padded_block)
                            print("TIME:", (time.time()) - start)
                    except Exception:
                        continue
        return

    def get_available_block_count(self, board, padded_block) -> int:
        temp_board = copy.deepcopy(board)
        temp_board.place_block(self.player, padded_block)
        placeable_mask = self.check_placeable(temp_board)
        corner_list = self.get_corner_list(board, placeable_mask)
        return len(corner_list)


    def solve_max_placement(self, given_board):
        """配置可能数優先アルゴリズム"""
        next_action_dict = {}

        # 現在のボードの状況をコピーしたBoardクラスのインスタンスを作成
        board = self.generate_board(given_board)

        # 現在のボードの状況をマッピング
        placeable_mask = self.check_placeable(board)
        # enemy_placeable_mask = self.enemy_placeable(board)
        
        # 現在のボードの状況をマッピング
        corner_list = self.get_corner_list(board, placeable_mask)
        # enemy_corner_list = self.get_enemy_corner_list(board, enemy_placeable_mask)
        # print("Block LIst:", self.block_list)

        for i, tier_list in enumerate(self.block_tier_list):
            print("Block Tier List:", tier_list)
            self.count_placeable(board, corner_list, next_action_dict, tier_list)
            if not next_action_dict:
                continue
            else:
                next_action = max(next_action_dict)
                print("NEXT_ACTION:", next_action)
                self.block_tier_list[i].remove(next_action[0])
                if not self.block_tier_list[i]:
                    self.block_tier_list.remove(self.block_tier_list[i])
                if self.player_number == 2:
                    print(f"next action 2: {next_action}")
                return next_action

        return "X000"

    # def try_all_blocks(self, given_board):
    #     """すべてのブロックを置けるか全探索"""
    #     # 現在のボードの状況をコピーしたBoardクラスのインスタンスを作成
    #     board = self.generate_board(given_board)
    #     # 現在のボードの状況をマッピング
    #     placeable_mask = self.check_placeable(board)
    #     enemy_placeable_mask = self.enemy_placeable(board)
    #     print("==============placeable_mask==================")
    #     print(placeable_mask)
    #     print("===========================================")
    #     # print("==============enemy_placeable_mask==================")
    #     # print(enemy_placeable_mask)
    #     # print("===========================================")
    #
    #     # 現在のボードの状況をマッピング
    #     corner_list = self.get_corner_list(board, placeable_mask)
    #     enemy_corner_list = self.get_enemy_corner_list(board, enemy_placeable_mask)
    #     print("==============corner_list==================")
    #     print(corner_list)
    #     print("===========================================")
    #     print("==============enemy_corner_list==================")
    #     print(enemy_corner_list)
    #     print("===========================================")
    #     # 置けなかったブロックを保存しておくリスト
    #     save = []
    #
    #     while True:
    #         random_block = self.random_choice_block()
    #         next_action = self.try_put_block(board, random_block, corner_list)
    #         if next_action == "X000":
    #             save.append(random_block)
    #             if len(self.block_list) == 0:
    #                 self.block_list.extend(save)
    #                 return "X000"
    #         else:
    #             self.block_list.extend(save)
    #             if self.player_number == 2:
    #                 print(f"next action 2: {next_action}")
    #             return next_action

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
            return self.solve_max_placement(board)

    @staticmethod
    async def create(url: str, loop: asyncio.AbstractEventLoop) -> PlayerClient:
        socket = await websockets.connect(url)
        print('PlayerClient: connected')
        player_number = await socket.recv()
        print(f'player_number: {player_number}')
        return PlayerClient(int(player_number), socket, loop)
