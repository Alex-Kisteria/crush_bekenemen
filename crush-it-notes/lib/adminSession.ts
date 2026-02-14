import crypto from "crypto";

const COOKIE_NAME = "crushit_admin";
const MAX_AGE_SECONDS = 60 * 60 * 12; // 12h

function getSecret() {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s) throw new Error("Missing ADMIN_SESSION_SECRET");
  return s;
}

function sign(payload: string) {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function makeAdminCookieValue(nowMs = Date.now()) {
  const ts = String(Math.floor(nowMs / 1000));
  const sig = sign(ts);
  return `v1.${ts}.${sig}`;
}

export function isValidAdminCookieValue(value: string | null | undefined, nowMs = Date.now()) {
  if (!value) return false;
  const parts = value.split(".");
  if (parts.length !== 3) return false;
  const [v, tsStr, sig] = parts;
  if (v !== "v1") return false;

  const ts = Number(tsStr);
  if (!Number.isFinite(ts) || ts <= 0) return false;

  const age = Math.floor(nowMs / 1000) - ts;
  if (age < 0 || age > MAX_AGE_SECONDS) return false;

  const expected = sign(tsStr);
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

export const adminCookie = {
  name: COOKIE_NAME,
  maxAge: MAX_AGE_SECONDS,
};