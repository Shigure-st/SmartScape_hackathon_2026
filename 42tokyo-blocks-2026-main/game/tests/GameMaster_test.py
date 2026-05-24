"""
Masterクラスの単体テスト

依存クラスは unittest.mock でモック化する。
非同期テストは pytest-asyncio を使用（pyproject.toml / pytest.ini で
asyncio_mode = "auto" を設定すること）。

テストID採番ルール:
  全テストに通し番号を割り当て（G001〜G038）、種別をサフィックスで示す。
  正常系: GXxx_normal_xxx
  異常系: GXxx_error_xxx
"""
import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from blocks_duo.GameMaster import Master, Turn
from blocks_duo.Player import Player
from blocks_duo.Block import Block
from blocks_duo.BlockType import BlockType
from blocks_duo.BlockRotation import BlockRotation
from blocks_duo.Position import Position
from blocks_duo.Board import Board
from blocks_duo.PlayerFactory import PlayerFactory
from blocks_duo.View import View
from blocks_duo.GameFinishedException import GameFinishedException
from blocks_duo.FinishedReason import FinishedReason
from blocks_duo.JsonLog import JsonLog


# ===========================================================================
# ヘルパー
# ===========================================================================

def make_player_mock(number: int, name: str) -> MagicMock:
    """Player の MagicMock を生成する"""
    p = MagicMock(spec=Player)
    p.player_number = number
    p.player_name = name
    p.target = name
    p.active = True
    p.send_board = AsyncMock()
    p.recv_input = AsyncMock()
    p.use_block = MagicMock()
    return p


def make_master(p1_name="p1", p2_name="p2", mode=""):
    """
    View・Board・BattleRecord をモック化した Master インスタンスを返す。

    Returns:
        (master, view_mock, board_mock, records_mock)
    """
    server = MagicMock()
    loop = asyncio.new_event_loop()
    p1 = make_player_mock(1, p1_name)
    p2 = make_player_mock(2, p2_name)

    with (
        patch("blocks_duo.GameMaster.Board"),
        patch("blocks_duo.GameMaster.View"),
    ):
        master = Master(server, p1, p2, loop, mode)

    view_mock = MagicMock(spec=View)
    view_mock.post_result = AsyncMock()
    view_mock.post_view = AsyncMock()
    view_mock.post_win = AsyncMock()
    master._Master__view = view_mock

    board_mock = MagicMock(spec=Board)
    board_mock.to_print_string.return_value = "board"
    board_mock.get_point.return_value = 0
    master._Master__board = board_mock

    return master, view_mock, board_mock, None


def make_block(block_type=None) -> MagicMock:
    block = MagicMock(spec=Block)
    block.block_type = block_type if block_type is not None else BlockType.A
    return block


def make_position(x=1, y=1) -> MagicMock:
    pos = MagicMock(spec=Position)
    pos.x = x
    pos.y = y
    return pos

def make_json_log_mock() -> MagicMock:
    jl = MagicMock(spec=JsonLog)
    jl.add_move = MagicMock()
    jl.add_pass = MagicMock()
    jl.set_end = MagicMock()
    jl.output = MagicMock()
    return jl

# ---------------------------------------------------------------------------
# テスト本体
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# create_game 正常系
# ---------------------------------------------------------------------------

async def test_G001_normal_create_game_different_targets():
    """異なるターゲット名の場合、指定した名前でPlayerが生成されること"""
    server = MagicMock()
    loop = asyncio.get_running_loop()
    p1_mock = make_player_mock(1, "p1")
    p2_mock = make_player_mock(2, "p2")

    with patch("blocks_duo.GameMaster.PlayerFactory.create", new_callable=AsyncMock) as mock_create:
        mock_create.side_effect = [p1_mock, p2_mock]
        master = await Master.create_game(server, "p1", "p2", loop, "")

    assert master.player1.player_name == "p1"
    assert master.player2.player_name == "p2"


async def test_G002_normal_create_game_same_targets_get_suffix():
    """同名ターゲットの場合、_1 / _2 サフィックスが付与されること"""
    server = MagicMock()
    loop = asyncio.get_running_loop()
    created_names = []

    async def fake_create(srv, num, target, name, lp):
        p = make_player_mock(num, name)
        created_names.append(name)
        return p

    with patch("blocks_duo.GameMaster.PlayerFactory.create", side_effect=fake_create):
        await Master.create_game(server, "bot", "bot", loop, "")

    assert "bot_1" in created_names
    assert "bot_2" in created_names


async def test_G003_normal_create_game_view_mode_stored():
    """mode='view' が Master に保持されること"""
    server = MagicMock()
    loop = asyncio.get_running_loop()
    p1_mock = make_player_mock(1, "p1")
    p2_mock = make_player_mock(2, "p2")

    with patch("blocks_duo.GameMaster.PlayerFactory.create", new_callable=AsyncMock) as mock_create:
        mock_create.side_effect = [p1_mock, p2_mock]
        master = await Master.create_game(server, "p1", "p2", loop, "view")

    assert master.mode == "view"


async def test_G004_normal_create_game_empty_mode_stored():
    """mode='' が Master に保持されること"""
    server = MagicMock()
    loop = asyncio.get_running_loop()
    p1_mock = make_player_mock(1, "p1")
    p2_mock = make_player_mock(2, "p2")

    with patch("blocks_duo.GameMaster.PlayerFactory.create", new_callable=AsyncMock) as mock_create:
        mock_create.side_effect = [p1_mock, p2_mock]
        master = await Master.create_game(server, "p1", "p2", loop, "")

    assert master.mode == ""


# ---------------------------------------------------------------------------
# create_game 異常系
# ---------------------------------------------------------------------------

async def test_G005_error_create_game_raises_timeout_error():
    """PlayerFactory.create がタイムアウトした場合、TimeoutError が伝播すること"""
    with patch(
        "blocks_duo.GameMaster.PlayerFactory.create",
        new_callable=AsyncMock,
        side_effect=asyncio.TimeoutError,
    ):
        with pytest.raises(asyncio.TimeoutError):
            await Master.create_game(MagicMock(), "p1", "p2", asyncio.get_event_loop(), "")


async def test_G006_error_create_game_raises_file_not_found_error():
    """PlayerFactory.create で FileNotFoundError が発生した場合、伝播すること"""
    with patch(
        "blocks_duo.GameMaster.PlayerFactory.create",
        new_callable=AsyncMock,
        side_effect=FileNotFoundError("not found"),
    ):
        with pytest.raises(FileNotFoundError):
            await Master.create_game(MagicMock(), "p1", "p2", asyncio.get_event_loop(), "")


async def test_G007_error_create_game_raises_runtime_error():
    """PlayerFactory.create で RuntimeError（接続失敗等）が発生した場合、伝播すること"""
    with patch(
        "blocks_duo.GameMaster.PlayerFactory.create",
        new_callable=AsyncMock,
        side_effect=RuntimeError("connection failed"),
    ):
        with pytest.raises(RuntimeError):
            await Master.create_game(MagicMock(), "p1", "p2", asyncio.get_event_loop(), "")


# ---------------------------------------------------------------------------
# switch_players 正常系
# ---------------------------------------------------------------------------

async def test_G008_normal_switch_players_swaps_player_positions():
    """switch_players 後、player1 と player2 が入れ替わること"""
    master, _, _, _ = make_master("p1", "p2")

    async def fake_create(srv, num, target, name, lp):
        return make_player_mock(num, name)

    with patch("blocks_duo.GameMaster.PlayerFactory.create", side_effect=fake_create):
        await master.switch_players()

    assert master.player1.player_name == "p2"
    assert master.player2.player_name == "p1"


async def test_G009_normal_switch_players_resets_board():
    """switch_players 後、Board が新しいインスタンスになること"""
    master, _, _, _ = make_master()
    old_board = master.board

    async def fake_create(srv, num, target, name, lp):
        return make_player_mock(num, name)

    with patch("blocks_duo.GameMaster.PlayerFactory.create", side_effect=fake_create):
        await master.switch_players()

    assert master.board is not old_board


async def test_G010_normal_switch_players_resets_turn_to_player1():
    """switch_players 後、ターンが Player1 に戻ること"""
    master, _, _, _ = make_master()
    master._Master__turn = Turn.Player2

    async def fake_create(srv, num, target, name, lp):
        return make_player_mock(num, name)

    with patch("blocks_duo.GameMaster.PlayerFactory.create", side_effect=fake_create):
        await master.switch_players()

    assert master._Master__turn == Turn.Player1


# ---------------------------------------------------------------------------
# get_winner_player / get_winner 正常系
# ---------------------------------------------------------------------------

def test_G011_normal_get_winner_player_p1_wins():
    """P1 のポイントが多い場合、P1 が winner になること"""
    master, _, board_mock, _ = make_master()
    board_mock.get_point.side_effect = (
        lambda p: 10 if p is master.player1 else 5
    )
    assert master.get_winner_player() is master.player1


def test_G012_normal_get_winner_player_p2_wins():
    """P2 のポイントが多い場合、P2 が winner になること"""
    master, _, board_mock, _ = make_master()
    board_mock.get_point.side_effect = (
        lambda p: 3 if p is master.player1 else 7
    )
    assert master.get_winner_player() is master.player2


def test_G013_normal_get_winner_player_draw_returns_none():
    """ポイントが同点の場合、None が返ること"""
    master, _, board_mock, _ = make_master()
    board_mock.get_point.return_value = 5
    assert master.get_winner_player() is None


def test_G014_normal_get_winner_loser_is_p1_returns_p2():
    """loser が P1 の場合、P2 が winner になること"""
    master, _, _, _ = make_master()
    assert master.get_winner(loser=master.player1) is master.player2


def test_G015_normal_get_winner_loser_is_p2_returns_p1():
    """loser が P2 の場合、P1 が winner になること"""
    master, _, _, _ = make_master()
    assert master.get_winner(loser=master.player2) is master.player1


# ---------------------------------------------------------------------------
# print_winner / print_score 正常系
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_G016_normal_print_winner_with_winner(capsys):
    """勝者ありの場合、post_win が呼ばれ player番号を含む勝利メッセージが出力されること"""
    master, view_mock, _, _ = make_master()
    await master.print_winner(master.player1, FinishedReason.normal)
    view_mock.post_win.assert_called_once_with(master.player1, FinishedReason.normal)
    assert "player 1 win" in capsys.readouterr().out
 
 
@pytest.mark.asyncio
async def test_G017_normal_print_winner_with_none_on_draw(capsys):
    """引き分けの場合、post_win が呼ばれ draw が出力されること"""
    master, view_mock, _, _ = make_master()
    await master.print_winner(None, FinishedReason.normal)
    view_mock.post_win.assert_called_once_with(None, FinishedReason.normal)
    assert "draw" in capsys.readouterr().out
 
 
@pytest.mark.asyncio
async def test_G018_normal_print_score_outputs_score(capsys):
    """print_score が post_view を呼び、finished・各プレイヤー名がスコアとともに出力されること"""
    master, view_mock, _, _ = make_master("p1", "p2")
    await master.print_score()
    view_mock.post_view.assert_called_once()
    out = capsys.readouterr().out
    assert "finished." in out
    assert "p1" in out
    assert "p2" in out


# ---------------------------------------------------------------------------
# print_winner 異常系
# ---------------------------------------------------------------------------

async def test_G019_error_print_winner_illegal_placement_reason(capsys):
    """反則負けの場合、post_win に illegal_placement が渡されること"""
    master, view_mock, _, _ = make_master()
    await master.print_winner(master.player2, FinishedReason.illegal_placement)
    view_mock.post_win.assert_called_once_with(master.player2, FinishedReason.illegal_placement)
    assert "相手の反則負け" in capsys.readouterr().out


# ---------------------------------------------------------------------------
# first_turn_action / first_turn 正常系
# ---------------------------------------------------------------------------

async def test_G020_normal_first_turn_action_normal_placement():
    """正常な入力の場合、use_block と try_place_first_block が呼ばれること"""
    master, _, board_mock, _ = make_master()
    json_log_mock = make_json_log_mock()
    block = make_block()
    pos = make_position()
    master.player1.recv_input = AsyncMock(return_value=(block, pos))

    await master.first_turn_action(master.player1, json_log_mock)

    master.player1.use_block.assert_called_once_with(block)
    board_mock.try_place_first_block.assert_called_once_with(master.player1, block, pos)
    json_log_mock.add_move.assert_called_once_with(master.player1, block, pos)


async def test_G021_normal_first_turn_calls_both_players_in_order():
    """first_turn で P1 → P2 の順に first_turn_action が呼ばれること"""
    master, _, _, _ = make_master()
    json_log_mock = make_json_log_mock()
    call_order = []

    async def fake_first_turn_action(player, json_log):
        call_order.append(player.player_name)

    master.first_turn_action = fake_first_turn_action
    master.print_board = AsyncMock()

    await master.first_turn(json_log_mock)

    assert call_order == ["p1", "p2"]


# ---------------------------------------------------------------------------
# first_turn_action 異常系
# ---------------------------------------------------------------------------

async def test_G022_error_first_turn_action_recv_error_raises_game_finished():
    """recv_input が例外を送出した場合、GameFinishedException が発生し相手が winner になること"""
    master, _, _, _ = make_master()
    json_log_mock = make_json_log_mock()
    master.player1.recv_input = AsyncMock(side_effect=Exception("recv error"))

    with pytest.raises(GameFinishedException) as exc_info:
        await master.first_turn_action(master.player1, json_log_mock)

    assert exc_info.value.winner is master.player2
    assert exc_info.value.reason == FinishedReason.illegal_placement


async def test_G023_error_first_turn_action_board_error_raises_game_finished():
    """try_place_first_block が例外を送出した場合も GameFinishedException が発生すること"""
    master, _, board_mock, _ = make_master()
    json_log_mock = make_json_log_mock()
    block = make_block()
    pos = make_position()
    master.player1.recv_input = AsyncMock(return_value=(block, pos))
    board_mock.try_place_first_block.side_effect = Exception("invalid")

    with pytest.raises(GameFinishedException) as exc_info:
        await master.first_turn_action(master.player1, json_log_mock)

    assert exc_info.value.winner is master.player2


# ---------------------------------------------------------------------------
# turn_action 正常系
# ---------------------------------------------------------------------------

async def test_G024_normal_turn_action_skips_inactive_player():
    """active=False のプレイヤーはスキップされること"""
    master, _, board_mock, _ = make_master()
    json_log_mock = make_json_log_mock()
    master.player1.active = False

    await master.turn_action(master.player1, json_log_mock)

    master.player1.send_board.assert_not_called()
    board_mock.try_place_block.assert_not_called()


async def test_G025_normal_turn_action_normal_block_placed():
    """通常ブロックの場合、use_block と try_place_block が呼ばれること"""
    master, _, board_mock, _ = make_master()
    json_log_mock = make_json_log_mock()
    block = make_block(BlockType.A)
    pos = make_position()
    master.player1.recv_input = AsyncMock(return_value=(block, pos))

    await master.turn_action(master.player1, json_log_mock)

    master.player1.use_block.assert_called_once_with(block)
    board_mock.try_place_block.assert_called_once_with(master.player1, block, pos)
    json_log_mock.add_move.assert_called_once_with(master.player1, block, pos)


async def test_G026_normal_turn_action_x_block_deactivates_player():
    """X ブロックを選択した場合、プレイヤーが非アクティブになること"""
    master, _, board_mock, _ = make_master()
    json_log_mock = make_json_log_mock()
    block = make_block(BlockType.X)
    pos = make_position()
    master.player1.recv_input = AsyncMock(return_value=(block, pos))

    await master.turn_action(master.player1, json_log_mock)

    assert master.player1.active is False
    master.player1.use_block.assert_not_called()
    board_mock.try_place_block.assert_not_called()
    json_log_mock.add_pass.assert_called_once_with(master.player1)


# ---------------------------------------------------------------------------
# turn_action 異常系
# ---------------------------------------------------------------------------

async def test_G027_error_turn_action_recv_error_raises_game_finished():
    """recv_input が例外を送出した場合、GameFinishedException が発生し相手が winner になること"""
    master, _, _, _ = make_master()
    json_log_mock = make_json_log_mock()
    master.player1.recv_input = AsyncMock(side_effect=Exception("timeout"))

    with pytest.raises(GameFinishedException) as exc_info:
        await master.turn_action(master.player1, json_log_mock)

    assert exc_info.value.winner is master.player2
    assert exc_info.value.reason == FinishedReason.illegal_placement


async def test_G028_error_turn_action_board_error_raises_game_finished():
    """try_place_block が例外を送出した場合も GameFinishedException が発生すること"""
    master, _, board_mock, _ = make_master()
    json_log_mock = make_json_log_mock()
    block = make_block(BlockType.A)
    pos = make_position()
    master.player1.recv_input = AsyncMock(return_value=(block, pos))
    board_mock.try_place_block.side_effect = Exception("illegal")

    with pytest.raises(GameFinishedException) as exc_info:
        await master.turn_action(master.player1, json_log_mock)

    assert exc_info.value.winner is master.player2


# ---------------------------------------------------------------------------
# start_game 正常系
# ---------------------------------------------------------------------------

async def test_G029_normal_start_game_both_inactive_ends_game():
    """両プレイヤーが inactive の場合、ゲームループが終了すること"""
    master, _, _, _ = make_master()
    master.first_turn = AsyncMock()
    master.print_board = AsyncMock()
    master.print_winner = AsyncMock()
    master.player1.active = False
    master.player2.active = False

    await master.start_game(1)


async def test_G030_normal_start_game_draw_returns_none():
    """引き分けの場合、start_game は None を返すこと"""
    master, _, board_mock, _ = make_master()
    master.first_turn = AsyncMock()
    master.print_board = AsyncMock()
    master.print_winner = AsyncMock()
    master.player1.active = False
    master.player2.active = False
    board_mock.get_point.return_value = 5

    result = await master.start_game(1)

    assert result is None


async def test_G031_normal_start_game_returns_winner_name():
    """P1 が勝利した場合、P1 の名前が返ること"""
    master, _, board_mock, _ = make_master("p1", "p2")
    master.first_turn = AsyncMock()
    master.print_board = AsyncMock()
    master.print_winner = AsyncMock()
    master.player1.active = False
    master.player2.active = False
    board_mock.get_point.side_effect = (
        lambda p: 10 if p is master.player1 else 5
    )

    result = await master.start_game(1)

    assert result == "p1"


async def test_G032_normal_start_game_turn_alternates_between_players():
    """ターンが P1 → P2 の順に切り替わること"""
    master, _, _, _ = make_master()
    master.print_board = AsyncMock()
    master.print_winner = AsyncMock()
    acted_players = []

    async def fake_first_turn(json_log):
        pass

    async def fake_turn_action(player, json_log):
        acted_players.append(player.player_name)
        if len(acted_players) >= 2:
            master.player1.active = False
            master.player2.active = False

    master.first_turn = fake_first_turn
    master.turn_action = fake_turn_action

    await master.start_game(1)

    assert acted_players == ["p1", "p2"]


# ---------------------------------------------------------------------------
# start_game 異常系
# ---------------------------------------------------------------------------

async def test_G033_error_start_game_game_finished_exception_sets_winner():
    """GameFinishedException 発生時、正しい winner が返ること"""
    master, _, _, _ = make_master()

    async def raise_gfe(json_log):
        raise GameFinishedException(master.player1, FinishedReason.illegal_placement)

    master.first_turn = raise_gfe
    master.print_board = AsyncMock()
    master.print_winner = AsyncMock()

    result = await master.start_game(1)

    assert result == master.player1.player_name


# ---------------------------------------------------------------------------
# start_match 正常系
# ---------------------------------------------------------------------------


async def test_G034_normal_start_match_stops_after_3_wins():
    """3勝でマッチが終了すること"""
    master, _, _, _ = make_master("winner", "loser")
    call_count = 0

    async def fake_start_game(round_):
        nonlocal call_count
        call_count += 1
        return "winner"

    master.start_game = fake_start_game
    master.switch_players = AsyncMock()
    master.print_score = AsyncMock()

    with patch("blocks_duo.GameMaster.asyncio.sleep", new_callable=AsyncMock):
        await master.start_match(3)

    assert call_count == 3


async def test_G035_normal_start_match_score_incremented():
    """勝利のたびにスコアが加算されること"""
    master, _, _, _ = make_master("p1", "p2")
    results = iter(["p1", "p1", "p1"])

    async def fake_start_game(round_):
        return next(results)

    master.start_game = fake_start_game
    master.switch_players = AsyncMock()
    master.print_score = AsyncMock()

    with patch("blocks_duo.GameMaster.asyncio.sleep", new_callable=AsyncMock):
        await master.start_match(3)

    assert master._Master__score["p1"] == 3


async def test_G036_normal_start_match_print_score_called_at_end():
    """マッチ終了時に print_score が呼ばれること"""
    master, _, _, _ = make_master("p1", "p2")

    async def fake_start_game(round_):
        return "p1"

    master.start_game = fake_start_game
    master.switch_players = AsyncMock()
    master.print_score = AsyncMock()

    with patch("blocks_duo.GameMaster.asyncio.sleep", new_callable=AsyncMock):
        await master.start_match(3)

    master.print_score.assert_called_once()

@pytest.mark.skip(reason="仕様変更のため不要")
async def test_G037_normal_start_match_max_5_rounds():
    """最大 5 ラウンドを超えないこと"""
    master, _, _, _ = make_master("p1", "p2")
    call_count = 0
    results = iter(["p1", "p2", "p1", "p2", "p1"])

    async def fake_start_game(round_):
        nonlocal call_count
        call_count += 1
        return next(results)

    master.start_game = fake_start_game
    master.switch_players = AsyncMock()
    master.print_score = AsyncMock()

    with patch("blocks_duo.GameMaster.asyncio.sleep", new_callable=AsyncMock):
        await master.start_match()

    assert call_count <= 5


async def test_G038_normal_start_match_doesnot_raise_key_error_when_start_game_returns_none():
    """start_game が None（引き分け）を返した場合、KeyError が発生しないこと

    start_match は winner_name をそのまま __score のキーに使うため、
    引き分け時に None が返ってもKeyError が発生しないことを確認する。
    """
    master, _, _, _ = make_master("p1", "p2")

    async def fake_start_game(round_):
        return None  # 引き分け

    master.start_game = fake_start_game
    master.switch_players = AsyncMock()
    master.print_score = AsyncMock()

    with patch("blocks_duo.GameMaster.asyncio.sleep", new_callable=AsyncMock):
        await master.start_match(3)


 
# ---------------------------------------------------------------------------
# print_board 正常系
# ---------------------------------------------------------------------------
 
@pytest.mark.asyncio
async def test_G039_normal_print_board_outputs_board_string(capsys):
    """print_board がpost_viewを正しい引数で呼び出し、ボードの文字列を出力すること"""
    master, view_mock, board_mock, _ = make_master()
    board_mock.to_print_string.return_value = "board_string"  # 実際は盤面情報が表示される
    await master.print_board()
    view_mock.post_view.assert_called_once_with(
        master.player1, master.player2, board_mock, master._Master__score
    )
    assert "board_string" in capsys.readouterr().out
