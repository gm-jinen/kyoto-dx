# gm-jinen

## 環境構築ガイド

### 前提条件
- Node.js がインストールされていること
- Google Cloud CLI (gcloud) がインストールされていること

### セットアップ手順

#### 1. リポジトリのクローン
```bash
git clone https://github.com/gm-jinen/gm-jinen.git
cd gm-jinen
```

#### 2. GCP認証の設定
```bash
# Google Cloud にログイン
gcloud auth login

# アプリケーションデフォルト認証情報を設定
gcloud auth application-default login
```

#### 3. プロジェクトの設定
```bash
# プロジェクトIDを設定
gcloud config set project gm-jinen
```

#### 4. 依存関係のインストール
```bash
npm install
```

#### 5. アプリケーションのビルド
```bash
npm run build
```

#### 6. アプリケーションの起動
```bash
npm run start
```

#### 7. ブラウザでの確認

ブラウザを開き、`http://localhost:8080` にアクセスします。

### トラブルシューティング
- 認証エラーが発生した場合は、以下の手順を試してください。

1. `gcloud auth list` でアクティブなアカウントを確認します。もし、正しいアカウントでログインしていない場合は、`gcloud auth login` を実行してログインします。
2. `gcloud auth application-default print-access-token` でアプリケーションデフォルトの認証情報が正しいことを確認します。もし、正しい情報が表示されない場合は、`gcloud auth application-default login` を実行して再ログインします。
3. `gcloud config get-value project` で現在のプロジェクトIDを確認できます。もし、正しいプロジェクトIDでない場合は、`gcloud config set project [PROJECT_ID]` でプロジェクトIDを再設定します。
4. `gcloud config list` で`account`に正しいアカウント、`project`に正しいプロジェクトIDが設定されていることを確認します。

- nvmによるNode.jsのバージョン管理をする方法は、以下のリンクを参照してください。

windows: [ネイティブ Windows で Node.js を設定する | Microsoft Learn](https://learn.microsoft.com/ja-jp/windows/dev-environment/javascript/nodejs-on-windows)
linux, macOS: [nvm-sh/nvm: Node Version Manager - POSIX-compliant bash script to manage multiple active node.js versions](https://github.com/nvm-sh/nvm?tab=readme-ov-file#installing-and-updating)
