# 環境構築手順書

## 本ドキュメントの概要

本ドキュメントは **ブロックスデュオを Windows PC 上で動作させるための環境構築手順**をまとめたものである。

環境構築の完了条件は以下の通りとする。

*   ゲーム（game）が起動できること
*   ビュアー（viewer）が起動でき、ゲームの動作を確認できること

***

## 1. 前提条件

### 1.1 OS

*   Windows 11 Pro（バージョン：23H2）

### 1.2 必要な権限

*   管理者権限（Administrator 権限）

### 1.3 ネットワーク条件

*   インターネット接続必須

***

## 2. 使用技術・ツール一覧

### 2.1 使用技術

*   Python 3.12.10
*   Node.js 24.14.0

### 2.2 ライブラリ

*   Python
    *   `42tokyo-blocks-2026/client/requirements.txt`
    *   `42tokyo-blocks-2026/game/requirements.txt`
*   Node.js
    *   `42tokyo-blocks-2026/viewer/package.json`

### 2.3 その他ツール

*   Git（2.52.0.windows.1）

***

## 3. 作業手順

### 3.1 gitのインストール
1. 下記URLからWindows用のgitのインストーラーをダウンロードする。<br>URL: https://git-scm.com/install/windows
2. ダウンロードしたインストーラーを起動する<br>基本的にはすべてNextを押し、最後にinstallを押したらgitのインストールが始まる。設定を変更したい人はこのタイミングで変更してもよい。インストールが終了したらFinishを押す。
3. PowerShellで`git -v`を実行し、"git version 2.52.0.windows.1"が出力されたらgitのインストールは終了。

### 3.2 プロジェクトのソースコードをローカルにダウンロード
1. プロジェクトのソースコードを配置したいフォルダを準備する<br>例：C:\work\42Tokyo2026
2. PowerShellで`cd {3.2-1で準備したフォルダパス}`を実行して、フォルダの場所を移動する。<br>例：`cd C:\work\42Tokyo2026`
3. `git clone https://github.com/ss-haruo-hashimoto/42tokyo-blocks-2026.git`を実行する。
4. GitHubのSign in画面が表示されるので、任意の方法でサインインする。
5. サインイン後今いるフォルダの中に`42tokyo-blocks-2026`という名前のフォルダがあることを確認する。フォルダがあればクローン完了。

### 3.3 Pythonのインストール
1. 下記URLからWindows用のPython 3.12.10のインストーラーダウンロードする。<br>URL: https://www.python.org/downloads/release/pymanager-252/
2. ダウンロードしたインストーラーをアプリインストーラーを使用して起動し、"Pythonをインストール"を押す。
3. 下記文章が出てきたら、"y"を押して、enterを押す。<br>
    ```
    Python and some other apps can exceed this limit, but it requires changing a
    system-wide setting, which may need an administrator to approve, and will
    require a reboot. Some packages may fail to install without long path support
    enabled.
    Update setting now? [y/N]
    ```
4. 下記文章が出てきたら、"y"を押して、enterを押す。
    ```
    This may interfere with launching the new 'py' command, and may be resolved by
    uninstalling 'Python launcher'.
    Open Installed apps now? [y/N] 
    ```
5. 下記文章が出てきたら、"y"を押して、enterを押す。
    ```
    Configuring this enables commands like python3.14.exe to run from your
    terminal, but is not needed for the python or py commands (for example, py
    -V:3.14).<br>
    We can add the directory (C:\Users\S00242\AppData\Local\Python\bin) to PATH
    now, but you will need to restart your terminal to use it. The entry will be
    removed if you run py uninstall --purge, or else you can remove it manually when
    uninstalling Python.
    Add commands directory to your PATH now? [y/N]
    ```
6. 下記文章が出てきたら、"y"を押して、enterを押す。
    ```
    Install the current latest version of CPython? If not, you can use 'py install
    default' later to install. Install CPython now? [Y/n]
    ```
7. 下記文章が出てきたら、"N"を押して、enterを押す。
    ```
    Find additional information at https://docs.python.org/dev/using/windows.
    View online help? [y/N]
    ```
8. PowerShellで`py -V`を実行して、"Python 3.14.2"のインストールは完了。
※インストール中に上記以外の質問が表示されたら、内容に応じでy/Nを選択する。

### 3.4 Node.jsのインストール
1. 下記URLからWindows用のNode.jsのインストーラーをダウンロードする。<br>URL: https://nodejs.org/ja/download
2. ダウンロードしたインストーラーを起動する<br>基本的にはすべてNextを押し、最後にinstallを押したらNode.jsのインストールが始まる。設定を変更したい人はこのタイミングで変更してもよい。インストールが終了したらFinishを押す。
3. PowerShellで`node -v`を実行し、"v24.14.0"が出力されたらNode.jsのインストールは終了。

### 3.5 PowerShellの実行権限の変更
基本的には `Set-ExecutionPolicy -Scope Process Bypass` を使用してください。永続化したい場合のみ RemoteSigned を使用する。

（推奨）
1. 管理者権限でPowerShellを開き、`Set-ExecutionPolicy -Scope Process Bypass
`を実行する。（※PowerShellを閉じると再度このコマンドを入力する必要がある）

（非推奨）
1. 管理者権限でPowerShellを開き、`Set-ExecutionPolicy RemoteSigned`を実行する。
2. 下記の文章が出てきたら、"Y"を押して、enterを押す。<br> 実行ポリシーの変更
実行ポリシーは、信頼されていないスクリプトからの保護に役立ちます。実行ポリシーを変更すると、

    ```
    about_Execution_Policies
    のヘルプ トピック (https://go.microsoft.com/fwlink/?LinkID=135170)
    で説明されているセキュリティ上の危険にさらされる可能性があります。実行ポリシーを変更しますか?
    [Y] はい(Y)  [A] すべて続行(A)  [N] いいえ(N)  [L] すべて無視(L)  [S] 中断(S)  [?] ヘルプ (既定値は "N"):
    ```

### 3.6 viewer 側で必要なライブラリのインストール

1.  PowerShell で以下のフォルダに移動する

    ```powershell
    cd 42tokyo-blocks-2026/viewer
    ```

2.  依存ライブラリをインストールする

    ```powershell
    npm install
    ```

***

### 3.7 Python 仮想環境の作成・有効化・ライブラリのインストール

1.  PowerShellでプロジェクトルートへ移動

    ```powershell
    cd 42tokyo-blocks-2026
    ```

2.  仮想環境を作成

    ```powershell
    py -m venv .venv
    ```

3.  仮想環境を有効化

    ```powershell
    .\.venv\Scripts\Activate.ps1
    ```

4.  プロンプト先頭に `(.venv)` が表示されることを確認

5.  必要な Python パッケージをインストール

    ```powershell
    pip install .\game\
    pip install .\client\
    ```

***

## 4. 動作確認

## 4.1 viewer（ビュアー）の起動

viewer は **用途別に 3 種類の起動方法**が用意されている。  
状況に応じて適切なコマンドを使用すること。

### 4.1.1 viewer フォルダへ移動

    ```powershell
    cd 42tokyo-blocks-2026/viewer
    ```

***

### 4.1.2 起動方法一覧

| 起動コマンド                 | 内容                |
| ---------------------- | ----------------- |
| `npm run start`        | モード選択画面を表示        |
| `npm run start:live`   | ライブ観戦画面を直接起動      |
| `npm run start:replay` | 牌譜（リプレイ）再生画面を直接起動 |

※ 試合の実行だけする場合は`4.2 game の起動`の実行のみで構わない

※ 試合の様子を見たい場合や、試合の流れを振り返ってみたい場合にビュアーを用意した

***

### 4.1.3 各起動方法の説明

#### ■ モード選択画面

    ```powershell
    npm run start
    ```

*   ビュアー起動時に **モード選択画面が表示**
*   Live / Replay などを GUI から選択したい場合に使用

***

#### ■ ライブ観戦モード

    ```powershell
    npm run start:live
    ```

*   モード選択を省略し、**ライブ観戦画面を直接起動**
*   対戦をリアルタイムで確認したい場合に使用

***

#### ■ 牌譜再生（リプレイ）モード

    ```powershell
    npm run start:replay
    ```

*   牌譜の再生専用画面を直接起動
*   過去試合の確認・検証に使用
*   game実行時に自動生成されるJson形式のログファイルを読み取るため、先にgameが実行されている必要がある。
*   ログファイルは`42tokyo-blocks-2026/log`下に格納される

***

### 4.1.4 起動確認

*   `"blocksview"` というウィンドウが表示されること
*   モード選択画面から、ライブ観戦モード・牌譜再生モードの画面に遷移できること
*   各モードでは左上にモード表示があり、中央に盤面、左右にブロックが表示されていること

上記を確認できれば viewer の起動は成功である。

***

## 4.2 game の起動

1.  プロジェクトルートに移動

    ```powershell
    cd 42tokyo-blocks-2026
    ```

2.  仮想環境を有効化

    ```powershell
    .\.venv\Scripts\Activate.ps1
    ```

3.  ゲームを起動

    ```powershell
    start_blocksduo <player1_name> <player2_name> <num_of_maches> [view]
    ```
    例:
    ```powershell
    start_blocksduo ss_tarou ss_tarou 3 view
    ```

4.  ライブ観戦モードで起動したviewer画面上で、ブロックが配置・更新されていることを確認する
