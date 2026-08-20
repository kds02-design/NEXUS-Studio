const LOCAL_MCP_ORIGIN = "http://127.0.0.1:47831";

export async function connectCodexAccount(user) {
  if (!user) throw new Error("Nexus 로그인이 필요합니다.");
  const idToken = await user.getIdToken(true);
  const issued = await fetch("/api/codex-link", {
    method: "POST",
    headers: { Authorization: `Bearer ${idToken}` },
  });
  const payload = await issued.json().catch(() => ({}));
  if (!issued.ok || !payload.customToken) {
    throw new Error(payload?.error?.message || "Codex 연결 토큰 발급에 실패했습니다.");
  }
  const connected = await fetch(`${LOCAL_MCP_ORIGIN}/connect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customToken: payload.customToken }),
  });
  const result = await connected.json().catch(() => ({}));
  if (!connected.ok || !result.ok) {
    throw new Error(result?.error || "로컬 Nexus MCP에 연결하지 못했습니다. Codex를 실행한 뒤 다시 시도하세요.");
  }
  return result;
}

export async function getCodexConnectionStatus() {
  const response = await fetch(`${LOCAL_MCP_ORIGIN}/status`, { cache: "no-store" });
  if (!response.ok) return { connected: false };
  return response.json();
}

export async function disconnectCodexAccount() {
  const response = await fetch(`${LOCAL_MCP_ORIGIN}/connect`, { method: "DELETE" });
  return response.json().catch(() => ({ ok: response.ok }));
}
