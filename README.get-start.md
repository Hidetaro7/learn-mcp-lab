# MCP Get-Start

これは Model Context Protocol（MCP） の**最小構成サンプル**です。

OpenAI GPT-4 function calling 機能を活用し、  
自然言語の命令からローカルのフォルダ作成やメモ保存を自動化します。

---

## ✅ このブランチの目的

- 最小限の構成で **MCP の本質を体験**
- UI なし、**cURL のみで試せる**
- コードは 1 ファイル（`index.ts`）
- 使用関数は `createFolder` と `writeNote` の 2 つのみ

---

## 📦 準備手順

### 1. Node.js 22+ & pnpm がインストールされていることを確認

```bash
node -v
pnpm -v
```

### 2. このリポジトリをクローンし、`get-start` ブランチに切り替え

```bash
git clone https://github.com/Hidetaro7/learn-mcp-lab.git
cd your-repo
git checkout get-start
```

### 3. パッケージのインストール

```bash
pnpm install
```

### 4. OpenAI API キーを `.env` に追加

```bash
echo "OPENAI_API_KEY=sk-..." > .env
```

---

## 🚀 サーバー起動

```bash
pnpm dev
```

---

## 🧪 テスト実行（cURL）

### 📁 フォルダを作成

```bash
curl -X POST http://localhost:3000/ask \
  -H "Content-Type: application/json" \
  -d '{ "message": "新しく「test」フォルダを作ってください" }'
```

### 📝 メモを保存

```bash
curl -X POST http://localhost:3000/ask \
  -H "Content-Type: application/json" \
  -d '{ "message": "「test」フォルダに「今日のメモ」というタイトルで次の内容を保存して：MCPサーバーが動いた！" }'
```

---

## 🧠 仕組み（ざっくり）

1. ユーザーが自然言語で命令
2. GPT-4 が対応する関数を呼び出す（function calling）
3. `index.ts` 内の関数を実行
4. 結果を JSON で返す

---

## 📚 次に進むには？

- `main` ブランチには UI や多数の関数を統合したフル機能版があります
- `readNote`, `listNotes`, `summarizeFolder` などを順に学べます

---

## 🏁 最後に

このブランチは「**MCP の出発点**」です。  
学びながら自由に試して、壊して、育ててください ✨
