#!/bin/bash

SOURCE_FILE="./game/blocks_duo/GameMaster.py"

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

# A001 正常系
echo ===AOO1 正常系 対戦回数に 9 を指定===
OUTPUT=$(python $SOURCE_FILE ss_tarou ss_tarou $ARG)
python $SOURCE_FILE ss_tarou ss_tarou 9
echo

# A002 異常系
ARG=""
echo ===AOO2 異常系 対戦回数を未指定===
OUTPUT=$(python $SOURCE_FILE ss_tarou ss_tarou $ARG)
EXECUTED_VALUE="Usage: start_blocksduo <player 1 name> <player 2 name> <number of matches> [mode]"
is_exected_value "$OUTPUT" "$EXECUTED_VALUE"
echo

# B001 正常系
echo ===BOO1 正常系 対戦回数に 9 を指定 A001の結果を参照===
echo

# B002 正常系
echo ===BOO2 正常系 対戦回数に 9 を指定 A001の結果を参照===
echo

# C001 正常系
ARG="1"
echo ===COO1 正常系 対戦回数に $ARG を指定===
python $SOURCE_FILE ss_tarou ss_tarou $ARG
echo

# C002 正常系
ARG="49"
echo ===COO2 正常系 対戦回数に $ARG を指定===
time python $SOURCE_FILE ss_tarou ss_tarou $ARG
echo

# C003 異常系 下限値未満入力 
ARG="0"
echo ===COO3 異常系 下限値未満入力 対戦回数に $ARG を指定=== 
OUTPUT=$(python $SOURCE_FILE ss_tarou ss_tarou $ARG)
EXECUTED_VALUE="対戦回数指定: バリデーションエラー: 1未満は無効です"
is_exected_value "$OUTPUT" "$EXECUTED_VALUE"
echo

# C004 異常系
ARG="51"
echo ===COO4 異常系 上限値超過入力 対戦回数に $ARG を指定===
OUTPUT=$(python $SOURCE_FILE ss_tarou ss_tarou $ARG)
EXECUTED_VALUE="対戦回数指定: バリデーションエラー: 49超過は無効です"
is_exected_value "$OUTPUT" "$EXECUTED_VALUE"
echo

# C005 異常系
ARG="-1"
echo ===COO5 異常系 負数入力 対戦回数に $ARG を指定===
OUTPUT=$(python $SOURCE_FILE ss_tarou ss_tarou $ARG)
EXECUTED_VALUE="対戦回数指定: バリデーションエラー: 負数は無効です"
is_exected_value "$OUTPUT" "$EXECUTED_VALUE"
echo

# C006 異常系
ARG="1.5"
echo ===COO6 異常系 小数入力 対戦回数に $ARG を指定===
OUTPUT=$(python $SOURCE_FILE ss_tarou ss_tarou $ARG)
EXECUTED_VALUE="対戦回数指定: バリデーションエラー: 小数は無効です"
is_exected_value "$OUTPUT" "$EXECUTED_VALUE"
echo

# C007 異常系
ARG="abc"
echo ===COO7 異常系 文字列入力 対戦回数に $ARG を指定===
OUTPUT=$(python $SOURCE_FILE ss_tarou ss_tarou $ARG)
EXECUTED_VALUE="対戦回数指定: バリデーションエラー: 数値以外の入力は無効です"
is_exected_value "$OUTPUT" "$EXECUTED_VALUE"
echo

# # C008 異常系 20260324現在無効にしておく
# echo ===COO8 異常系 偶数入力 対戦回数に 2 を指定===
# python $SOURCE_FILE ss_tarou ss_tarou 2
# echo

# C009 異常系
ARG="\"\""
echo ===COO9 異常系 空文字入力 対戦回数に $ARG を指定===
OUTPUT=$(python $SOURCE_FILE ss_tarou ss_tarou $ARG)
EXECUTED_VALUE="対戦回数指定: バリデーションエラー: 数値以外の入力は無効です"
is_exected_value "$OUTPUT" "$EXECUTED_VALUE"
echo

# C010 異常系
ARG="5 10 view"
echo ===CO10 異常系 複数引数入力 対戦回数に $ARG を指定===
OUTPUT=$(python $SOURCE_FILE ss_tarou ss_tarou $ARG)
EXECUTED_VALUE="Usage: start_blocksduo <player 1 name> <player 2 name> <number of matches> [mode]"
is_exected_value "$OUTPUT" "$EXECUTED_VALUE"
echo

# D001 正常系
ARG=9
echo ===DOO1 正常系 対戦回数に $ARG を指定===
python $SOURCE_FILE ss_tarou ss_tarou $ARG
echo

# D002 異常系
ARG="abc"
echo ===DOO2 異常系 対戦回数に $ARG を指定===
OUTPUT=$(python $SOURCE_FILE ss_tarou ss_tarou $ARG)
EXECUTED_VALUE="対戦回数指定: バリデーションエラー: 数値以外の入力は無効です"
is_exected_value "$OUTPUT" "$EXECUTED_VALUE"
echo

# E001 異常系
ARG="0"
echo ===EOO1 異常系 対戦回数に $ARG を指定===
OUTPUT=$(python $SOURCE_FILE ss_tarou ss_tarou $ARG)
echo $OUTPUT
EXECUTED_VALUE="対戦回数指定: バリデーションエラー: 1未満は無効です"
is_exected_value "$OUTPUT" "$EXECUTED_VALUE"
echo

# E002 正常系
ARG="9"
echo ===EOO2 正常系 対戦回数に $ARG を指定===
python $SOURCE_FILE ss_tarou ss_tarou $ARG
echo
