import "dotenv/config";
import { Hono } from "hono";
import { OpenAI } from "openai";
import { serve } from "@hono/node-server";
import fs from "fs/promises";
import path from "path";
import { cors } from "hono/cors";

const app = new Hono();
app.use("*", cors());
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const functions = [
  {
    name: "createFolder",
    description: "ローカルに新しいフォルダを作成します",
    parameters: {
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"],
    },
  },
  {
    name: "writeNote",
    description: "テキストファイルを保存します",
    parameters: {
      type: "object",
      properties: {
        folder: { type: "string" },
        title: { type: "string" },
        content: { type: "string" },
      },
      required: ["folder", "title", "content"],
    },
  },
  {
    name: "readNote",
    description: "テキストファイルを読み取ります",
    parameters: {
      type: "object",
      properties: {
        folder: { type: "string" },
        title: { type: "string" },
      },
      required: ["folder", "title"],
    },
  },
  {
    name: "summarizeUrl",
    description: "Webページを要約して保存します",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string" },
        folder: { type: "string" },
        title: { type: "string" },
      },
      required: ["url", "folder", "title"],
    },
  },
  {
    name: "summarizeFolder",
    description: "フォルダ内メモをまとめて要約します",
    parameters: {
      type: "object",
      properties: { folder: { type: "string" } },
      required: ["folder"],
    },
  },
  {
    name: "summarizeAndSaveFolder",
    description: "フォルダ内の要約結果を日付付きで保存します",
    parameters: {
      type: "object",
      properties: {
        source: { type: "string" },
        target: { type: "string" },
      },
      required: ["source", "target"],
    },
  },
  {
    name: "listNotes",
    description: "フォルダ内のメモ一覧を取得します",
    parameters: {
      type: "object",
      properties: { folder: { type: "string" } },
      required: ["folder"],
    },
  },
];

async function createFolder({ name }: { name: string }) {
  const path = `./data/${name}`;
  await fs.mkdir(path, { recursive: true });
  return { message: `フォルダ '${name}' を作成しました。` };
}

async function writeNote({
  folder,
  title,
  content,
}: {
  folder: string;
  title: string;
  content: string;
}) {
  const dir = `./data/${folder}`;
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(`${dir}/${title}.txt`, content, "utf-8");
  return { message: `${title}.txt を ${folder} に保存しました。` };
}

async function readNote({ folder, title }: { folder: string; title: string }) {
  const safeTitle = title.replace(/\.txt$/, "");
  const filePath = `./data/${folder}/${safeTitle}.txt`;
  const content = await fs.readFile(filePath, "utf-8");
  return { content, message: `${safeTitle}.txt の内容を読み取りました。` };
}

async function summarizeUrl({
  url,
  folder,
  title,
}: {
  url: string;
  folder: string;
  title: string;
}) {
  const res = await fetch(url);
  const html = await res.text();
  const gpt = await openai.chat.completions.create({
    model: "gpt-4-0613",
    messages: [
      {
        role: "system",
        content: "以下のHTMLを人間向けにわかりやすく要約してください。",
      },
      { role: "user", content: html.slice(0, 12000) },
    ],
  });
  const summary = gpt.choices[0].message.content || "[要約失敗]";
  return await writeNote({ folder, title, content: summary });
}

async function summarizeFolder({ folder }: { folder: string }) {
  const dir = `./data/${folder}`;
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".txt"));
  const texts = await Promise.all(
    files.map((f) => fs.readFile(`${dir}/${f}`, "utf-8"))
  );
  const combined = texts.map((t, i) => `【${files[i]}】\n${t}`).join("\n\n");
  const gpt = await openai.chat.completions.create({
    model: "gpt-4-0613",
    messages: [
      { role: "system", content: "以下の複数のノートを要約してください。" },
      { role: "user", content: combined.slice(0, 12000) },
    ],
  });
  const summary = gpt.choices[0].message.content || "[要約失敗]";
  return { summary };
}

async function summarizeAndSaveFolder({
  source,
  target,
}: {
  source: string;
  target: string;
}) {
  const { summary } = await summarizeFolder({ folder: source });
  const date = new Date().toISOString().slice(0, 10);
  return await writeNote({
    folder: target,
    title: `${date}-まとめ`,
    content: summary,
  });
}

async function listNotes({ folder }: { folder: string }) {
  const dir = `./data/${folder}`;
  const entries = await fs.readdir(dir);
  const files = await Promise.all(
    entries
      .filter((name) => name.endsWith(".txt"))
      .map(async (filename) => {
        const stat = await fs.stat(path.join(dir, filename));
        return {
          filename,
          title: filename.replace(/\.txt$/, ""),
          size: stat.size,
          lastModified: stat.mtime.toISOString(),
        };
      })
  );
  return { files };
}

app.post("/auto", async (c) => {
  const { message: userMessage } = await c.req.json();

  const routerPrompt = `
あなたはユーザーの命令に従い、次の関数を使って JSON 形式の実行計画を作るエージェントです。
自然言語での解説やコードブロック、補足説明は一切不要です。
必ず JSON 配列のみを正しく出力してください。

形式:
[
  { "function": "createFolder", "arguments": { "name": "..." } },
  { "function": "summarizeUrl", "arguments": { "url": "...", "folder": "...", "title": "..." } }
]

使用可能な関数:
- createFolder(name)
- writeNote(folder, title, content)
- summarizeUrl(url, folder, title)
- readNote(folder, title)
- summarizeFolder(folder)
- summarizeAndSaveFolder(source, target)
- listNotes(folder)

ユーザーの指示: ${userMessage}`;

  const planner = await openai.chat.completions.create({
    model: "gpt-4-0613",
    messages: [
      {
        role: "system",
        content:
          "あなたはユーザーの命令を function 呼び出し計画に変換するAIです。",
      },
      { role: "user", content: routerPrompt },
    ],
  });

  const planText = planner.choices[0].message.content || "[]";
  let plan: any[] = [];
  try {
    plan = JSON.parse(planText);
  } catch (e) {
    return c.json({ error: "JSON解析失敗", raw: planText });
  }

  const results = [];
  for (const step of plan) {
    const { function: fn, arguments: args } = step;
    try {
      if (fn === "createFolder") results.push(await createFolder(args));
      else if (fn === "writeNote") results.push(await writeNote(args));
      else if (fn === "readNote") results.push(await readNote(args));
      else if (fn === "summarizeUrl") results.push(await summarizeUrl(args));
      else if (fn === "summarizeFolder")
        results.push(await summarizeFolder(args));
      else if (fn === "summarizeAndSaveFolder")
        results.push(await summarizeAndSaveFolder(args));
      else if (fn === "listNotes") results.push(await listNotes(args));
      else results.push({ error: `未対応の関数: ${fn}` });
    } catch (e) {
      results.push({
        error: `関数 ${fn} の実行中にエラー: ${(e as Error).message}`,
      });
    }
  }

  return c.json({ results });
});

app.post("/ask", async (c) => {
  const { message } = await c.req.json();
  const chat = await openai.chat.completions.create({
    model: "gpt-4-0613",
    messages: [
      {
        role: "system",
        content: "あなたはローカルファイル操作を仲介するAIアシスタントです。",
      },
      { role: "user", content: message },
    ],
    functions,
    function_call: "auto",
  });

  const call = chat.choices[0].message.function_call;
  if (!call) return c.json({ message: chat.choices[0].message.content });

  const args = JSON.parse(call.arguments || "{}");
  const name = call.name;

  if (name === "createFolder") return c.json(await createFolder(args));
  if (name === "writeNote") return c.json(await writeNote(args));
  if (name === "readNote") return c.json(await readNote(args));
  if (name === "summarizeUrl") return c.json(await summarizeUrl(args));
  if (name === "summarizeFolder") return c.json(await summarizeFolder(args));
  if (name === "summarizeAndSaveFolder")
    return c.json(await summarizeAndSaveFolder(args));
  if (name === "listNotes") return c.json(await listNotes(args));

  return c.json({ error: "未対応の関数" });
});

// ↓ 将来的にAPIとして使う予定があるなら残す、それ以外はコメントアウト or 削除
// app.post('/list', async (c) => {
//   const { folder } = await c.req.json()
//   return c.json(await listNotes({ folder }))
// })

serve(app, (info) => {
  console.log(`✅ MCPサーバー起動中： http://localhost:${info.port}`);
});
