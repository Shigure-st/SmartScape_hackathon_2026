# 環境構築手順書(Ubuntu ver)

## 本ドキュメントの概要

本ドキュメントは **ブロックスデュオを Ubuntu 上で動作させるための環境構築手順**をまとめたものである。

環境構築の完了条件は以下の通りとする。

*   ゲーム（game）が起動できること
*   ビュアー（viewer）が起動でき、ゲームの動作を確認できること

***

## 1. 前提条件

### 1.1 OS

*   Ubuntu 22.04 LTS

### 1.2 必要な権限

*   一般ユーザー権限（sudo 不要）

### 1.3 ネットワーク条件

*   インターネット接続必須

***

## 2. 使用技術・ツール一覧

### 2.1 使用技術
*   Python v3.12.10
*   Node.js v24.14.0
*   uv（pythonの仮想環境作成に使用）
*   nvm（node.jsのインストールに使用）

### 2.2 ライブラリ

*   Python
    *   `42tokyo-blocks-2026/client/requirements.txt`
    *   `42tokyo-blocks-2026/game/requirements.txt`
*   Node.js
    *   `42tokyo-blocks-2026/viewer/package.json`

### 2.3 その他ツール
以下コマンドが実行可能であることを前提とする
*   unzip
*   wget

***

## 3. 作業手順

### 3.1 プロジェクトのダウンロード

1. ホームディレクトリへ移動し、zip を展開

    ```bash
    cd ~/
    unzip ~/Downloads/42tokyo-blocks-2026.zip
    ```

2. フォルダが存在することを確認

    ```bash
    ls
    ```

### 3.2 Python（uv）のインストール

1. インストールスクリプトを実行

    ```bash
    wget -qO- https://astral.sh/uv/install.sh | bash
    ```

2. uv コマンドが実行できることを確認

    ```bash
    uv --version
    ```

### 3.3 Python 仮想環境の作成

1. プロジェクトルートへ移動

    ```bash
    cd ~/42tokyo-blocks-2026
    ```

2. Python 3.12.10 の仮想環境を作成し、有効化

    ```bash
    uv venv -p 3.12.10
    source .venv/bin/activate
    ```

3. Python のバージョンを確認

    ```bash
    python --version
    # Python 3.12.10 であることを確認
    ```

### 3.4 Python 依存ライブラリのインストールおよびセットアップ

1. game および client の依存ライブラリをインストール

    ```bash
    uv pip install ./game
    uv pip install ./client
    ```

### 3.5 Node.js（nvm）のインストール

1. インストールスクリプトを実行

    ```bash
    wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
    ```

2. シェルの設定を再読み込み

    ```bash
    source ~/.bashrc
    ```

3. nvm コマンドが実行可能であることを確認

    ```bash
    nvm --version
    ```

### 3.6 Node.js のインストール

1. Node.js 24.14.0 をインストールし、デフォルトバージョンとして設定

    ```bash
    nvm install 24.14.0
    nvm use 24.14.0
    nvm alias default 24.14.0
    ```

2. node および npm がインストール済みであることを確認

    ```bash
    node -v
    npm -v
    ```

### 3.7 viewer の依存ライブラリインストール

1. viewer ディレクトリへ移動

    ```bash
    cd ~/42tokyo-blocks-2026/viewer
    ```

2. 依存ライブラリをインストール

    ```bash
    npm install
    ```

***

## 4. 動作確認

## 4.1 viewer（ビュアー）の起動

viewer は **用途別に 3 種類の起動方法**が用意されている。  
状況に応じて適切なコマンドを使用すること。

### 4.1.1 viewer フォルダへ移動

```bash
cd ~/42tokyo-blocks-2026/viewer
```

### 4.1.2 起動方法一覧

| 起動コマンド                 | 内容                |
| ---------------------- | ----------------- |
| `npm run start`        | モード選択画面を表示        |
| `npm run start:live`   | ライブ観戦画面を直接起動      |
| `npm run start:replay` | 牌譜（リプレイ）再生画面を直接起動 |

※ 試合の実行だけする場合は`4.2 game の起動`の実行のみで構わない

※ 試合の様子を見たい場合や、試合の流れを振り返ってみたい場合を想定してビュアーを用意した


### 4.1.3 各起動方法の説明

#### ■ モード選択画面

```bash
npm run start
```

*   ビュアー起動時に **モード選択画面が表示**
*   Live / Replay などを GUI から選択したい場合に使用


#### ■ ライブ観戦モード

```bash
npm run start:live
```

*   モード選択を省略し、**ライブ観戦画面を直接起動**
*   対戦をリアルタイムで確認したい場合に使用


#### ■ 牌譜再生（リプレイ）モード

```bash
npm run start:replay
```

*   牌譜の再生専用画面を直接起動
*   過去試合の確認・検証に使用
*   game実行時に自動生成されるJson形式のログファイルを読み取るため、先にgameが実行されている必要がある。
*   ログファイルは`42tokyo-blocks-2026/log`下に格納される


### 4.1.4 起動確認

*   `"blocksview"` というウィンドウが表示されること
*   モード選択画面から、ライブ観戦モード・牌譜再生モードの画面に遷移できること
*   各モードでは左上にモード表示があり、中央に盤面、左右にブロックが表示されていること

上記を確認できれば viewer の起動は成功である。


## 4.2 game の起動

1.  プロジェクトルートに移動

    ```bash
    cd ~/42tokyo-blocks-2026
    ```

2.  仮想環境を有効化

    ```bash
    source ./.venv/bin/activate
    ```

3.  ゲームを起動

    ```bash
    start_blocksduo <player1_name> <player2_name> <num_of_maches> [view]
    ```
    例:
    ```bash
    start_blocksduo ss_tarou ss_tarou 3 view
    ```

4.  ライブ観戦モードで起動したviewer画面上で、ブロックが配置・更新されていることを確認する
