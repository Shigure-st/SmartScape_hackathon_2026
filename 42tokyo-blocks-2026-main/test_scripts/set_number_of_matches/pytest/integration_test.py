from .utils import assert_normal_with_output
from .utils import run_command

PLAYER_1_NAME = "ss_tarou"
PLAYER_2_NAME = PLAYER_1_NAME


def x_run_command(test_name, args):
    return run_command(["start_blocksduo"] + args, test_name)


# -------------------
# 正常系
# -------------------

def test_F001_to_F003_and_F005_normal():
    match_count = 3
    result = x_run_command(
        "F001_to_F003_and_F005_normal",
        [PLAYER_1_NAME, PLAYER_2_NAME, str(match_count), "view"]
    )
    assert_normal_with_output(
        "F001_to_F003_and_F005_normal",
        result,
        match_count
    )


def test_F004_normal():
    match_count = 4
    result = x_run_command(
        "F004",
        [PLAYER_1_NAME, PLAYER_2_NAME, str(match_count), "view"]
    )
    assert_normal_with_output(
        "F004",
        result,
        match_count
    )

# -------------------
# 異常系
# -------------------

def test_F101_no_arg():
    result = x_run_command(
        "F101_no_arg",
        [PLAYER_1_NAME, PLAYER_2_NAME]
    )
    expected = "Usage: start_blocksduo <player 1 name> <player 2 name> <number of matches> [mode]"
    assert result.stdout.strip() == expected


def test_F102_zero():
    result = x_run_command(
        "F102_zero",
        [PLAYER_1_NAME, PLAYER_2_NAME, "0", "view"]
    )
    expected = "対戦回数指定: バリデーションエラー: 1未満は無効です"
    assert result.stdout.strip() == expected


def test_F103_over_max():
    result = x_run_command(
        "F103_over_max",
        [PLAYER_1_NAME, PLAYER_2_NAME, "255", "view"]
    )
    expected = "対戦回数指定: バリデーションエラー: 49超過は無効です"
    assert result.stdout.strip() == expected


def test_F104_float():
    result = x_run_command(
        "F104_float",
        [PLAYER_1_NAME, PLAYER_2_NAME, "3.14", "view"]
    )
    expected = "対戦回数指定: バリデーションエラー: 小数は無効です"
    assert result.stdout.strip() == expected


def test_F105_negative():
    result = x_run_command(
        "F105_negative",
        [PLAYER_1_NAME, PLAYER_2_NAME, "-256", "view"]
    )
    expected = "対戦回数指定: バリデーションエラー: 負数は無効です"
    assert result.stdout.strip() == expected


def test_F106_string():
    result = x_run_command(
        "F106_string",
        [PLAYER_1_NAME, PLAYER_2_NAME, "abc", "view"]
    )
    expected = "対戦回数指定: バリデーションエラー: 数値以外の入力は無効です"
    assert result.stdout.strip() == expected


def test_F107_multiple_args():
    result = x_run_command(
        "F107_multiple_args",
        [PLAYER_1_NAME, PLAYER_2_NAME, "5", "10", "view"]
    )
    expected = "Usage: start_blocksduo <player 1 name> <player 2 name> <number of matches> [mode]"
    assert result.stdout.strip() == expected


def test_F108_empty_string():
    result = x_run_command(
        "F108_empty_string",
        [PLAYER_1_NAME, PLAYER_2_NAME, "", "view"]
    )
    expected = "対戦回数指定: バリデーションエラー: 空文字は無効です"
    assert result.stdout.strip() == expected