from __future__ import annotations
import asyncio
from re import U
import websockets
import numpy as np
import random
import copy
import json
import time
import os

from scipy.signal import convolve2d

from blocks_duo.Player import Player
from blocks_duo.Player import Position
from blocks_duo.Board import Board, EmptyChar, Player1Char, Player2Char
from blocks_duo.Block import Block
from blocks_duo.BlockType import BlockType
from blocks_duo.BlockRotation import BlockRotation

BLOCK_COLLISION = 1
BLOCK_EDGE = 2
BLOCK_CORNER = 3
HANA_BLOCK_CORNER = 1


class BoardArea:
    TOP_LEFT = 0
    TOP_RIGHT = 1
    BOTTOM_LEFT = 2
    BOTTOM_RIGHT = 3
    CENTER = 4

# ============================================================================

class PlayerClient:
    def __init__(self, player_number: int, socket: websockets.WebSocketClientProtocol, loop: asyncio.AbstractEventLoop):
        self._loop = loop
        self._socket = socket
        self._player_number = player_number
        self.total_turn = 0
        self.selected_algo = None
        # =======================hanakamu==============================
        self._target_number = -player_number + 3
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
        with open("beginners/beginners/block_loop.json", "r") as file:
            content = json.load(file)
        self.block_data = content
        # =======================hanakamu==============================
        #
        # =======================enomoto==============================
        self.stat_path = "beginners/beginners/.stat.txt"
        self.history_path = "beginners/beginners/.match_history.txt"
        # 手持ちのブロックリスト
        self.block_tier_list = [
            # ['U'], # 5block 8corner
            ['U', 'T'], # 5block 7corner
            ['S', 'O'], # 5block 6corner
            ['Q', 'L'], # 5block 6corner
            ['P', 'K'], # 5block 5corner
            ['N', 'M'], # 5block 5corner
            ['J'], # 5block 4corner
            ['I', 'G'], # 4block 6corner
            ['F'], # 4block 5corner
            ['D'], # 3block 5corner
            ['H', 'E'], # 4block 4corner
            ['C'], # 3block 4corner
            ['B'], # 2block 4corner
            ['A'], # 1block 4corner
        ]
        # Boardのメソッドを活用するために使用
        if player_number == 1:
            self.enemy_player = Player(2, "target", "beginners", socket)
        else:
            self.enemy_player = Player(1, "target", "beginners", socket)
        # =======================enomoto==============================


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

    def player_blocks_map(self, board: Board, player_number):
        return np.where(board.now_board() == player_number, 1, 0)

    def player_blocks_and_sides_map(self, board: Board, player_number):
        blocks_map = self.player_blocks_map(board, player_number)
        padded_board = np.pad(blocks_map, pad_width=1,
                              mode='constant', constant_values=0)
        blocks_sides_map = convolve2d(padded_board, self.side_filter,
                                      mode='valid')
        return np.where(blocks_sides_map > 0, 1, 0)

    def player_corner_map(self, board: Board, player_number):
        blocks_map = self.player_blocks_map(board, player_number)
        padded_board = np.pad(blocks_map, pad_width=1,
                              mode='constant', constant_values=0)
        blocks_sides_map = self.player_blocks_and_sides_map(board,
                                                            player_number)
        corner_map = convolve2d(padded_board, self.corner_filter, mode='valid')

        return np.where((blocks_sides_map == 0) & (corner_map > 0), 1, 0)

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

    def get_corner_list(self, board, placeable_mask):
        """置くことができるブロックの角の座標のリストを返すメソッド"""
        corner_list = []

        for i in range(board.shape_x):
            for j in range(board.shape_y):
                if placeable_mask[j][i] == HANA_BLOCK_CORNER:
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
                        my_padded_block = np.zeros((board.shape_y, board.shape_x),
                                                   dtype=np.int64)
                        my_padded_block[block_position.y: block_position.y + block.shape_y, \
                         block_position.x: block_position.x + block.shape_x] = block.block_map
                        my_blocks_sides_map = self.player_blocks_and_sides_map(
                            board, self._player_number)
                        target_blocks_map = self.player_blocks_map(
                            board, self._target_number)
                        if my_padded_block.flatten().dot(my_blocks_sides_map.flatten()) == 0 \
                        and my_padded_block.flatten().dot(target_blocks_map.flatten()) == 0:
                            action = f"{random_block}"\
                                     f"{rot}"\
                                     f"{str(hex(block_position.x + 1))[2:]}"\
                                     f"{str(hex(block_position.y + 1))[2:]}"
                            eval_val = self.evaluate_next_action(my_padded_block,
                                target_corner_mask)
                            if next_action[0] < eval_val:
                                next_action[0] = eval_val
                                next_action[1] = action
                    except Exception as e:
                        continue

        current_time = time.time()

        return next_action

    def try_all_blocks(self, current_board, start_time):
        """すべてのブロックを置けるか全探索"""
        # 現在のボードの状況をコピーしたBoardクラスのインスタンスを作成
        board = self.generate_board(current_board)
        # 現在のボードの状況をマッピング
        my_corner_map = self.player_corner_map(board,
                                               self._player_number)
        target_corner_map = self.player_corner_map(board,
                                               self._target_number)
        # 現在のボードの状況をマッピング
        corner_list = self.get_corner_list(board, my_corner_map)
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
                    next_action = self.try_put_block(board, random_block,
                        corner_batch, target_corner_map, start_time)
                    if next_action[0] > -1 and action[0] < next_action[0]:
                        action = next_action

                self.non_used_count[tier_index] += 1
                current_time = time.time()
                if action[0] > -1 or (current_time - start_time >= 13):
                    if action[1][0] != 'X':
                        self.block_list[tier_index].remove(action[1][0])
                    count_1 = np.sum(board.now_board() == 1)
                    count_2 = np.sum(board.now_board() == 2)
                    with open(self.history_path, 'a', encoding='utf-8') as f:
                        if self.player_number == 1:
                            my_score = count_1
                            enemy_score = count_2
                        else:
                            my_score = count_2
                            enemy_score = count_1
                        f.write(f'{my_score}:{enemy_score}\n')
                        # if my_score > enemy_score:
                        #     f.write('WIN\n')
                        # elif my_score < enemy_score:
                        #     f.write('LOSE\n')
                        # else:
                        #     f.write('DRAW\n')
                        f.flush()
                        os.fsync(f.fileno())
                    return action[1]

        count_1 = np.sum(board.now_board() == 1)
        count_2 = np.sum(board.now_board() == 2)
        with open(self.history_path, 'a', encoding='utf-8') as f:
            if self.player_number == 1:
                my_score = count_1
                enemy_score = count_2
            else:
                my_score = count_2
                enemy_score = count_1
            f.write(f'{my_score}:{enemy_score}\n')
            f.flush()
            os.fsync(f.fileno())
            # if my_score > enemy_score:
            #     f.write('WIN\n')
            # elif my_score < enemy_score:
            #     f.write('LOSE\n')
            # else:
            #     f.write('DRAW\n')
        return "X000"


# ============================================================================
# ============================================================================
# ============================================================================
# ============================================================================

    def eno_check_placeable(self, board):
        """現在のボードの状況をマッピングするメソッド"""
        placeable_mask = np.zeros((14, 14), dtype=np.int64)
        enemy_placeable_mask = np.zeros((14, 14), dtype=np.int64)

        for i in range(board.shape_x):
            for j in range(board.shape_y):
                # start = time.time()
                padded_block = Board.PaddedBlock(
                    board,
                    Block(BlockType('A'), BlockRotation(0)),
                    Position(i + 1, j + 1)
                )
                # print("TIME aaa:", (time.time()) - start)
                if board.detect_side_connection(self.player, padded_block):
                    placeable_mask[j][i] = BLOCK_EDGE
                if board.detect_collision(padded_block):
                    placeable_mask[j][i] = BLOCK_COLLISION
                if board.can_place(self.player, padded_block):
                    placeable_mask[j][i] = BLOCK_CORNER

                if board.detect_side_connection(self.enemy_player, padded_block):
                    enemy_placeable_mask[j][i] = BLOCK_EDGE
                if board.detect_collision(padded_block):
                    enemy_placeable_mask[j][i] = BLOCK_COLLISION
                if board.can_place(self.enemy_player, padded_block):
                    enemy_placeable_mask[j][i] = BLOCK_CORNER

        return placeable_mask, enemy_placeable_mask

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

    def eno_get_corner_list(self, board, placeable_mask):
        """置くことができるブロックの角の座標のリストを返すメソッド"""
        corner_list = []

        for i in range(board.shape_x):
            for j in range(board.shape_y):
                if placeable_mask[j][i] == BLOCK_CORNER:
                    corner_list.append([j, i])

        return corner_list


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

                for y, x in corner_list:
                    block_position = Position(x + 1, y + 1)
                    try:
                        board.assert_range(block, block_position)
                        padded_block = Board.PaddedBlock(board, block, block_position)
                        if board.can_place(self.player, padded_block):
                            tmp_string = tier_block
                            tmp_string += f"{i}{str(hex(x + 1))[2:]}{str(hex(y + 1))[2:]}"
                            next_action_dict[tmp_string] = self.get_available_block_count(board, padded_block)
                    except Exception:
                        continue
        return

    def get_available_block_count(self, board, padded_block) -> int:
        temp_board = copy.deepcopy(board)
        temp_board.place_block(self.player, padded_block)
        placeable_mask, enemy_placeable_mask = self.eno_check_placeable(temp_board)
        corner_list = self.eno_get_corner_list(board, placeable_mask)
        enemy_corner_list = self.get_enemy_corner_list(board, enemy_placeable_mask)
        return len(corner_list) - (len(enemy_corner_list) * 1)


    def solve_max_placement(self, given_board):
        """配置可能数優先アルゴリズム"""
        next_action_dict = {}

        # 現在のボードの状況をコピーしたBoardクラスのインスタンスを作成
        board = self.generate_board(given_board)

        # 現在のボードの状況をマッピング
        placeable_mask, enemy_placeable_mask = self.eno_check_placeable(board)

        # 現在のボードの状況をマッピング
        corner_list = self.eno_get_corner_list(board, placeable_mask)

        stat_path = os.path.join(os.path.dirname(__file__), '.stat.txt')
        for i, tier_list in enumerate(self.block_tier_list):
            self.count_placeable(board, corner_list, next_action_dict, tier_list)
            if not next_action_dict:
                continue
            else:
                max_value = max(next_action_dict.values())
                max_list = [key for key, value in next_action_dict.items() if value == max_value]
                next_action = random.choice(max_list)
                print("NEXT_ACTION:", next_action)
                self.block_tier_list[i].remove(next_action[0])
                if not self.block_tier_list[i]:
                    self.block_tier_list.remove(self.block_tier_list[i])
                if self.player_number == 2:
                    print(f"next action 2: {next_action}")
                count_1 = np.sum(board.now_board() == 1)
                count_2 = np.sum(board.now_board() == 2)
                with open(self.history_path, 'a', encoding='utf-8') as f:
                    if self.player_number == 1:
                        my_score = count_1
                        enemy_score = count_2
                    else:
                        my_score = count_2
                        enemy_score = count_1
                    f.write(f'{my_score}:{enemy_score}\n')
                    f.flush()
                    os.fsync(f.fileno())
                return next_action

        count_1 = np.sum(board.now_board() == 1)
        count_2 = np.sum(board.now_board() == 2)
        with open(self.history_path, 'a', encoding='utf-8') as f:
            if self.player_number == 1:
                my_score = count_1
                enemy_score = count_2
            else:
                my_score = count_2
                enemy_score = count_1
            f.write(f'{my_score}:{enemy_score}\n')
            f.flush()
            os.fsync(f.fileno())
        return "X000"
        with  open(self.stat_path, 'w', encoding='utf-8') as f:
            if self.player_number == 1:
                my_score = count_1
                enemy_score = count_2
            else:
                my_score = count_2
                enemy_score = count_1
            if my_score > enemy_score:
                f.write('WIN\n')
            elif my_score < enemy_score:
                f.write('LOSE\n')
            else:
                f.write('DRAW\n')
        return "X000"

    def create_action(self, board):
        if self.total_turn == 0:
            hanakamu_weight = 1.0
            enomoto_weight = 1.0
            curr_algo_path = "beginners/beginners/.current_algo.txt"

            # 1. 前回の試合結果を統計に反映
            if os.path.exists(self.history_path) and os.path.getsize(self.history_path) != 0:
                last_algo = "hanakamu"
                if os.path.exists(curr_algo_path):
                    with open(curr_algo_path, 'r') as f:
                        last_algo = f.read().strip()

                with open(self.history_path, 'r') as f:
                    lines = f.readlines()
                    if lines:
                        try:
                            me_str, you_str = lines[-1].strip().split(':')
                            me, you = int(me_str), int(you_str)
                            result = "WIN" if me > you else ("LOSE" if me < you else "DRAW")
                            with open(self.stat_path, 'a') as f_stat:
                                f_stat.write(f"{result}:{last_algo}\n")
                        except: pass

            # 2. アルゴリズムごとの勝率を計算して重みを調整
            if os.path.exists(self.stat_path):
                h_wins, h_games = 0, 0
                e_wins, e_games = 0, 0
                with open(self.stat_path, 'r') as f_stat:
                    for line in f_stat:
                        parts = line.strip().split(':')
                        if len(parts) == 2:
                            res, algo = parts
                            if algo == "hanakamu":
                                h_games += 1
                                if res == "WIN": h_wins += 1
                            elif algo == "enomoto":
                                e_games += 1
                                if res == "WIN": e_wins += 1

                if h_games > 0: hanakamu_weight = max(0.1, h_wins / h_games)
                if e_games > 0: enomoto_weight = max(0.1, e_wins / e_games)

            # 3. アルゴリズムを一度だけ決定
            self.selected_algo = random.choices(["hanakamu", "enomoto"], weights=[hanakamu_weight, enomoto_weight])[0]
            with open(curr_algo_path, 'w') as f:
                f.write(self.selected_algo)

            # 履歴のリセット
            with open(self.history_path, 'w') as f: pass

        if self.selected_algo == "hanakamu":
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
        else:
            if self.total_turn == 0:
                self.total_turn += 1
                if self.player_number == 1:
                    return "R644"
                else:
                    return "R298"
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
