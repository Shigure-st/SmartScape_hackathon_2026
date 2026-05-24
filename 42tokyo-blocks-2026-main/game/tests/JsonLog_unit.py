"""
JsonLog 単体テスト

テストID 一覧:
    A001: プレイヤー情報取得 (Player1)
    A002: プレイヤー情報取得 (Player2)
    A003: moves 追加（通常手）
    A004: pass ログ追加
    A005: end 追加
    B001: ログファイル作成（output()呼び出し後）
    C001: 必須項目チェック（players.id が空）
    C002: 必須項目チェック（players.name が空）
    C003: 必須項目チェック（moves の piece が None）
    D001: 初期化処理実行
    D002: アクション記録実行（first_turn_action 相当）
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
    """テスト用 Player を生成する。WebSocket 接続は MagicMock で代替。"""
    mock_conn = MagicMock()
    return Player(number, f"target_{number}", name, mock_conn)


def make_block(block_type: BlockType, rotation: BlockRotation) -> Block:
    return Block(block_type, rotation)


def make_position(x: int, y: int) -> Position:
    # Position.__init__ で -1 されるため、表示上の座標+1 を渡す
    return Position(x + 1, y + 1)


def make_json_log(p1_name: str = "Alice", p2_name: str = "Tom") -> JsonLog:
    p1 = make_player(1, p1_name)
    p2 = make_player(2, p2_name)
    return JsonLog(p1, p2)


# ------------------------------------------------------------------
# A: データ取得系
# ------------------------------------------------------------------

class TestA001_PlayerInfoP1:
    """A001: プレイヤー情報が正しく保存されること（Player1）"""

    def test_player1_id_is_P1(self):
        log = make_json_log()
        players = log._JsonLog__data["players"]
        assert players[0]["id"] == "P1"

    def test_player1_name_is_Alice(self):
        log = make_json_log()
        players = log._JsonLog__data["players"]
        assert players[0]["name"] == "Alice"


class TestA002_PlayerInfoP2:
    """A002: プレイヤー情報が正しく保存されること（Player1・Player2 両方）"""

    def test_player2_id_is_P2(self):
        log = make_json_log()
        players = log._JsonLog__data["players"]
        assert players[1]["id"] == "P2"

    def test_player2_name_is_Tom(self):
        log = make_json_log()
        players = log._JsonLog__data["players"]
        assert players[1]["name"] == "Tom"

    def test_players_list_has_two_entries(self):
        log = make_json_log()
        players = log._JsonLog__data["players"]
        assert len(players) == 2


class TestA003_AddMove:
    """A003: ターンアクションが正しくログに追加されること"""

    def test_move_is_added_to_moves(self):
        log = make_json_log()
        p1 = make_player(1, "Alice")
        # first_turn の P1 配置: (4,4) はボード上 index=4,4（Position(5,5) で渡す）
        block = make_block(BlockType.A, BlockRotation.Rotation_0)
        pos = make_position(4, 4)
        log.add_move(p1, block, pos)

        moves = log._JsonLog__data["moves"]
        assert len(moves) == 1

    def test_move_turn_is_1(self):
        log = make_json_log()
        p1 = make_player(1, "Alice")
        block = make_block(BlockType.A, BlockRotation.Rotation_0)
        pos = make_position(4, 4)
        log.add_move(p1, block, pos)

        assert log._JsonLog__data["moves"][0]["turn"] == 1

    def test_move_player_is_P1(self):
        log = make_json_log()
        p1 = make_player(1, "Alice")
        block = make_block(BlockType.A, BlockRotation.Rotation_0)
        pos = make_position(4, 4)
        log.add_move(p1, block, pos)

        assert log._JsonLog__data["moves"][0]["player"] == "P1"

    def test_move_piece_is_A(self):
        log = make_json_log()
        p1 = make_player(1, "Alice")
        block = make_block(BlockType.A, BlockRotation.Rotation_0)
        pos = make_position(4, 4)
        log.add_move(p1, block, pos)

        assert log._JsonLog__data["moves"][0]["piece"] == "A"

    def test_move_rotation_flip_is_0(self):
        log = make_json_log()
        p1 = make_player(1, "Alice")
        block = make_block(BlockType.A, BlockRotation.Rotation_0)
        pos = make_position(4, 4)
        log.add_move(p1, block, pos)

        assert log._JsonLog__data["moves"][0]["rotation_flip"] == 0

    def test_move_pos_is_correct(self):
        log = make_json_log()
        p1 = make_player(1, "Alice")
        block = make_block(BlockType.A, BlockRotation.Rotation_0)
        pos = make_position(4, 4)
        log.add_move(p1, block, pos)

        assert log._JsonLog__data["moves"][0]["pos"] == ['5', '5']


class TestA004_AddPass:
    """A004: パスアクションが正しくログへ追加されること"""

    def test_pass_is_added_to_moves(self):
        log = make_json_log()
        p1 = make_player(1, "Alice")
        p2 = make_player(2, "Tom")
        # first_turn を先に通してから turn2 でパス
        block = make_block(BlockType.A, BlockRotation.Rotation_0)
        log.add_move(p1, block, make_position(4, 4))
        log.add_move(p2, block, make_position(9, 9))
        # turn2: P1 アクション後 P2 がパス
        log.add_move(p1, make_block(BlockType.B, BlockRotation.Rotation_0), make_position(4, 6))
        log.add_pass(p2)

        pass_move = log._JsonLog__data["moves"][-1]
        assert pass_move["action"] == "pass"

    def test_pass_player_is_P2(self):
        log = make_json_log()
        p1 = make_player(1, "Alice")
        p2 = make_player(2, "Tom")
        block = make_block(BlockType.A, BlockRotation.Rotation_0)
        log.add_move(p1, block, make_position(4, 4))
        log.add_move(p2, block, make_position(9, 9))
        log.add_move(p1, make_block(BlockType.B, BlockRotation.Rotation_0), make_position(4, 6))
        log.add_pass(p2)

        pass_move = log._JsonLog__data["moves"][-1]
        assert pass_move["player"] == "P2"

    def test_pass_turn_is_2(self):
        log = make_json_log()
        p1 = make_player(1, "Alice")
        p2 = make_player(2, "Tom")
        block = make_block(BlockType.A, BlockRotation.Rotation_0)
        log.add_move(p1, block, make_position(4, 4))
        log.add_move(p2, block, make_position(9, 9))
        log.add_move(p1, make_block(BlockType.B, BlockRotation.Rotation_0), make_position(4, 6))
        log.add_pass(p2)

        pass_move = log._JsonLog__data["moves"][-1]
        assert pass_move["turn"] == 2

    def test_pass_has_no_piece_key(self):
        log = make_json_log()
        p1 = make_player(1, "Alice")
        p2 = make_player(2, "Tom")
        block = make_block(BlockType.A, BlockRotation.Rotation_0)
        log.add_move(p1, block, make_position(4, 4))
        log.add_move(p2, block, make_position(9, 9))
        log.add_move(p1, make_block(BlockType.B, BlockRotation.Rotation_0), make_position(4, 6))
        log.add_pass(p2)

        pass_move = log._JsonLog__data["moves"][-1]
        assert "piece" not in pass_move
        assert "pos" not in pass_move
        assert "rotation_flip" not in pass_move


class TestA005_SetEnd:
    """A005: 終了情報が正しく追加されること"""

    def test_end_reason_is_resign(self):
        log = make_json_log()
        p1 = make_player(1, "Alice")
        log.set_end(FinishedReason.illegal_placement, p1, {"P1": 14, "P2": 17})
        assert log._JsonLog__data["end"]["reason"] == "resign"

    def test_end_winner_is_P1(self):
        log = make_json_log()
        p1 = make_player(1, "Alice")
        log.set_end(FinishedReason.illegal_placement, p1, {"P1": 14, "P2": 17})
        assert log._JsonLog__data["end"]["winner"] == "P1"

    def test_end_score_is_correct(self):
        log = make_json_log()
        p1 = make_player(1, "Alice")
        log.set_end(FinishedReason.illegal_placement, p1, {"P1": 14, "P2": 17})
        assert log._JsonLog__data["end"]["score"] == {"P1": 14, "P2": 17}

    def test_end_winner_is_draw_when_none(self):
        log = make_json_log()
        log.set_end(FinishedReason.normal, None, {"P1": 10, "P2": 10})
        assert log._JsonLog__data["end"]["winner"] == "draw"


# ------------------------------------------------------------------
# B: データ表示系
# ------------------------------------------------------------------

class TestB001_OutputFileCreation:
    """B001: output() 呼び出し後にログファイルが作成されること"""

    def test_file_is_created_after_output(self):
        log = make_json_log()
        with tempfile.TemporaryDirectory() as tmpdir:
            filepath = os.path.join(tmpdir, "test_log.json")
            log.output(filepath)
            assert os.path.exists(filepath)

    def test_output_file_is_valid_json(self):
        log = make_json_log()
        with tempfile.TemporaryDirectory() as tmpdir:
            filepath = os.path.join(tmpdir, "test_log.json")
            log.output(filepath)
            with open(filepath, encoding="utf-8") as f:
                data = json.load(f)
            assert "players" in data
            assert "moves" in data
            assert "end" in data

    def test_output_creates_directory_if_not_exists(self):
        log = make_json_log()
        with tempfile.TemporaryDirectory() as tmpdir:
            filepath = os.path.join(tmpdir, "subdir", "test_log.json")
            log.output(filepath)
            assert os.path.exists(filepath)


# ------------------------------------------------------------------
# C: 入力制限系
# ------------------------------------------------------------------

class TestC001_PlayerIdValidation:
    """C001: player_number が0や負数（不正なid）の場合にエラーとなること"""

    def test_raises_when_p1_number_is_zero(self):
        mock_conn = MagicMock()
        p1 = Player(0, "target", "Alice", mock_conn)
        p2 = Player(2, "target", "Tom", mock_conn)
        with pytest.raises(ValueError):
            JsonLog(p1, p2)

    def test_raises_when_p2_number_is_negative(self):
        mock_conn = MagicMock()
        p1 = Player(1, "target", "Alice", mock_conn)
        p2 = Player(-1, "target", "Tom", mock_conn)
        with pytest.raises(ValueError):
            JsonLog(p1, p2)


class TestC002_PlayerNameValidation:
    """C002: player.name が空の場合にエラーとなること"""

    def test_raises_when_p1_name_is_empty(self):
        mock_conn = MagicMock()
        p1 = Player(1, "target", "", mock_conn)
        p2 = Player(2, "target", "Tom", mock_conn)
        with pytest.raises(ValueError):
            JsonLog(p1, p2)

    def test_raises_when_p2_name_is_empty(self):
        mock_conn = MagicMock()
        p1 = Player(1, "target", "Alice", mock_conn)
        p2 = Player(2, "target", "", mock_conn)
        with pytest.raises(ValueError):
            JsonLog(p1, p2)


class TestC003_MoveTurnValidation:
    """C003: piece が None の場合にエラーとなること"""

    def test_raises_when_block_is_none(self):
        log = make_json_log()
        p1 = make_player(1, "Alice")
        pos = make_position(4, 4)
        with pytest.raises(ValueError):
            log.add_move(p1, None, pos)


# ------------------------------------------------------------------
# D: 操作系
# ------------------------------------------------------------------

class TestD001_Initialization:
    """D001: 初期化処理がエラーなく実行されること"""

    def test_init_succeeds(self):
        log = make_json_log()
        assert log is not None

    def test_init_moves_is_empty(self):
        log = make_json_log()
        assert log._JsonLog__data["moves"] == []

    def test_init_end_is_none(self):
        log = make_json_log()
        assert log._JsonLog__data["end"] is None


class TestD002_FirstTurnAction:
    """D002: first_turn_action 相当のアクション記録処理が正常動作すること

    ルール: P1 の初期配置は (4,4)、P2 の初期配置は (9,9) に限定される。
    """

    def test_first_turn_p1_move_recorded(self):
        log = make_json_log()
        p1 = make_player(1, "Alice")
        block = make_block(BlockType.A, BlockRotation.Rotation_0)
        pos = make_position(4, 4)   # P1 の初期配置ルール準拠
        log.add_move(p1, block, pos)

        moves = log._JsonLog__data["moves"]
        assert len(moves) == 1
        assert moves[0]["turn"] == 1
        assert moves[0]["player"] == "P1"

    def test_first_turn_p2_move_recorded(self):
        log = make_json_log()
        p1 = make_player(1, "Alice")
        p2 = make_player(2, "Tom")
        block = make_block(BlockType.A, BlockRotation.Rotation_0)
        log.add_move(p1, block, make_position(4, 4))   # P1 先手
        log.add_move(p2, block, make_position(9, 9))   # P2 は (9,9) ルール準拠

        moves = log._JsonLog__data["moves"]
        assert len(moves) == 2
        assert moves[1]["turn"] == 1    # 同じターン1
        assert moves[1]["player"] == "P2"

    def test_first_turn_both_moves_are_turn_1(self):
        log = make_json_log()
        p1 = make_player(1, "Alice")
        p2 = make_player(2, "Tom")
        block = make_block(BlockType.A, BlockRotation.Rotation_0)
        log.add_move(p1, block, make_position(4, 4))
        log.add_move(p2, block, make_position(9, 9))

        moves = log._JsonLog__data["moves"]
        assert moves[0]["turn"] == 1
        assert moves[1]["turn"] == 1
