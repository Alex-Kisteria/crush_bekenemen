export function getRequestIp(req: Request) {
  // Prefer platform-specific headers if present
  const vercel = req.headers.get("x-vercel-forwarded-for");
  if (vercel) return vercel.split(",")[0]?.trim() || "unknown";

  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();

  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || "unknown";

  const xr = req.headers.get("x-real-ip");
  if (xr) return xr.trim();

  return "unknown";
}