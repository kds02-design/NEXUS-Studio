// Nexus Studio 로그인 사용자를 로컬 Codex MCP와 연결하기 위한 일회용 토큰 발급 API.
// Firebase ID token을 검증한 뒤 동일 UID의 custom token만 반환한다.
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function adminAuth() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT가 설정되지 않았습니다.");
  if (!getApps().length) initializeApp({ credential: cert(JSON.parse(raw)) });
  return getAuth();
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: { message: "Method not allowed" } });
  }
  try {
    const idToken = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!idToken) return res.status(401).json({ error: { message: "Nexus 로그인이 필요합니다." } });
    const auth = adminAuth();
    const decoded = await auth.verifyIdToken(idToken, true);
    const customToken = await auth.createCustomToken(decoded.uid, {
      nexusCodex: true,
      scopes: [
        "library.read",
        "prompt_arc.personal.read",
        "prompt_arc.personal.create",
        "prompt_arc.folder.own.update",
        "render.execute",
      ],
    });
    return res.status(200).json({
      customToken,
      user: { uid: decoded.uid, email: decoded.email || null },
      expiresIn: 3600,
    });
  } catch (error) {
    return res.status(401).json({ error: { message: error?.message || String(error) } });
  }
}
