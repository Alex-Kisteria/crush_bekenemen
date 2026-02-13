import { NextResponse } from "next/server";
import { spotifyFetch } from "@/lib/spotify";

type SpotifySearchResponse = {
  tracks?: {
    items: Array<{
      id: string;
      name: string;
      preview_url: string | null;
      duration_ms: number;
      external_urls: { spotify: string };
      artists: Array<{ name: string }>;
      album: { name: string; images: Array<{ url: string; width: number; height: number }> };
    }>;
  };
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get("query") || "").trim();

  if (!query) {
    return NextResponse.json({ tracks: [] });
  }

  // keep it small + safe
  const limit = Math.min(Number(searchParams.get("limit") || 10), 15);

  const data = await spotifyFetch<SpotifySearchResponse>(
    `/search?type=track&limit=${limit}&q=${encodeURIComponent(query)}`,
  );

  const tracks = (data.tracks?.items ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    artists: t.artists.map((a) => a.name).join(", "),
    album: t.album.name,
    image: t.album.images?.[0]?.url ?? null,
    previewUrl: t.preview_url,
    spotifyUrl: t.external_urls.spotify,
    durationMs: t.duration_ms,
  }));

  return NextResponse.json({ tracks });
}