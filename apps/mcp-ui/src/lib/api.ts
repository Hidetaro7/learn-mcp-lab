// src/lib/api.ts

export async function askMcp(data: any) {
  const res = await fetch("http://localhost:3000/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    console.log("❌ MCPサーバーエラー:", res);

    throw new Error(`MCPサーバーエラー: ${res.status}`);
  }

  return await res.json();
}
