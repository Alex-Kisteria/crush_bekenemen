'use server';

export async function searchSpotifyTracks(query: string) {
  if (!query) return [];

  // 👇 UPDATED: We removed 'NEXT_PUBLIC_' to keep the secret secure
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("Missing Spotify Keys in .env.local");
    return [];
  }

  // 1. Get Access Token
  const authResponse = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: 'grant_type=client_credentials',
  });

  const authData = await authResponse.json();
  const token = authData.access_token;

  // 2. Search for the track
  const searchResponse = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const searchData = await searchResponse.json();
  
  // 3. Return simplified data
  // Add a check to make sure 'tracks' exists to prevent crashing
  if (!searchData.tracks) return [];

  return searchData.tracks.items.map((track: any) => ({
    id: track.id,
    name: track.name,
    artist: track.artists[0].name,
    albumArt: track.album.images[2]?.url, 
  }));
}