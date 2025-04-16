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
};

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [saveFolder, setSaveFolder] = useState("");
  const [saveTitle, setSaveTitle] = useState("");
  const [saveContent, setSaveContent] = useState("");

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const res = await askMcp(userMessage);
      const reply: Message = {
        role: "assistant",
        content: (res.message || res.summary) ?? null,
        files: res.files ?? undefined,
        folder: res.files ? extractFolderName(userMessage) : undefined,
      };

      setMessages((prev) => [...prev, reply]);
    } catch (e: unknown) {
      const errorMessage =
        e instanceof Error ? e.message : "不明なエラーが発生しました";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `⚠️ エラー: ${errorMessage}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleReadNote = async (folder: string, title: string) => {
    setLoading(true);
    setMessages((prev) => [
      ...prev,
      { role: "user", content: `${folder} の ${title} を読みたい` },
    ]);

    try {
      const res = await askMcp(
        `「${folder}」フォルダの「${title}」というファイルを読んで`
      );
      const reply: Message = {
        role: "assistant",
        content: res.content ?? res.message ?? "[読み取り失敗]",
      };
      setMessages((prev) => [...prev, reply]);
    } catch (e: unknown) {
      const errorMessage =
        e instanceof Error ? e.message : "不明なエラーが発生しました";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ 読み取り中にエラー: ${errorMessage}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNote = async () => {
    if (!saveFolder || !saveTitle || !saveContent) return;
    setLoading(true);

    const prompt = `「${saveFolder}」フォルダに「${saveTitle}」というファイル名で次の内容を保存して：${saveContent}`;

    setMessages((prev) => [...prev, { role: "user", content: prompt }]);

    try {
      const res = await askMcp(prompt);
      const reply: Message = {
        role: "assistant",
        content: res.message ?? "[保存成功]",
      };
      setMessages((prev) => [...prev, reply]);
      setSaveFolder("");
      setSaveTitle("");
      setSaveContent("");
    } catch (e: unknown) {
      const errorMessage =
        e instanceof Error ? e.message : "不明なエラーが発生しました";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `⚠️ 保存中にエラー: ${errorMessage}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const extractFolderName = (msg: string): string => {
    const match = msg.match(/「?(.+?)」?\s?フォルダ/);
    return match?.[1] ?? "不明";
  };

  return (
    <div style={{ padding: 20, maxWidth: 640, margin: "0 auto" }}>
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
            {m.files && (
              <table
                style={{
                  width: "100%",
                  marginTop: 8,
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr>
                    <th align="left">📄 タイトル</th>
                    <th align="left">更新日</th>
                    <th align="right">サイズ</th>
                  </tr>
                </thead>
                <tbody>
                  {m.files.map((file, idx) => (
                    <tr key={idx}>
                      <td
                        style={{ cursor: "pointer", color: "#0077cc" }}
                        onClick={() =>
                          handleReadNote(m.folder || "不明", file.title)
                        }
                      >
                        {file.title}
                      </td>
                      <td>{new Date(file.lastModified).toLocaleString()}</td>
                      <td align="right">{(file.size / 1024).toFixed(1)} KB</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={3}
        style={{ width: "100%", marginBottom: 8 }}
        placeholder="自然言語で命令を入力"
      />
      <button onClick={handleSend} disabled={loading}>
        {loading ? "送信中…" : "送信"}
      </button>

      <hr style={{ margin: "24px 0" }} />
      <h3>📥 メモを保存</h3>
      <input
        type="text"
        placeholder="フォルダ名"
        value={saveFolder}
        onChange={(e) => setSaveFolder(e.target.value)}
        style={{ width: "100%", marginBottom: 8 }}
      />
      <input
        type="text"
        placeholder="ファイルタイトル"
        value={saveTitle}
        onChange={(e) => setSaveTitle(e.target.value)}
        style={{ width: "100%", marginBottom: 8 }}
      />
      <textarea
        rows={3}
        placeholder="保存する本文"
        value={saveContent}
        onChange={(e) => setSaveContent(e.target.value)}
        style={{ width: "100%", marginBottom: 8 }}
      />
      <button onClick={handleSaveNote} disabled={loading}>
        {loading ? "保存中…" : "保存する"}
      </button>
    </div>
  );
}
