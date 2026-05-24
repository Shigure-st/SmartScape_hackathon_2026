from __future__ import annotations

import json
import os
from typing import Optional

from blocks_duo.FinishedReason import FinishedReason
from blocks_duo.Player import Player
from blocks_duo.Block import Block
from blocks_duo.BlockType import BlockType
from blocks_duo.Position import Position


def _player_id(player: Player) -> str:
    """player_number (1 or 2) を設計書のID文字列 "P1" / "P2" に変換する。"""
    return f"P{player.player_number}"


class JsonLog:
    """
    ゲーム進行の JSON ログを管理するクラス。

    出力される JSON の構造（設計書 3.1 準拠）:
    {
        "players": [
            {"id": "P1", "name": "..."},
            {"id": "P2", "name": "..."}
        ],
        "moves": [
            # 通常手
            {"turn": 1, "player": "P1", "piece": "A", "rotation_flip": 0, "pos": [4, 4]},
            # パス
            {"turn": 1, "player": "P2", "action": "pass"}
        ],
        "end": {
            "reason": "normal" | "resign",
            "winner": "P1" | "P2" | "draw",
            "score": {"P1": 14, "P2": 17}
        }
    }

    ターンの数え方（設計書の変更点）:
        両プレイヤーが 1 回ずつアクションする単位を 1 ターンとする。
        - P1 の first_turn_action → turn 1
        - P2 の first_turn_action → turn 1  （同じターン番号）
        - 以降、P1 turn_action → turn 2、P2 turn_action → turn 2、と交互に増加。

    GameMaster.py からの呼び出し順:
        1. JsonLog(p1, p2)              : ゲーム開始時にインスタンス生成
        2. add_move(player, block, pos) : first_turn_action / turn_action で配置を記録
        3. add_pass(player)             : turn_action でパス(BlockType.X)を記録
        4. set_end(reason, winner, score): print_score / print_winner 後に終了情報を記録
        5. output(filepath)             : JSON ファイルとして書き出し
    """

    def __init__(self, player1: Player, player2: Player):
        # C001: player_number が正の整数であること（0や負数はidとして不正）
        if player1.player_number <= 0 or player2.player_number <= 0:
            raise ValueError("player_number must be a positive integer.")
        # C002: name が空でないことを確認
        if not player1.player_name or not player2.player_name:
            raise ValueError("player name must not be empty.")

        self.__data: dict = {
            "players": [
                {"id": _player_id(player1), "name": player1.player_name},
                {"id": _player_id(player2), "name": player2.player_name},
            ],
            "moves": [],
            "end": None,
        }
        self.__p1_number: int = player1.player_number
        self.__p2_number: int = player2.player_number
        self.__current_turn: int = 1
        self.__passed_players: set[int] = set()   # パス済み player_number の集合
        self.__pending_advance: bool = False       # 次回呼び出し時にターンを +1 するフラグ

    # ------------------------------------------------------------------
    # 内部ユーティリティ
    # ------------------------------------------------------------------

    def __is_last_mover(self, player_number: int) -> bool:
        """
        現在の passed_players の状態で、player_number が last_mover かどうかを返す。
        last_mover = アクティブなプレイヤーのうち P2 側（P2 パス済みなら P1）。
        """
        active = {self.__p1_number, self.__p2_number} - self.__passed_players
        last = self.__p2_number if self.__p2_number in active else self.__p1_number
        return player_number == last

    def __get_turn(self, is_turn_end: bool) -> int:
        """
        アクションを記録するターン番号を返す。
        前のターン終了フラグが立っていれば先にターンを進める。
        is_turn_end=True のとき、次回呼び出し時にターンを +1 するフラグを立てる。
        """
        if self.__pending_advance:
            self.__current_turn += 1
            self.__pending_advance = False

        current = self.__current_turn

        if is_turn_end:
            self.__pending_advance = True

        return current

    # ------------------------------------------------------------------
    # 公開インタフェース
    # ------------------------------------------------------------------

    def add_move(self, player: Player, block: Block, position: Position):
        """
        通常手（ピース配置）を記録する。
        現在の passed_players の状態で last_mover かどうかを判定し、
        ターン終了フラグを決める。
        """
        # C003/F102: piece が未設定（None）、またはBlockType.X（パス専用）でないことを確認
        if block is None or block.block_type is None:
            raise ValueError("block (piece) must not be None.")
        if block.block_type == BlockType.X:
            raise ValueError("BlockType.X is reserved for pass. Use add_pass() instead.")
        # F101: player_number が登録済みの P1/P2 であることを確認
        if player.player_number not in {self.__p1_number, self.__p2_number}:
            raise ValueError(f"Unknown player_number: {player.player_number}")
        # F103: pos が盤面範囲内（0〜13）であることを確認
        board_size = 14
        if not (0 <= position.x < board_size and 0 <= position.y < board_size):
            raise ValueError(f"pos out of range: ({position.x}, {position.y})")

        row_ids = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E']  # TODO: メンバ変数に移動
        turn = self.__get_turn(is_turn_end=self.__is_last_mover(player.player_number))
        move = {
            "turn": turn,
            "player": _player_id(player),
            "piece": block.block_type.value,
            "rotation_flip": block.rotation,
            "pos": [row_ids[position.x], row_ids[position.y]],
        }
        self.__data["moves"].append(move)

    def add_pass(self, player: Player):
        """
        パス（BlockType.X）を記録する。
        piece / rotation_flip / pos は設計書の排他条件により含めない。
        """
        # F101: player_number が登録済みの P1/P2 であることを確認
        if player.player_number not in {self.__p1_number, self.__p2_number}:
            raise ValueError(f"Unknown player_number: {player.player_number}")
        is_turn_end = self.__is_last_mover(player.player_number)
        self.__passed_players.add(player.player_number)
        turn = self.__get_turn(is_turn_end=is_turn_end)
        move = {
            "turn": turn,
            "player": _player_id(player),
            "action": "pass",
        }
        self.__data["moves"].append(move)

    def set_end(
        self,
        finished_reason: FinishedReason,
        winner: Optional[Player],
        score: dict[str, int],
    ):
        """
        ゲーム終了情報を記録する。
        """
        # F105: score の値が整数であることを確認
        for key, val in score.items():
            if not isinstance(val, int):
                raise ValueError(f"score value must be int, got {type(val).__name__} for key '{key}'.")
        # F106: winner が登録済みの P1/P2 または None（draw）であることを確認
        if winner is not None and winner.player_number not in {self.__p1_number, self.__p2_number}:
            raise ValueError(f"Unknown winner player_number: {winner.player_number}")

        if winner is None:
            winner_id = "draw"
        else:
            winner_id = _player_id(winner)

        # FinishedReason → 設計書の reason 文字列へ変換
        reason_map = {
            FinishedReason.normal: "normal",
            FinishedReason.illegal_placement: "resign",
        }
        reason_str = reason_map.get(finished_reason, finished_reason.name)

        self.__data["end"] = {
            "reason": reason_str,
            "winner": winner_id,
            "score": score,          # {"P1": 14, "P2": 17}
        }

    def output(self, filepath: str):
        """
        JSON ファイルとして書き出す。
        ディレクトリが存在しない場合は自動生成する。
        """
        dir_name = os.path.dirname(filepath)
        if dir_name:
            os.makedirs(dir_name, exist_ok=True)

        with open(filepath, mode="w", encoding="utf-8") as fp:
            json.dump(self.__data, fp, ensure_ascii=False, indent=2)
