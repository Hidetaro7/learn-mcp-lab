import "dotenv/config";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { OpenAI } from "openai";
import { cors } from "hono/cors";
const app = new Hono();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
app.use("*", cors());
// 1️⃣ 使用する関数を定義（2つのみ）
const functions = [
  {
    name: "suggestPrompt",
    description: "画像生成に適したプロンプトを提案します",
    parameters: {
      type: "object",
      properties: {
        idea: { type: "string", description: "ユーザーのイメージや要望" },
      },
      required: ["idea"],
    },
  },
  {
    name: "generateImage",
    description: "Stable Diffusion API を使って画像を生成します",
    parameters: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "画像生成に使用するプロンプト" },
        steps: {
          type: "number",
          description: "画像生成のステップ数",
          default: 20,
        },
        width: { type: "number", description: "画像の幅(px)", default: 512 },
        height: { type: "number", description: "画像の高さ(px)", default: 512 },
      },
      required: ["prompt"],
    },
  },
];

// 2️⃣ suggestPrompt 実装
async function suggestPrompt({
  idea,
  previousPrompt,
  previousNegativePrompt,
}: {
  idea: string;
  previousPrompt?: string;
  previousNegativePrompt?: string;
}) {
  console.log("🧠 suggestPrompt 実行:", { idea, previousPrompt });

  // null ではなく確実に string
  const userMessageText = previousPrompt
    ? `Previous prompt: ${previousPrompt}\nPrevious negative prompt: ${previousNegativePrompt}\nChange request: ${idea}`
    : `Please create prompts for this idea: ${idea}`;

  const gpt = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: `
You are an assistant for Stable Diffusion image generation.
Always respond in strict JSON like this:

{
  "prompt": "...",
  "negativePrompt": "..."
}

Only output JSON. No explanations.
        `.trim(),
      },
      { role: "user", content: userMessageText },
    ],
  });

  const content = gpt.choices[0].message.content ?? "{}";
  let result = { prompt: "[Prompt failed]", negativePrompt: "" };
  try {
    result = JSON.parse(content);
  } catch (e) {
    console.error("❌ JSON parse error:", e);
  }

  return result;
}

// 3️⃣ generateImage 実装
async function generateImage({
  prompt,
  negativePrompt = "",
  steps = 20,
  width = 512,
  height = 512,
}: {
  prompt: string;
  negativePrompt?: string;
  steps?: number;
  width?: number;
  height?: number;
}) {
  console.log("🎨 generateImage 実行:", {
    prompt,
    negativePrompt,
    steps,
    width,
    height,
  });

  const response = await fetch("http://192.168.40.55:7860/sdapi/v1/txt2img", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      negative_prompt: negativePrompt,
      steps,
      width,
      height,
    }),
  });

  if (!response.ok) {
    throw new Error(`Stable Diffusion API エラー: ${response.status}`);
  }

  const result = await response.json();
  console.log("🖼️ 画像生成結果（Base64省略）:", result);

  return { imageBase64: result.images?.[0] ?? null };
}

// 4️⃣ /ask エンドポイント
app.post("/ask", async (c) => {
  const { idea, previousPrompt, previousNegativePrompt } = await c.req.json();
  console.log("📥 受信:", { idea, previousPrompt, previousNegativePrompt });

  if (!idea || idea.trim() === "") {
    return c.json({ error: "Ideaが空です！" });
  }

  const { prompt, negativePrompt } = await suggestPrompt({
    idea,
    previousPrompt,
    previousNegativePrompt,
  });
  const { imageBase64 } = await generateImage({ prompt, negativePrompt });

  return c.json({ prompt, negativePrompt, imageBase64 });
});

serve(app, (info) => {
  console.log(
    `🎨 MCP + Stable Diffusion サーバー起動中: http://localhost:${info.port}`
  );
});
