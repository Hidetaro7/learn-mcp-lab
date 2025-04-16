import "dotenv/config";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { OpenAI } from "openai";
import fs from "fs/promises";

const app = new Hono();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// 呼び出せる関数を定義（ここに writeNote を追加）
const functions = [
  {
    name: "createFolder",
    description: "ローカルに新しいフォルダを作成します",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "作成したいフォルダ名" },
      },
      required: ["name"],
    },
  },
  {
    name: "writeNote",
    description: "テキストファイルを保存します",
    parameters: {
      type: "object",
      properties: {
        folder: { type: "string", description: "保存するフォルダ名" },
        title: {
          type: "string",
          description: "ファイルのタイトル（拡張子なし）",
        },
        content: { type: "string", description: "ファイルの中身（本文）" },
      },
      required: ["folder", "title", "content"],
    },
  },
];

// 実装本体：createFolder
async function createFolder({ name }: { name: string }) {
  const dir = `./data/${name}`;
  await fs.mkdir(dir, { recursive: true });
  return { message: `📁 フォルダ '${name}' を作成しました。` };
}

// 実装本体：writeNote
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
  const filePath = `${dir}/${title}.txt`;
  await fs.writeFile(filePath, content, "utf-8");
  return { message: `📝 '${title}.txt' を '${folder}' に保存しました。` };
}

// /ask エンドポイント：GPTによる関数呼び出し
app.post("/ask", async (c) => {
  const { message } = await c.req.json();

  const chat = await openai.chat.completions.create({
    model: "gpt-4-0613",
    messages: [
      {
        role: "system",
        content: "あなたはローカルファイル操作を行うAIエージェントです。",
      },
      { role: "user", content: message },
    ],
    functions,
    function_call: "auto",
  });

  const call = chat.choices[0].message.function_call;
  if (!call) {
    return c.json({ message: chat.choices[0].message.content });
  }

  const args = JSON.parse(call.arguments || "{}");

  if (call.name === "createFolder") {
    return c.json(await createFolder(args));
  }

  if (call.name === "writeNote") {
    return c.json(await writeNote(args));
  }

  return c.json({ error: `未対応の関数です: ${call.name}` });
});

serve(app, (info) => {
  console.log(`✅ MCPサーバー起動中: http://localhost:${info.port}`);
});
