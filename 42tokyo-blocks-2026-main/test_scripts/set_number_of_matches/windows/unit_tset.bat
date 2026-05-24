@echo off

chcp 65001 > null

set SOURCE_FILE=.\game\blocks_duo\GameMaster.py

set START=%TIME%

REM A001 正常系
echo ===AOO1 正常系 対戦回数に 9 を指定===
python %SOURCE_FILE% ss_tarou ss_tarou 9
echo.

set END=%TIME%
echo 終了時刻: %END%
echo 開始時刻: %START%

REM A002 異常系
echo ===AOO2 異常系 対戦回数を未指定===
python %SOURCE_FILE% ss_tarou ss_tarou
echo.

REM B001 正常系
echo ===BOO1 正常系 対戦回数に 9 を指定 A001の結果を参照===
echo.

REM B002 正常系
echo ===BOO2 正常系 対戦回数に 9 を指定 A001の結果を参照===
echo.

REM C001 正常系
echo ===COO1 正常系 対戦回数に 1 を指定===
python %SOURCE_FILE% ss_tarou ss_tarou 1
echo.

set START=%TIME%

REM C002 正常系
echo ===COO2 正常系 対戦回数に 49 を指定===
python %SOURCE_FILE% ss_tarou ss_tarou 49
echo.

set END=%TIME%
echo 終了時刻: %END%
echo 開始時刻: %START%

REM C003 異常系　下限値未満入力 
echo ===COO3 異常系 下限値未満入力 対戦回数に 0 を指定=== 
python %SOURCE_FILE% ss_tarou ss_tarou 0
echo.

REM C004 異常系
echo ===COO4 異常系 上限値超過入力 対戦回数に 51 を指定===
python %SOURCE_FILE% ss_tarou ss_tarou 51
echo.

REM C005 異常系
echo ===COO5 異常系 負数入力 対戦回数に -1 を指定===
python %SOURCE_FILE% ss_tarou ss_tarou -1
echo.

REM C006 異常系
echo ===COO6 異常系 小数入力 対戦回数に 1.5 を指定===
python %SOURCE_FILE% ss_tarou ss_tarou 1.5
echo.

REM C007 異常系
echo ===COO7 異常系 文字列入力 対戦回数に abc を指定===
python %SOURCE_FILE% ss_tarou ss_tarou abc
echo.

REM C008 異常系 20260324現在無効にしておく
echo ===COO8 異常系 偶数入力 対戦回数に 2 を指定===
python %SOURCE_FILE% ss_tarou ss_tarou 2
echo.

REM C009 異常系
echo ===COO9 異常系 空文字入力 対戦回数に "" を指定===
python %SOURCE_FILE% ss_tarou ss_tarou ""
echo.

REM D001 正常系
echo ===DOO1 正常系 対戦回数に 9 を指定===
python %SOURCE_FILE% ss_tarou ss_tarou 9
echo.

REM D002 異常系
echo ===DOO2 異常系 対戦回数に abc を指定===
python %SOURCE_FILE% ss_tarou ss_tarou abc
echo.

REM E001 異常系
echo ===EOO1 異常系 対戦回数に 0 を指定===
python %SOURCE_FILE% ss_tarou ss_tarou 0
echo.

REM E002 正常系
echo ===EOO2 正常系 対戦回数に 9 を指定===
python %SOURCE_FILE% ss_tarou ss_tarou 9
echo.