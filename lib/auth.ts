import crypto from "crypto";

const COOKIE_NAME = "surat_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 jam

export function signSession(payload: object) {
  const secret = process.env.SESSION_SECRET || "dev-secret-change-me";
  const data = JSON.stringify({
    ...payload,
    exp: Date.now() + SESSION_TTL_SECONDS * 1000,
  });

  const sig = crypto.createHmac("sha256", secret).update(data).digest("hex");
  const token = Buffer.from(data).toString("base64url") + "." + sig;
  return token;
}

export function verifySession(token?: string | null) {
  if (!token) return null;
  const secret = process.env.SESSION_SECRET || "dev-secret-change-me";
  const [b64, sig] = token.split(".");
  if (!b64 || !sig) return null;

  const data = Buffer.from(b64, "base64url").toString("utf8");
  const expected = crypto.createHmac("sha256", secret).update(data).digest("hex");
  if (expected !== sig) return null;

  const obj = JSON.parse(data);
  if (!obj?.exp || Date.now() > obj.exp) return null;
  return obj as { userId: number; role: string; name: string; email: string; exp: number };
}

export function cookieName() {
  return COOKIE_NAME;
}
