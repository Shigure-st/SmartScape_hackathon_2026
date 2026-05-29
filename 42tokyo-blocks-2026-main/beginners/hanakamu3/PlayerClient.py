from __future__ import annotations
import asyncio
from re import U
import websockets
import numpy as np
import random
import json
import time

from scipy.signal import convolve2d

from blocks_duo.Player import Player
from blocks_duo.Player import Position
from blocks_duo.Board import Board, EmptyChar, Player1Char, Player2Char
from blocks_duo.Block import Block
from blocks_duo.BlockType import BlockType
from blocks_duo.BlockRotation import BlockRotation

BLOCK_CORNER = 1

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
        self._target_number = -player_number + 3
        self.total_turn = 0
        self.side_filter = np.array(
            [
                [0, 1, 0],
                [1, 0, 1],
                [0, 1, 0]
            ]
        )
        self.corner_filter = np.array(
            [
                [1, 0, 1],
                [0, 0, 0],
                [1, 0, 1]
            ]
        )
        # 手持ちのブロックリスト
        self.block_list = [
            ['U', 'R', 'T'],
            ['S', 'Q'],
            ['O', 'L'],
            ['P', 'N'],
            ['M', 'K'],
            ['I', 'G'],
            ['J', 'F'],
            ['D', 'H', 'E'],
            ['C', 'B', 'A']
        ]
        self.non_used_count = np.zeros((len(self.block_list), ), dtype=np.int64)
        # Boardのメソッドを活用するために使用
        self.player = Player(player_number, "target", "beginners", socket)
        self.target = Player(self._target_number, "beginners", "target", socket)
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

    def player_blocks(self, board, player_number):
        return board == player_number

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
        # それぞれのプレイヤーのブロック位置(bool)
        my_blocks_mask = self.player_blocks(board.now_board(), self._player_number)
        target_blocks_mask = self.player_blocks(board.now_board(), self._target_number)

        # それぞれのプレイヤーのブロック位置
        my_blocks_map = np.where(my_blocks_mask & (board.now_board() > 0), 1, 0)
        target_blocks_map = np.where(target_blocks_mask & (board.now_board() > 0), 1, 0)

        # それぞれのプレイヤーのブロックmapに一周０を追加
        my_padded_board = np.pad(my_blocks_map, pad_width=1, mode='constant', constant_values=0)
        target_padded_board = np.pad(target_blocks_map, pad_width=1, mode='constant', constant_values=0)

        # それぞれのプレイヤーのブロックとその横
        my_side_blocks_map = convolve2d(my_padded_board, self.side_filter, mode='valid')
        target_side_blocks_map = convolve2d(target_padded_board, self.side_filter, mode='valid')

        # それぞれのプレイヤーのブロックの横のみ
        my_side_map = np.where((~my_blocks_mask) & (my_side_blocks_map > 0), 1, 0)
        target_side_map = np.where((~target_blocks_mask) & (target_side_blocks_map > 0), 1, 0)

        my_corner_blocks_map = convolve2d(my_padded_board, self.corner_filter, mode='valid')
        target_corner_blocks_map = convolve2d(target_padded_board, self.corner_filter, mode='valid')

        # それぞれのプレイヤーのブロックのcornerのみ
        my_corner_mask = np.where((~my_blocks_mask) & (my_side_map == 0) & (my_corner_blocks_map > 0), 1, 0)
        target_corner_mask = np.where((~target_blocks_mask) & (target_side_map == 0) & (target_corner_blocks_map > 0), 1, 0)

        return my_corner_mask, target_corner_mask

    def check_can_put(self, board) -> np.ndarray:
        """現在のボードの状況をマッピングするメソッド"""
        # それぞれのプレイヤーのブロック位置(bool)
        my_blocks_mask = self.player_blocks(board.now_board(), self._player_number)
        target_blocks_mask = self.player_blocks(board.now_board(), self._target_number)

        # それぞれのプレイヤーのブロック位置
        my_blocks_map = np.where(my_blocks_mask & (board.now_board() > 0), 1, 0)
        target_blocks_map = np.where(target_blocks_mask & (board.now_board() > 0), 1, 0)

        # それぞれのプレイヤーのブロックmapに一周０を追加
        my_padded_board = np.pad(my_blocks_map, pad_width=1, mode='constant', constant_values=0)

        # それぞれのプレイヤーのブロックとその横
        my_side_blocks_map = convolve2d(my_padded_board, self.side_filter, mode='valid')

        return my_side_blocks_map, target_blocks_map

    def get_corner_list(self, board, placeable_mask):
        """置くことができるブロックの角の座標のリストを返すメソッド"""
        corner_list = []

        for i in range(board.shape_x):
            for j in range(board.shape_y):
                if placeable_mask[j][i] == BLOCK_CORNER:
                    corner_list.append([j, i])

        return corner_list

    def get_zone_density(self, board, zone):
        density = 0
        for y in range(7 * ((zone >> 1) & 1), 7 + 7 * ((zone >> 1) & 1)):
            for x in range(7 * (zone & 1), 7 + 7 * (zone & 1)):
                if board.now_board()[y][x] > 0:
                    density += 1
        return density / 49

    def get_center_density(self, board):
        density = 0
        for x in range(4, 10):
            for y in range(4, 10):
                if board.now_board()[y][x] > 0:
                    density += 1
        return density / 36

    def attack_center(self, board) -> bool:
        return 0.6 > self.get_center_density(board)

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

    def select_attack_area(self, corner_list, board):
        center = []
        top_left = []
        top_right = []
        bottom_left = []
        bottom_right = []

        sorted_corner_list = []

        is_attack_center = self.attack_center(board)
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

        top_left_density = self.get_zone_density(board, BoardArea.TOP_LEFT)
        top_right_density = self.get_zone_density(board,BoardArea.TOP_RIGHT)
        bottom_left_density = self.get_zone_density(board, BoardArea.BOTTOM_LEFT)
        bottom_right_density = self.get_zone_density(board, BoardArea.BOTTOM_RIGHT)

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
        return padded_block.flatten().dot(target_corner_mask.flatten())

# === Put Block === #

    def random_choice_block(self, tier_index) -> str:
        """手持ちのブロックリストからランダムに一つ選ぶメソッド."""
        try:
            block = self.block_list[tier_index].pop(random.randrange(len(self.block_list[tier_index])))
        except Exception as e:
            print("ERROR:", e)
        else:
            return block

    def try_put_block(self, board, random_block, corner_list, target_corner_mask, start_time):
        """選んだブロックを置けるかを確認し、次の一手を返すメソッド"""
        block_type = BlockType(random_block)
        next_action = [-1, "X000"]

        current_time = time.time()
        for y, x in corner_list:
            for rot, deltas in self.block_data[random_block].items():
                for dx, dy in deltas:
                    rot = int(rot)
                    block_rotation = BlockRotation(rot)
                    block = Block(block_type, block_rotation)
                    block_position = Position(x + 1 - dx, y + 1 - dy)
                    try:
                        board.assert_range(block, block_position)
                        my_padded_block = np.zeros((board.shape_y, board.shape_x), dtype=np.int64)
                        my_padded_block[block_position.y: block_position.y + block.shape_y, \
                         block_position.x: block_position.x + block.shape_x] = block.block_map
                        my_side_blocks_map, target_blocks_map = \
                        self.check_can_put(board)
                        if my_padded_block.flatten().dot(my_side_blocks_map.flatten()) == 0 \
                        and my_padded_block.flatten().dot(target_blocks_map.flatten()) == 0:
                            action = f"{random_block}{rot}{str(hex(block_position.x))[2:]}{str(hex(block_position.y))[2:]}"
                            eval_val = self.evaluate_next_action(my_padded_block, target_corner_mask)
                            if next_action[0] < eval_val:
                                next_action[0] = eval_val
                                next_action[1] = action
                    except Exception as e:
                        continue

        current_time = time.time()

        return next_action

    def try_all_blocks(self, given_board, start_time):
        """すべてのブロックを置けるか全探索"""
        # 現在のボードの状況をコピーしたBoardクラスのインスタンスを作成
        board = self.generate_board(given_board)
        # 現在のボードの状況をマッピング
        placeable_mask, target_corner_mask = self.check_placeable(board)
        # 現在のボードの状況をマッピング
        corner_list = self.get_corner_list(board, placeable_mask)
        # 優先して攻めるエリアの決定
        corner_list = self.select_attack_area(corner_list, board)

        action = [-1, "X000"]
        self.non_used_count = np.zeros((len(self.block_list), ), dtype=np.int64)
        block_list_index = \
            [idx for idx, count \
                 in zip(range(len(self.block_list)), self.non_used_count) \
                 if count < 3]

        for corner_batch in corner_list:
            for tier_index in block_list_index:
                for random_block in self.block_list[tier_index]:
                    next_action = self.try_put_block(board, random_block, corner_batch, target_corner_mask, start_time)
                    if next_action[0] > -1 and action[0] < next_action[0]:
                        action = next_action

                self.non_used_count[tier_index] += 1
                current_time = time.time()
                if action[0] > -1 or (current_time - start_time >= 13):
                    self.block_list[tier_index].remove(action[1][0])
                    return action[1]

        return "X000"

    def create_action(self, board):

        start_time = time.time()
        # 一手目は指定して打つ
        if self.total_turn == 0:
            self.block_list[0].pop(0)
            self.total_turn += 1
            if self.player_number == 1:
                return "U034"
            else:
                return "U089"
        else:
            self.total_turn += 1
            action = self.try_all_blocks(board, start_time)
            return action

    @staticmethod
    async def create(url: str, loop: asyncio.AbstractEventLoop) -> PlayerClient:
        socket = await websockets.connect(url)
        print('PlayerClient: connected')
        player_number = await socket.recv()
        print(f'player_number: {player_number}')
        return PlayerClient(int(player_number), socket, loop)
