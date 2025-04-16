// src/lib/api.ts

export async function askMcp(message: string) {
  const res = await fetch("http://localhost:3000/ask", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message }),
  });

  if (!res.ok) {
    throw new Error(`MCPサーバーエラー: ${res.status}`);
  }

  return await res.json();
}
