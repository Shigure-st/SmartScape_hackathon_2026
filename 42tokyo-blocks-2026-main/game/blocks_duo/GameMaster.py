from __future__ import annotations
import asyncio
import os
import sys
from datetime import datetime
from enum import IntEnum
from typing import Tuple, Optional

from blocks_duo.JsonLog import JsonLog
from blocks_duo.Block import Block
from blocks_duo.BlockType import BlockType
from blocks_duo.Board import Board
from blocks_duo.FinishedReason import FinishedReason
from blocks_duo.GameFinishedException import GameFinishedException
from blocks_duo.Player import Player
from blocks_duo.PlayerFactory import PlayerFactory
from blocks_duo.Position import Position
from blocks_duo.View import View
from blocks_duo.WebsocketServer import WebsocketServer

TIMEOUT_SEC = 10


class Turn(IntEnum):
    Player1 = 1
    Player2 = 2


class Master:
    def __init__(self, server: WebsocketServer, p1: Player, p2: Player, loop: asyncio.AbstractEventLoop, mode: str):
        self.__server = server
        self.__loop = loop
        self.__p1 = p1
        self.__p2 = p2
        self.__turn = Turn.Player1
        self.__board = Board()
        self.__mode = mode
        self.__score = {p1.player_name: 0, p2.player_name: 0}
        if mode == 'view':
            self.__view = View('http://localhost:8000/api')
        else:
            self.__view = View('')

    @property
    def player1(self) -> Player:
        return self.__p1

    @property
    def player2(self) -> Player:
        return self.__p2

    @property
    def board(self) -> Board:
        return self.__board
    
    @property
    def mode(self) -> str:
        return self.__mode

    @staticmethod
    async def create_game(server: WebsocketServer, p1_target: str, p2_target: str,
                          loop: asyncio.AbstractEventLoop, mode: str) -> Master:
        p1_name = p1_target
        p2_name = p2_target
        if p1_target == p2_target:
            p1_name += "_1"
            p2_name += "_2"

        p1 = await PlayerFactory.create(server, 1, p1_target, p1_name, loop)
        p2 = await PlayerFactory.create(server, 2, p2_target, p2_name, loop)
        return Master(server, p1, p2, loop, mode)

    async def switch_players(self):
        p1, p2 = (self.player2, self.player1)
        self.__p1 = await PlayerFactory.create(self.__server, 1, p1.target, p1.player_name, self.__loop)
        self.__p2 = await PlayerFactory.create(self.__server, 2, p2.target, p2.player_name, self.__loop)
        self.__board = Board()
        self.__turn = Turn.Player1

    async def start_match(self, num_of_matches: int):
        round_ = 1
        while round_ <= num_of_matches:
            print(f'start round {round_}')
            winner_name = await self.start_game(round_)

            if winner_name is not None:
                self.__score[winner_name] += 1
            if round_ == num_of_matches:
                break
            await self.switch_players()
            await asyncio.sleep(5)
            round_ += 1
        await self.print_score()

    async def start_game(self, round_: int) -> Optional[str]:
        winner: Optional[Player] = None
        finished_reason = FinishedReason.normal
        json_log = JsonLog(self.__p1, self.__p2)
        try:
            turn = 1
            print(f'turn {turn}.')
            # init view
            await self.__view.post_result('')
            await self.print_board()

            await self.first_turn(json_log)
            await self.print_board()

            while True:
                if not self.__p1.active and not self.__p2.active:
                    break

                turn += 1
                current_player = self.__p1 if self.__turn == Turn.Player1 else self.__p2

                print(f'turn {turn}.')
                print(f'player {current_player.player_number} action')

                await self.turn_action(current_player, json_log)
                await self.print_board()

                self.__turn = Turn.Player1 if self.__turn == Turn.Player2 else Turn.Player2

            winner = self.get_winner_player()
        except GameFinishedException as e:
            await self.print_board()
            winner = e.winner
            finished_reason = e.reason
        except Exception as e:
            print(f"原因不明のエラーによりプログラムが終了しました。: {e}")
            exit(1)  # TODO: クリーンナップ処理を将来的に実装

        await self.print_winner(winner, finished_reason)
        score = {
            f'P{self.__p1.player_number}': self.__board.get_point(self.__p1),
            f'P{self.__p2.player_number}': self.__board.get_point(self.__p2),
        }
        json_log.set_end(finished_reason, winner, score)
        json_log.output(self.json_log_file_name(round_))
        return winner.player_name if winner is not None else None

    async def first_turn(self, json_log: JsonLog):
        await self.first_turn_action(self.player1, json_log)
        await self.print_board()
        await self.first_turn_action(self.player2, json_log)

    async def first_turn_action(self, player: Player, json_log: JsonLog):
        async def action() -> Tuple[Block, Position]:
            await player.send_board(self.board)
            return await player.recv_input()

        try:
            block, position = await asyncio.wait_for(action(), TIMEOUT_SEC)
            player.use_block(block)
            self.board.try_place_first_block(player, block, position)
            json_log.add_move(player, block, position)

        except Exception as e:
            print(e)
            raise GameFinishedException(self.get_winner(loser=player), FinishedReason.illegal_placement)

    async def turn_action(self, player: Player, json_log: JsonLog):
        if not player.active:
            return

        async def action() -> Tuple[Block, Position]:
            await player.send_board(self.board)
            return await player.recv_input()

        try:
            block, position = await asyncio.wait_for(action(), TIMEOUT_SEC)
            print(block.block_type)
            print(position.x)
            print(position.y)
            if not block.block_type == BlockType.X:
                player.use_block(block)
                self.board.try_place_block(player, block, position)
                json_log.add_move(player, block, position)
            else:
                json_log.add_pass(player)
                player.active = False
        except Exception as e:
            print(e)
            raise GameFinishedException(self.get_winner(loser=player), FinishedReason.illegal_placement)

    def get_winner(self, loser: Optional[Player]):
        if loser:
            return self.player1 if loser.player_number == 2 else self.player2
        else:
            return self.get_winner_player()
    
    def get_winner_player(self) -> Optional[Player]:
        p1_point = self.board.get_point(self.player1)
        p2_point = self.board.get_point(self.player2)
        if p1_point == p2_point:
            return None
        elif p1_point > p2_point:
            return self.player1
        else:
            return self.player2

    async def print_board(self):
        print(self.board.to_print_string())
        await self.__view.post_view(self.player1, self.player2, self.board, self.__score)

    async def print_score(self):
        print(f'\n-----------\n')
        print(f'finished.')
        print(f'score')
        for name in self.__score:
            print(f'{name}: {self.__score[name]}')
         # 最大スコア取得
        max_score = max(self.__score.values())

        # 最大スコアのプレイヤー一覧
        winners = [name for name, score in self.__score.items() if score == max_score]

        # 勝者 or ドロー判定
        if len(winners) == 1:
            print(f'Game Winner: {winners[0]}')
        else:
            print('Draw')
        await self.__view.post_view(self.player1, self.player2, self.board, self.__score)

    async def print_winner(self, winner: Optional[Player], finished_reason: FinishedReason):
        if winner is None:
            print('draw')
        else:
            print(f'player {winner.player_number} win '
                  f'{"（相手の反則負け）" if finished_reason == FinishedReason.illegal_placement else ""}.')

        await self.__view.post_win(winner, finished_reason)

    def log_file_name(self, round_: int) -> str:
        return '_'.join([name for name in self.__score]) + f'_{round_}.log'

    def json_log_file_name(self, round_: int) -> str:
        log_dir = 'log'
        os.makedirs(log_dir, exist_ok=True)
        p1 = self.__p1.player_name[:10]
        p2 = self.__p2.player_name[:10]
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        return os.path.join(log_dir, f'{timestamp}_{p1}_{p2}_{round_}.json')


from enum import Enum

# コマンドライン引数のインデックス
# Enumにすると数値として扱われない
class e_ARGV(IntEnum):
    PLAYER_ONE_NAME = 1
    PLAYER_TWO_NAME = 2
    NUM_OF_MATCHES = 3
    MODE = 4

# コマンドライン引数の最大個数
MAX_NUM_OF_ARGV = 5

# コマンドライン引数の最低個数
MIN_NUM_OF_ARGV = 4

# 失敗コード
EXIT_FAILURE = 1

# Usage メッセージ
USAGE_MESSAGE = "Usage: start_blocksduo <player 1 name> <player 2 name> <number of matches> [mode]"


MIN_NUM_OF_MATCHES = 1
MAX_NUM_OF_MATCHES = 49

#対戦回数のバリデーションエラーメッセージの先頭文字列
NUM_OF_MATCHES_VALID_ERR_MSG="対戦回数指定: バリデーションエラー: "

class e_NUM_OF_MATCHES_VALID_ERR_MSG(Enum):
    EMPTY=NUM_OF_MATCHES_VALID_ERR_MSG + "空文字は無効です"
    FLOAT=NUM_OF_MATCHES_VALID_ERR_MSG + "小数は無効です"
    NOT_NUM=NUM_OF_MATCHES_VALID_ERR_MSG + "数値以外の入力は無効です"
    MINUS=NUM_OF_MATCHES_VALID_ERR_MSG + "負数は無効です"
    UNDER_MIN=NUM_OF_MATCHES_VALID_ERR_MSG + f"{MIN_NUM_OF_MATCHES}未満は無効です"
    OVER_MAX=NUM_OF_MATCHES_VALID_ERR_MSG + f"{MAX_NUM_OF_MATCHES}超過は無効です"
    EVEN_NUM=NUM_OF_MATCHES_VALID_ERR_MSG + "偶数は無効です"
   

def validate_num_of_matches(num_of_matches_str: str):

    # 空文字のバリデーション
    if num_of_matches_str == "":
        print(e_NUM_OF_MATCHES_VALID_ERR_MSG.EMPTY.value)
        sys.exit(EXIT_FAILURE)
    
    try:
        #小数点が含まれている場合
        if '.' in num_of_matches_str:
            #小数点として変換できるか
            float(num_of_matches_str)
            print(e_NUM_OF_MATCHES_VALID_ERR_MSG.FLOAT.value)
            sys.exit(EXIT_FAILURE)
        #整数として変換できるか
        num = int(num_of_matches_str)
    except Exception: # Exceptionで書かないとsys.exit(EXIT_FAILURE)をcatchしてしまう
        print(e_NUM_OF_MATCHES_VALID_ERR_MSG.NOT_NUM.value)
        sys.exit(EXIT_FAILURE)

    # 負数バリデーション
    if num < 0:
        print(e_NUM_OF_MATCHES_VALID_ERR_MSG.MINUS.value)
        sys.exit(EXIT_FAILURE)
    
    # 下限バリデーション
    if num < MIN_NUM_OF_MATCHES:
        print(e_NUM_OF_MATCHES_VALID_ERR_MSG.UNDER_MIN.value)
        sys.exit(EXIT_FAILURE)
    
    # 上限バリデーション
    if MAX_NUM_OF_MATCHES < num:
        print(e_NUM_OF_MATCHES_VALID_ERR_MSG.OVER_MAX.value)
        sys.exit(EXIT_FAILURE)
    
    # 偶数バリデーション
    # if num % 2 == 0:
    #     print(e_NUM_OF_MATCHES_VALID_ERR_MSG.EVEN_NUM.value)
    #     sys.exit(EXIT_FAILURE)

def main():

    if len(sys.argv) < MIN_NUM_OF_ARGV:
        print(USAGE_MESSAGE)
        sys.exit(EXIT_FAILURE)
    elif MAX_NUM_OF_ARGV < len(sys.argv):
        print(USAGE_MESSAGE)
        sys.exit(EXIT_FAILURE)
    player1_name: str = sys.argv[e_ARGV.PLAYER_ONE_NAME]
    player2_name: str = sys.argv[e_ARGV.PLAYER_TWO_NAME]
    num_of_matches_str: str = sys.argv[e_ARGV.NUM_OF_MATCHES]
    # 対戦回数のバリデーション
    validate_num_of_matches(num_of_matches_str)
    num_of_matches: int = int(num_of_matches_str)

    mode = ""
    if len(sys.argv) == MAX_NUM_OF_ARGV:
        mode = sys.argv[e_ARGV.MODE]

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    server = WebsocketServer(loop)

    loop.run_until_complete(server.start())
    try:
        master = loop.run_until_complete(Master.create_game(server, player1_name, player2_name, loop, mode))
        loop.run_until_complete(master.start_match(num_of_matches))
    except SystemExit:
        print('game close')
    except Exception as e:
        print(e)

    finally:
        server.stop()
        loop.stop()


if __name__ == '__main__':
    sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
    main()
