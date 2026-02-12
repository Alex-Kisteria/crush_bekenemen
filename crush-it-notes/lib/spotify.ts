type TokenCache = {
  accessToken: string;
  expiresAtMs: number;
} | null;

let tokenCache: TokenCache = null;

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
}

export async function getSpotifyAccessToken(): Promise<string> {
  const now = Date.now();

  if (tokenCache && tokenCache.expiresAtMs - 10_000 > now) {
    return tokenCache.accessToken;
  }

  const clientId = requireEnv("SPOTIFY_CLIENT_ID");
  const clientSecret = requireEnv("SPOTIFY_CLIENT_SECRET");

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
    // Next.js: don't cache this at the edge
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Spotify token error (${res.status}): ${txt}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };

  tokenCache = {
    accessToken: data.access_token,
    expiresAtMs: now + data.expires_in * 1000,
  };

  return tokenCache.accessToken;
}

export async function spotifyFetch<T>(
  path: string,
  init?: Omit<RequestInit, "headers"> & { headers?: Record<string, string> },
): Promise<T> {
  const token = await getSpotifyAccessToken();

  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Spotify API error (${res.status}): ${txt}`);
  }

  return (await res.json()) as T;
}