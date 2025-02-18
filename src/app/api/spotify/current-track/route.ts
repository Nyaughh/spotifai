import { type NextRequest } from "next/server";
import { getServerAuthSession } from "~/server/auth";

interface SpotifyCurrentlyPlaying {
  is_playing: boolean;
  item?: {
    id: string;
    name: string;
    artists: Array<{ name: string }>;
    album: {
      name: string;
      images: Array<{ url: string }>;
    };
    uri: string;
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const response = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    // No content means nothing is playing
    if (response.status === 204) {
      return new Response("No track currently playing", { status: 404 });
    }

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.statusText}`);
    }

    const data: SpotifyCurrentlyPlaying = await response.json();
    
    // If there's no item, nothing is playing
    if (!data.item) {
      return new Response("No track currently playing", { status: 404 });
    }

    // Transform the response to match our Track interface
    const track = {
      id: data.item.id,
      name: data.item.name,
      artists: data.item.artists,
      album: {
        name: data.item.album.name,
        images: data.item.album.images,
      },
      uri: data.item.uri,
      is_playing: data.is_playing,
    };

    return Response.json(track);
  } catch (error) {
    console.error("Error fetching current track:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
} 