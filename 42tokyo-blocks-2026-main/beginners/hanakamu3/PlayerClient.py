from __future__ import annotations
import asyncio
from re import U
import websockets
import numpy as np
import random
import json
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

class BoardArea:
    TOP_LEFT = 0
    TOP_RIGHT = 1
    BOTTOM_LEFT = 2
    BOTTOM_RIGHT = 3
    CENTER = 4



class PlayerClient:
    def __init__(self, player_number: int, socket: websockets.WebSocketClientProtocol, loop: asyncio.AbstractEventLoop):
        self._loop = loop
        self._socket = socket
        self._player_number = player_number
        self.total_turn = 0
        # 手持ちのブロックリスト
        self.block_list = [
            ['U', 'R', 'T'],
            ['S', 'Q', 'O', 'L'],
            ['P', 'N', 'M', 'K'],
            ['I', 'G'],
            ['J', 'F'],
            ['D', 'H', 'E'],
            ['C', 'B', 'A']
        ]
        # self.block_list = [
        #     ['J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U'],
        #     ['E', 'F', 'G', 'H', 'I'],
        #     ['C', 'D'],
        #     ['A', 'B']
        # ]
        # Boardのメソッドを活用するために使用
        self.player = Player(player_number, "target", "beginners", socket)
        self.target = Player(-player_number + 3, "beginners", "target", socket)
        with open("beginners/hanakamu3/block_loop.json", "r") as file:
            content = json.load(file)
        self.block_data = content

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
        target_corner_mask = np.zeros((14, 14), dtype=np.int64)

        for i in range(board.shape_x):
            for j in range(board.shape_y):
                padded_block = Board.PaddedBlock(
                    board,
                    Block(BlockType('A'), BlockRotation(0)),
                    Position(i + 1, j + 1)
                )
                if board.detect_corner_connection(self.player, padded_block):
                    placeable_mask[j][i] = BLOCK_CORNER
                if board.detect_side_connection(self.player, padded_block):
                    placeable_mask[j][i] = BLOCK_EDGE
                if board.detect_collision(padded_block):
                    placeable_mask[j][i] = BLOCK_COLLISION
                else:
                    if \
                  not board.detect_side_connection(self.target, padded_block) \
                  and board.detect_corner_connection(self.target, padded_block):
                        target_corner_mask[j][i] = 1

        return placeable_mask, target_corner_mask

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
        for y in range(7 * ((zone >> 1) & 2), 7 + 7 * ((zone >> 1) & 2)):
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

    def attack_center(self, placeable_mask) -> bool:
        return 0.6 > self.get_center_density(placeable_mask)

    def sort_corner_group(self, corner_pos, is_attack_center):
        if corner_pos[0] < 7 and corner_pos[1] < 7:
            if is_attack_center and corner_pos[0] >= 4 and corner_pos[1] >= 4:
                return BoardArea.CENTER
            return BoardArea.TOP_LEFT
        elif corner_pos[0] >= 7 and corner_pos[1] < 7:
            if is_attack_center and corner_pos[0] <= 9 and corner_pos[1] >= 4:
                return BoardArea.CENTER
            return BoardArea.TOP_RIGHT
        elif corner_pos[0] < 7 and corner_pos[1] >= 7:
            if is_attack_center and corner_pos[0] >= 4 and corner_pos[1] <= 9:
                return BoardArea.CENTER
            return BoardArea.BOTTOM_LEFT
        else:
            if is_attack_center and corner_pos[0] <= 9 and corner_pos[1] <= 9:
                return BoardArea.CENTER
            return BoardArea.BOTTOM_RIGHT

    def select_attack_area(self, corner_list, placeable_mask):
        center = []
        top_left = []
        top_right = []
        bottom_left = []
        bottom_right = []

        sorted_corner_list = []

        is_attack_center = self.attack_center(placeable_mask)
        for curr_list in corner_list:
            match self.sort_corner_group(curr_list, is_attack_center):
                case BoardArea.TOP_LEFT:
                    top_left.append(curr_list)
                case BoardArea.TOP_RIGHT:
                    top_right.append(curr_list)
                case BoardArea.BOTTOM_LEFT:
                    bottom_left.append(curr_list)
                case BoardArea.BOTTOM_RIGHT:
                    bottom_right.append(curr_list)
                case _:
                    center.append(curr_list)

        top_left_density = self.get_zone_density(placeable_mask, BoardArea.TOP_LEFT)
        top_right_density = self.get_zone_density(placeable_mask, BoardArea.TOP_RIGHT)
        bottom_left_density = self.get_zone_density(placeable_mask, BoardArea.BOTTOM_LEFT)
        bottom_right_density = self.get_zone_density(placeable_mask, BoardArea.BOTTOM_RIGHT)

        corner_dict = {
            BoardArea.TOP_LEFT: [top_left_density, top_left],
            BoardArea.TOP_RIGHT: [top_right_density, top_right],
            BoardArea.BOTTOM_LEFT: [bottom_left_density, bottom_left],
            BoardArea.BOTTOM_RIGHT: [bottom_right_density, bottom_right]
        }

        corner_dict = dict(sorted(corner_dict.items(), key=lambda x: x[1][0]))
        if is_attack_center:
            sorted_corner_list.append(center)
        for area_corner in corner_dict.values():
            sorted_corner_list.append(area_corner[1])

        return sorted_corner_list

    def evaluate_next_action(self, padded_block, target_corner_mask):
        return padded_block.block_map.flatten().dot(target_corner_mask.flatten())

# === Put Block === #

    def random_choice_block(self, tier_num) -> str:
        """手持ちのブロックリストからランダムに一つ選ぶメソッド."""
        try:
            block = self.block_list[tier_num].pop(random.randrange(len(self.block_list[tier_num])))
        except Exception as e:
            print("ERROR:", e)
        else:
            return block

    def try_put_block(self, board, random_block, corner_list, target_corner_mask):
        """選んだブロックを置けるかを確認し、次の一手を返すメソッド"""
        block_type = BlockType(random_block)
        next_action = [-1, "X000"]

        for y, x in corner_list:
            for rot, deltas in self.block_data[random_block].items():
                for dx, dy in deltas:
                    rot = int(rot)
                    block_rotation = BlockRotation(rot)
                    block = Block(block_type, block_rotation)
                    block_position = Position(x + 1 - dx, y + 1 - dy)
                    try:
                        board.assert_range(block, block_position)
                        padded_block = Board.PaddedBlock(board, block, block_position)
                        if board.can_place(self.player, padded_block):
                            action = f"{random_block}{rot}{str(hex(x + 1 - dx))[2:]}{str(hex(y + 1 - dy))[2:]}"
                            eval_val = self.evaluate_next_action(padded_block, target_corner_mask)
                            if next_action[0] < eval_val:
                                next_action[0] = eval_val
                                next_action[1] = action
                    except Exception:
                        continue

        return next_action

    def try_all_blocks(self, given_board, start_time):
        """すべてのブロックを置けるか全探索"""
        # 現在のボードの状況をコピーしたBoardクラスのインスタンスを作成
        board = self.generate_board(given_board)
        current_time = time.time()
        print("log(generate_board):", current_time - start_time)
        # 現在のボードの状況をマッピング
        placeable_mask, target_corner_mask = self.check_placeable(board)
        current_time = time.time()
        print("log(check_placeable):", current_time - start_time)
        # 現在のボードの状況をマッピング
        corner_list = self.get_corner_list(board, placeable_mask)
        current_time = time.time()
        print("log(get_corner_list):", current_time - start_time)
        # 優先して攻めるエリアの決定
        corner_list = self.select_attack_area(corner_list, placeable_mask)
        current_time = time.time()
        print("log(select_attack_area):", current_time - start_time)
        # 置けなかったブロックを保存しておくリスト
        save = []

        #while True:
        for corner_batch in corner_list:
            for tier_num in range(len(self.block_list)):
                while len(self.block_list[tier_num]) != 0:
                    random_block = self.random_choice_block(tier_num)
                    next_action = self.try_put_block(board, random_block, corner_batch, target_corner_mask)
                    if next_action[1] == "X000":
                        save.append(random_block)
                        if len(self.block_list[tier_num]) == 0:
                            self.block_list[tier_num].extend(save)
                            break
                    else:
                        self.block_list[tier_num].extend(save)
                        print("next_action:", next_action)
                        return next_action[1]

        return "X000"

    def create_action(self, board):
        actions: list[str]
        action: str
        turn: int

        start_time = time.time()
        # 一手目は指定して打つ
        if self.total_turn == 0:
            self.block_list[0].pop(-1)
            self.total_turn += 1
            if self.player_number == 1:
                return "U034"
            else:
                return "U089"
        else:
            self.total_turn += 1
            return self.try_all_blocks(board, start_time)

    @staticmethod
    async def create(url: str, loop: asyncio.AbstractEventLoop) -> PlayerClient:
        socket = await websockets.connect(url)
        print('PlayerClient: connected')
        player_number = await socket.recv()
        print(f'player_number: {player_number}')
        return PlayerClient(int(player_number), socket, loop)
