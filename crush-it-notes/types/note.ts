export interface Note {
  id: string;

  author: string;
  to: string;
  content: string;

  color: string;
  x: number;
  y: number;
  rotation: number;

  // optional attached music (frontend camelCase)
  trackId?: string | null;
  trackName?: string | null;
  trackArtists?: string | null;
  trackImage?: string | null;
  trackPreviewUrl?: string | null;
  trackSpotifyUrl?: string | null;

  created_at?: string;
  updated_at?: string;
}