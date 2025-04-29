import { useState } from "react";
import { askMcp } from "../lib/api";

type Message = {
  role: "user" | "assistant";
  content: string | null;
  files?: {
    title: string;
    filename: string;
    size: number;
    lastModified: string;
  }[];
  folder?: string;
  imageBase64?: string;
};

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const [lastNegativePrompt, setLastNegativePrompt] = useState<string | null>(
    null
  );

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      // 1回のリクエストで完結！
      const res = await askMcp({
        idea: userMessage,
        previousPrompt: lastPrompt,
        previousNegativePrompt: lastNegativePrompt,
      });

      const promptToUse = res.prompt;
      const negativeToUse = res.negativePrompt;
      const imageBase64 = res.imageBase64;

      setLastPrompt(promptToUse);
      setLastNegativePrompt(negativeToUse);

      // プロンプト表示
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `🎨 Prompt: ${promptToUse}` },
      ]);

      // 画像表示
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: null, imageBase64 },
      ]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `⚠️ エラー: ${e.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 640 }}>
      <h2>MCP チャット</h2>
      <div style={{ marginBottom: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 16 }}>
            <b>{m.role === "user" ? "🧑 あなた" : "🤖 MCP"}:</b>
            {m.content && (
              <div style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>
                {m.content}
              </div>
            )}

            {m.imageBase64 && (
              <img
                src={`data:image/png;base64,${m.imageBase64}`}
                alt="Generated"
                style={{ maxWidth: "100%", marginTop: 8, borderRadius: 4 }}
              />
            )}
          </div>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={10}
          style={{ width: "100%", marginBottom: 8, padding: "4px" }}
          placeholder="自然言語で命令を入力"
        />
        <button type="submit" disabled={loading}>
          {loading ? "送信中…" : "送信"}
        </button>
      </form>
    </div>
  );
}
