"""
JsonLog 結合テスト

テストID 一覧:
    F001: 初期化時ログファイル生成
    F002: ログインスタンス生成
    F003: プレイヤー情報保存
    F004: first_turn_action 記録
    F005: turn_action 記録
    F006: スコア記録
    F007: 勝者記録
    F008: ログファイル書き出し
    F101: プレイヤー情報不整合
    F102: moves 排他制約違反
    F103: pos 不正値
    F104: ターン番号不整合
    F105: スコア不正値
    F106: 終了情報不整合
    F107: ログファイル出力失敗
"""

import json
import os
import tempfile
from unittest.mock import MagicMock

import pytest

from blocks_duo.Block import Block
from blocks_duo.BlockRotation import BlockRotation
from blocks_duo.BlockType import BlockType
from blocks_duo.FinishedReason import FinishedReason
from blocks_duo.JsonLog import JsonLog
from blocks_duo.Player import Player
from blocks_duo.Position import Position


# ------------------------------------------------------------------
# ヘルパー
# ------------------------------------------------------------------

def make_player(number: int, name: str) -> Player:
    mock_conn = MagicMock()
    return Player(number, f"target_{number}", name, mock_conn)


def make_block(block_type: BlockType, rotation: BlockRotation) -> Block:
    return Block(block_type, rotation)


def make_position(x: int, y: int) -> Position:
    return Position(x + 1, y + 1)


def make_json_log(p1_name: str = "Alice", p2_name: str = "Tom") -> JsonLog:
    p1 = make_player(1, p1_name)
    p2 = make_player(2, p2_name)
    return JsonLog(p1, p2)


def do_first_turn(log: JsonLog, p1: Player, p2: Player):
    """first_turn_action 相当: P1→P2 の順で初手を記録する。"""
    log.add_move(p1, make_block(BlockType.A, BlockRotation.Rotation_0), make_position(4, 4))
    log.add_move(p2, make_block(BlockType.A, BlockRotation.Rotation_0), make_position(9, 9))


# ------------------------------------------------------------------
# F: 結合（正常系）
# ------------------------------------------------------------------

class TestF001_LogFileCreation:
    """F001: output()呼び出し後にログファイルが生成されること"""

    def test_log_file_is_created(self):
        log = make_json_log()
        with tempfile.TemporaryDirectory() as tmpdir:
            filepath = os.path.join(tmpdir, "game.json")
            log.output(filepath)
            assert os.path.exists(filepath)


class TestF002_LogInstanceCreation:
    """F002: 初期化後にログ用インスタンスが生成されること"""

    def test_instance_is_created(self):
        log = make_json_log()
        assert log is not None

    def test_instance_has_empty_moves(self):
        log = make_json_log()
        assert log._JsonLog__data["moves"] == []


class TestF003_PlayerInfoSaved:
    """F003: プレイヤー接続時に players 配列へ追加されること"""

    def test_two_players_are_registered(self):
        log = make_json_log(p1_name="Alice", p2_name="Tom")
        players = log._JsonLog__data["players"]
        assert len(players) == 2

    def test_p1_info_is_correct(self):
        log = make_json_log(p1_name="Alice", p2_name="Tom")
        players = log._JsonLog__data["players"]
        assert players[0] == {"id": "P1", "name": "Alice"}

    def test_p2_info_is_correct(self):
        log = make_json_log(p1_name="Alice", p2_name="Tom")
        players = log._JsonLog__data["players"]
        assert players[1] == {"id": "P2", "name": "Tom"}


class TestF004_FirstTurnActionRecorded:
    """F004: 初手アクションが moves へ記録されること"""

    def test_first_move_is_recorded(self):
        log = make_json_log()
        p1 = make_player(1, "Alice")
        p2 = make_player(2, "Tom")
        do_first_turn(log, p1, p2)

        moves = log._JsonLog__data["moves"]
        assert moves[0] == {
            "turn": 1,
            "player": "P1",
            "piece": "A",
            "rotation_flip": 0,
            "pos": ['5', '5'],
        }


class TestF005_TurnActionRecorded:
    """F005: 2ターン目以降のアクションが moves へ記録されること"""

    def test_second_turn_move_is_recorded(self):
        log = make_json_log()
        p1 = make_player(1, "Alice")
        p2 = make_player(2, "Tom")
        do_first_turn(log, p1, p2)

        log.add_move(p1, make_block(BlockType.C, BlockRotation.Rotation_0), make_position(4, 6))
        log.add_move(p2, make_block(BlockType.B, BlockRotation.Rotation_1), make_position(11, 11))

        last_move = log._JsonLog__data["moves"][-1]
        assert last_move["turn"] == 2
        assert last_move["player"] == "P2"
        assert last_move["piece"] == "B"
        assert last_move["rotation_flip"] == 1


class TestF006_ScoreRecorded:
    """F006: set_end() 実行で end.score が正しく格納されること"""

    def test_score_is_stored_correctly(self):
        log = make_json_log()
        p1 = make_player(1, "Alice")
        log.set_end(FinishedReason.normal, p1, {"P1": 14, "P2": 17})
        assert log._JsonLog__data["end"]["score"] == {"P1": 14, "P2": 17}


class TestF007_WinnerRecorded:
    """F007: set_end() 実行で end.winner が正しく格納されること"""

    def test_winner_is_P1(self):
        log = make_json_log()
        p1 = make_player(1, "Alice")
        log.set_end(FinishedReason.illegal_placement, p1, {"P1": 14, "P2": 17})
        assert log._JsonLog__data["end"]["winner"] == "P1"

    def test_reason_is_resign(self):
        log = make_json_log()
        p1 = make_player(1, "Alice")
        log.set_end(FinishedReason.illegal_placement, p1, {"P1": 14, "P2": 17})
        assert log._JsonLog__data["end"]["reason"] == "resign"


class TestF008_LogFileWritten:
    """F008: 終了処理でログデータがシリアライズされファイルに書き込まれること"""

    def test_output_contains_all_sections(self):
        log = make_json_log()
        p1 = make_player(1, "Alice")
        p2 = make_player(2, "Tom")
        do_first_turn(log, p1, p2)
        log.set_end(FinishedReason.normal, p1, {"P1": 14, "P2": 17})

        with tempfile.TemporaryDirectory() as tmpdir:
            filepath = os.path.join(tmpdir, "game.json")
            log.output(filepath)
            with open(filepath, encoding="utf-8") as f:
                data = json.load(f)

        assert data["players"][0]["id"] == "P1"
        assert len(data["moves"]) == 2
        assert data["end"]["winner"] == "P1"
        assert data["end"]["score"] == {"P1": 14, "P2": 17}


# ------------------------------------------------------------------
# F1xx: 結合（異常系）
# ------------------------------------------------------------------

class TestF101_UnknownPlayerAction:
    """F101: 未登録プレイヤーIDでアクション記録した場合にエラーとなること"""

    def test_add_move_raises_with_unknown_player(self):
        log = make_json_log()
        unknown = make_player(9, "Ghost")
        block = make_block(BlockType.A, BlockRotation.Rotation_0)
        with pytest.raises(ValueError):
            log.add_move(unknown, block, make_position(4, 4))

    def test_add_pass_raises_with_unknown_player(self):
        log = make_json_log()
        unknown = make_player(9, "Ghost")
        with pytest.raises(ValueError):
            log.add_pass(unknown)


class TestF102_PieceAndActionExclusive:
    """F102: BlockType.X を add_move に渡した場合にエラーとなること"""

    def test_add_move_raises_with_blocktype_x(self):
        log = make_json_log()
        p1 = make_player(1, "Alice")
        block_x = make_block(BlockType.X, BlockRotation.Rotation_0)
        with pytest.raises(ValueError):
            log.add_move(p1, block_x, make_position(4, 4))


class TestF103_InvalidPos:
    """F103: pos に不正な座標が渡された場合にエラーとなること"""

    def test_raises_with_negative_x(self):
        log = make_json_log()
        p1 = make_player(1, "Alice")
        block = make_block(BlockType.A, BlockRotation.Rotation_0)
        # Position(0, y) は内部で x=-1 になる（Position.__init__で-1される）
        with pytest.raises(ValueError):
            log.add_move(p1, block, Position(0, 5))

    def test_raises_with_out_of_range_y(self):
        log = make_json_log()
        p1 = make_player(1, "Alice")
        block = make_block(BlockType.A, BlockRotation.Rotation_0)
        # Position(x, 100) は内部で y=99 になる
        with pytest.raises(ValueError):
            log.add_move(p1, block, Position(5, 100))


class TestF104_TurnOrderViolation:
    """F104: ターン番号が単調増加していることを確認

    Note: ターンは JsonLog 内部で自動管理されるため外部から過去ターンを
          直接指定する手段はない。ターンが正しく単調増加することを確認する。
    """

    def test_turn_increments_correctly_after_two_rounds(self):
        log = make_json_log()
        p1 = make_player(1, "Alice")
        p2 = make_player(2, "Tom")
        do_first_turn(log, p1, p2)
        log.add_move(p1, make_block(BlockType.B, BlockRotation.Rotation_0), make_position(4, 6))
        log.add_move(p2, make_block(BlockType.C, BlockRotation.Rotation_0), make_position(9, 7))

        turns = [m["turn"] for m in log._JsonLog__data["moves"]]
        assert turns == sorted(turns)
        assert turns[-1] == 2


class TestF105_InvalidScore:
    """F105: スコアが数値でない場合にエラーとなること"""

    def test_raises_when_score_value_is_string(self):
        log = make_json_log()
        p1 = make_player(1, "Alice")
        with pytest.raises(ValueError):
            log.set_end(FinishedReason.normal, p1, {"P1": "abc", "P2": 17})


class TestF106_UnknownWinner:
    """F106: winner が players に存在しない場合にエラーとなること"""

    def test_raises_when_winner_is_unknown_player(self):
        log = make_json_log()
        unknown = make_player(9, "Ghost")
        with pytest.raises(ValueError):
            log.set_end(FinishedReason.normal, unknown, {"P1": 10, "P2": 8})


class TestF107_OutputFileWriteFailure:
    """F107: ファイル書き込み不可状態の場合にエラーとなること"""

    def test_raises_when_output_path_is_readonly(self):
        log = make_json_log()
        with tempfile.TemporaryDirectory() as tmpdir:
            filepath = os.path.join(tmpdir, "readonly.json")
            with open(filepath, "w") as f:
                f.write("{}")
            os.chmod(filepath, 0o444)
            with pytest.raises(Exception):
                log.output(filepath)
            os.chmod(filepath, 0o644)
