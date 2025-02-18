import { type Session } from "next-auth";

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

// Helper to get access token from session
const getAccessToken = (session: Session | null) => {
  if (!session?.user) {
    throw new Error('User not authenticated');
  }
  return (session as any)?.accessToken;
};

// Fetch with authorization header
const spotifyFetch = async (
  endpoint: string,
  session: Session | null,
  options: RequestInit = {}
) => {
  const accessToken = getAccessToken(session);
  const response = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Spotify API error: ${response.statusText}`);
  }

  // Return null for 204 No Content responses
  if (response.status === 204) {
    return null;
  }

  // Only try to parse JSON for responses that should have JSON bodies
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }

  return null;
};

// Get current user's profile
export const getCurrentUserProfile = async (session: Session | null) => {
  return spotifyFetch('/me', session);
};

// Get user's playlists
export const getUserPlaylists = async (session: Session | null) => {
  return spotifyFetch('/me/playlists', session);
};

// Get currently playing track
export const getCurrentlyPlaying = async (session: Session | null) => {
  return spotifyFetch('/me/player/currently-playing', session);
};

// Control playback
export const playTrack = async (session: Session | null, trackUri?: string) => {
  return spotifyFetch('/me/player/play', session, {
    method: 'PUT',
    body: trackUri ? JSON.stringify({ uris: [trackUri] }) : undefined,
  });
};

export const pausePlayback = async (session: Session | null) => {
  return spotifyFetch('/me/player/pause', session, {
    method: 'PUT',
  });
};

// Search tracks
export const searchTracks = async (session: Session | null, query: string) => {
  return spotifyFetch(`/search?type=track&q=${encodeURIComponent(query)}`, session);
};

// Get track details
export const getTrackDetails = async (session: Session | null, trackId: string) => {
  return spotifyFetch(`/tracks/${trackId}`, session);
};

// Get user's top tracks
export const getTopTracks = async (session: Session | null) => {
  return spotifyFetch('/me/top/tracks', session);
};

// Get user's saved tracks
export const getSavedTracks = async (session: Session | null) => {
  return spotifyFetch('/me/tracks', session);
}; 