import sys

from .utils import assert_normal_with_output
from .utils import run_command

PLAYER_1_NAME = "ss_tarou"
PLAYER_2_NAME = PLAYER_1_NAME

SOURCE_FILE = "./game/blocks_duo/GameMaster.py"


def x_run_command(test_name, args):
    return run_command(
        [sys.executable, SOURCE_FILE] + args,
        test_name
    )


# -------------------
# 正常系
# -------------------

def test_A001_B001_B002_D001_E002_normal():
    match_count = 3
    result = x_run_command(
        "A001_B001_B002_D001_E002_normal",
        [PLAYER_1_NAME, PLAYER_2_NAME, str(match_count)]
    )
    assert_normal_with_output(
        "A001",
        result,
        match_count
    )


def test_C001_normal_min():
    match_count = 1
    result = x_run_command(
        "C001",
        [PLAYER_1_NAME, PLAYER_2_NAME, str(match_count)]
    )
    assert_normal_with_output(
        "C001",
        result,
        match_count
    )


def test_C002_normal_max_performance():
    match_count = 49
    result = x_run_command(
        "C002",
        [PLAYER_1_NAME, PLAYER_2_NAME, str(match_count)]
    )
    assert_normal_with_output(
        "C002",
        result,
        match_count
    )


def test_E003_draw():
    match_count = 4
    result = x_run_command(
        "E003",
        [PLAYER_1_NAME, PLAYER_2_NAME, str(match_count)]
    )
    assert_normal_with_output(
        "E003",
        result,
        match_count
    )


# -------------------
# 異常系
# -------------------

def test_A002_no_argument():
    result = x_run_command(
        "A002_no_argument",
        [PLAYER_1_NAME, PLAYER_2_NAME]
    )
    expected = "Usage: start_blocksduo <player 1 name> <player 2 name> <number of matches> [mode]"
    assert result.stdout.strip() == expected


def test_C003_less_than_min():
    result = x_run_command(
        "C003_less_than_min",
        [PLAYER_1_NAME, PLAYER_2_NAME, "0"]
    )
    expected = "対戦回数指定: バリデーションエラー: 1未満は無効です"
    assert result.stdout.strip() == expected


def test_C004_over_max():
    result = x_run_command(
        "C004_over_max",
        [PLAYER_1_NAME, PLAYER_2_NAME, "51"]
    )
    expected = "対戦回数指定: バリデーションエラー: 49超過は無効です"
    assert result.stdout.strip() == expected


def test_C005_negative():
    result = x_run_command(
        "C005_negative",
        [PLAYER_1_NAME, PLAYER_2_NAME, "-1"]
    )
    expected = "対戦回数指定: バリデーションエラー: 負数は無効です"
    assert result.stdout.strip() == expected


def test_C006_float():
    result = x_run_command(
        "C006_float",
        [PLAYER_1_NAME, PLAYER_2_NAME, "1.5"]
    )
    expected = "対戦回数指定: バリデーションエラー: 小数は無効です"
    assert result.stdout.strip() == expected


def test_C007_string():
    result = x_run_command(
        "C007_string",
        [PLAYER_1_NAME, PLAYER_2_NAME, "abc"]
    )
    expected = "対戦回数指定: バリデーションエラー: 数値以外の入力は無効です"
    assert result.stdout.strip() == expected


def test_C009_empty_string():
    result = x_run_command(
        "C009_empty_string",
        [PLAYER_1_NAME, PLAYER_2_NAME, ""]
    )
    expected = "対戦回数指定: バリデーションエラー: 空文字は無効です"
    assert result.stdout.strip() == expected


def test_C010_multiple_args():
    result = x_run_command(
        "C010_multiple_args",
        [PLAYER_1_NAME, PLAYER_2_NAME, "5", "10", "view"]
    )
    expected = "Usage: start_blocksduo <player 1 name> <player 2 name> <number of matches> [mode]"
    assert result.stdout.strip() == expected


def test_D002_string():
    result = x_run_command(
        "D002_string",
        [PLAYER_1_NAME, PLAYER_2_NAME, "abc"]
    )
    expected = "対戦回数指定: バリデーションエラー: 数値以外の入力は無効です"
    assert result.stdout.strip() == expected


def test_E001_zero():
    result = x_run_command(
        "E001_zero",
        [PLAYER_1_NAME, PLAYER_2_NAME, "0"]
    )
    expected = "対戦回数指定: バリデーションエラー: 1未満は無効です"
    assert result.stdout.strip() == expected