#!/bin/bash

COLOR_END="\e[0m"
GRE="\e[32m"
RED="\e[31m"

is_exected_value() {
    local output="$1"
    local executed_value="$2"
    if [ "$output" = "$executed_value" ]; then
        echo -e "$GRE[OK]$COLOR_END"
       
    else
        echo -e "$RED[ERR]$COLOR_END"
        echo -e "   " "期待値: " "$executed_value"
        echo -e "   " "出力  : " "$output"
    fi
}

# F001 ~ F004 正常系
ARG="3"
echo ===FOO1 ~ FOO4 正常系 対戦回数に $ARG を指定===
start_blocksduo ss_tarou ss_tarou $ARG view
echo

# F101 異常系
echo ===F1O1 異常系 対戦回数に何も指定しない===
OUTPUT=$(start_blocksduo ss_tarou ss_tarou)
EXECUTED_VALUE="Usage: start_blocksduo <player 1 name> <player 2 name> <number of matches> [mode]"
is_exected_value "$OUTPUT" "$EXECUTED_VALUE"
echo

# F102 異常系
ARG="0"
echo ===F1O2 異常系 対戦回数に $ARG を指定===
OUTPUT=$(start_blocksduo ss_tarou ss_tarou $ARG view)
EXECUTED_VALUE="対戦回数指定: バリデーションエラー: 1未満は無効です"
is_exected_value "$OUTPUT" "$EXECUTED_VALUE"
echo

# F103 異常系
ARG="255"
echo ===F1O3 異常系 対戦回数に $ARG を指定===
OUTPUT=$(start_blocksduo ss_tarou ss_tarou $ARG view)
EXECUTED_VALUE="対戦回数指定: バリデーションエラー: 49超過は無効です"
is_exected_value "$OUTPUT" "$EXECUTED_VALUE"
echo

# F104 異常系
ARG="3.14"
echo ===F1O4 異常系 対戦回数に $ARG を指定===
OUTPUT=$(start_blocksduo ss_tarou ss_tarou $ARG view)
EXECUTED_VALUE="対戦回数指定: バリデーションエラー: 小数は無効です"
is_exected_value "$OUTPUT" "$EXECUTED_VALUE"
echo

# F105 異常系
ARG="-256"
echo ===F1O5 異常系 対戦回数に $ARG を指定===
OUTPUT=$(start_blocksduo ss_tarou ss_tarou $ARG view)
EXECUTED_VALUE="対戦回数指定: バリデーションエラー: 負数は無効です"
is_exected_value "$OUTPUT" "$EXECUTED_VALUE"
echo

# F106 異常系
ARG="abc"
echo ===F1O6 異常系 対戦回数に $ARG を指定===
OUTPUT=$(start_blocksduo ss_tarou ss_tarou $ARG view)
EXECUTED_VALUE="対戦回数指定: バリデーションエラー: 数値以外の入力は無効です"
is_exected_value "$OUTPUT" "$EXECUTED_VALUE"
echo

# F107 異常系
ARG="5 10"
echo ===F1O7 異常系 対戦回数に $ARG を指定===
OUTPUT=$(start_blocksduo ss_tarou ss_tarou $ARG view)
EXECUTED_VALUE="Usage: start_blocksduo <player 1 name> <player 2 name> <number of matches> [mode]"
is_exected_value "$OUTPUT" "$EXECUTED_VALUE"
echo

# F108 異常系
ARG="\"\""
echo ===F1O8 異常系 対戦回数に $ARG を指定===
OUTPUT=$(start_blocksduo ss_tarou ss_tarou $ARG view)
EXECUTED_VALUE="対戦回数指定: バリデーションエラー: 数値以外の入力は無効です"
is_exected_value "$OUTPUT" "$EXECUTED_VALUE"
echo