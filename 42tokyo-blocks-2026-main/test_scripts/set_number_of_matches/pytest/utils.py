import subprocess
from pathlib import Path
import re

TEST_OUTPUT_PATH = "./test_scripts/set_number_of_matches/pytest/"


class CommandResult:
    def __init__(self, returncode, stdout):
        self.returncode = returncode
        self.stdout = stdout


def run_command(args, test_name):
    """
    パイプ詰まりを防ぎつつ、
    stdout + stderr をリアルタイムで取得し、
    同時にファイルへ保存する
    """

    debug_dir = Path(TEST_OUTPUT_PATH)
    debug_dir.mkdir(parents=True, exist_ok=True)

    file_path = debug_dir / f"{test_name}.txt"

    output_lines = []

    process = subprocess.Popen(
        args,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    with open(file_path, "w", encoding="utf-8") as f:
        for line in process.stdout:
            f.write(line)
            output_lines.append(line)

    process.wait()

    return CommandResult(
        returncode=process.returncode,
        stdout="".join(output_lines)
    )


def assert_normal_with_output(test_name, result, match_count):
    debug_dir = Path(TEST_OUTPUT_PATH)
    debug_dir.mkdir(exist_ok=True)

    file_path = debug_dir / f"{test_name}.txt"
    file_path.write_text(result.stdout, encoding="utf-8")

    # -------------------
    # ① 出力パース
    # -------------------
    output = result.stdout

    p1_match = re.search(r"ss_tarou_1:\s*(\d+)", output)
    p2_match = re.search(r"ss_tarou_2:\s*(\d+)", output)
    winner_match = re.search(r"Game Winner:\s*(\S+)", output)
    draw = re.search(r"Draw", output)

    lines = [line for line in output.strip().splitlines() if line.strip() != ""]

    assert len(lines) >= 3, "出力行数が不足している"

    # 対象行（末尾3行）
    p1_line = lines[-3]
    p2_line = lines[-2]
    last_line = lines[-1]

    assert p1_match is not None, f"ss_tarou_1 のスコアが見つからない: {p1_line}"
    assert p2_match is not None, f"ss_tarou_2 のスコアが見つからない: {p2_line}"

    p1_score = int(p1_match.group(1))
    p2_score = int(p2_match.group(1))

    # -------------------
    # ② 合計チェック
    # -------------------
    assert p1_score + p2_score == match_count, (
        f"スコア合計不一致: {p1_score} + {p2_score} != {match_count}"
    )

    # -------------------
    # ③ 勝者チェック
    # -------------------
    if p1_score > p2_score:
        assert winner_match is not None, f"勝者が見つからない: {last_line}"
        assert winner_match.group(1) == "ss_tarou_1", f"勝者名が間違っている: {last_line}"

    elif p1_score < p2_score:
        assert winner_match is not None, f"勝者が見つからない: {last_line}"
        assert winner_match.group(1) == "ss_tarou_2", f"勝者名が間違っている: {last_line}"

    else:
        assert draw is not None, f"引き分け表示がない: {last_line}"

    # -------------------
    # ④ 正常系チェック
    # -------------------
    try:
        assert result.returncode == 0
        assert result.stdout.strip() != ""

        # 成功時はログ削除
        file_path.unlink()

    except AssertionError:
        print(f"\n[DEBUG] 出力保持: {file_path}")
        raise