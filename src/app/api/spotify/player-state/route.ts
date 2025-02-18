import { type NextRequest } from "next/server";
import { getServerAuthSession } from "~/server/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const response = await fetch("https://api.spotify.com/v1/me/player", {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    // No content means no active device
    if (response.status === 204) {
      return Response.json({
        is_playing: false,
        progress_ms: 0,
        duration_ms: 0,
        volume_percent: 50,
      });
    }

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return Response.json({
      is_playing: data.is_playing,
      progress_ms: data.progress_ms,
      duration_ms: data.item?.duration_ms,
      volume_percent: data.device?.volume_percent,
    });
  } catch (error) {
    console.error("Error fetching player state:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
} 