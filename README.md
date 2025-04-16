# MCP サーバー + UI（モノレポ構成）

このリポジトリは、Modular Command Processing (MCP) を実装したローカル AI サーバーと、React UI フロントエンドからなるプロジェクトです。

---

## 📁 ディレクトリ構成

```
apps/
├── mcp-server/    # Hono + OpenAI で構成されたバックエンドAPI
└── mcp-ui/        # Vite + React で構成されたチャットUIフロントエンド
```

---

## 🚀 起動方法（ローカル）

プロジェクトルートで以下を実行：

```bash
pnpm install
pnpm dev
```

これにより、`mcp-server`（ポート 3000）と `mcp-ui`（ポート 5173）が同時に起動します。

---

## 🌐 MCP サーバーの機能概要

- `createFolder`：ローカルにフォルダを作成
- `writeNote`：フォルダ内にテキストファイルを保存
- `readNote`：テキストファイルの読み取り
- `listNotes`：フォルダ内のファイル一覧取得
- `summarizeUrl`：URL の内容を要約し保存
- `summarizeFolder`：フォルダ内のメモをまとめて要約
- `summarizeAndSaveFolder`：フォルダ内メモを要約して別フォルダに日付付き保存

すべて OpenAI API を通じて自然言語で実行可能です。

---

## 🧠 UI の機能

- チャット形式で自然言語による操作が可能
- ファイル一覧を取得して表示
- ファイル名クリックで中身を読み込み
- フォルダ・タイトル・本文を指定して保存
- 今後：要約機能やまとめ出力、ファイル削除にも対応予定

---

## 🔁 `/auto` エンドポイントについて

`/auto` は、自然言語の命令をもとに GPT が自動で複数の処理ステップ（関数呼び出し）を計画し、順に実行するためのエンドポイントです。  
GPT が出力する JSON プランに従って、MCP サーバーが対応する関数を自動で呼び出します。

---

### 📡 使用例（cURL）

```bash
curl -X POST http://localhost:3000/auto \
  -H "Content-Type: application/json" \
  -d '{
    "message": "https://news.yahoo.co.jp/pickup/6535179 を読んで、「ニュース」フォルダに保存してください。タイトルは DeepMind 天気予報 にしてください。"
  }'
```

---

### ✅ 処理の流れ（例）

ユーザーの指示：

> 「https://news.yahoo.co.jp/pickup/6535179 を読んで、“ニュース” フォルダに “DeepMind 天気予報” というタイトルで保存して」

GPT が出力する JSON プラン：

```json
[
  {
    "function": "createFolder",
    "arguments": { "name": "ニュース" }
  },
  {
    "function": "summarizeUrl",
    "arguments": {
      "url": "https://news.yahoo.co.jp/pickup/6535179",
      "folder": "ニュース",
      "title": "DeepMind 天気予報"
    }
  }
]
```

MCP サーバーがこれを受け取り、順番に関数を呼び出して実行します。

---

### ℹ️ `/ask` との違い

| 項目       | `/auto`                                | `/ask`                                |
| ---------- | -------------------------------------- | ------------------------------------- |
| モデル制御 | 自前のプロンプトで命令                 | GPT の `function_call: "auto"` を使用 |
| 柔軟性     | 高い（複数ステップを計画・実行できる） | 単一関数を確実に呼ぶのに適している    |
| 利用場面   | 連続処理や複雑なワークフロー           | シンプルなチャットや UI 操作に最適    |
