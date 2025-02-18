import { type NextRequest } from "next/server";
import { getServerAuthSession } from "~/server/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    let body = undefined;
    try {
      const data = await req.json();
      if (data.uri) {
        body = JSON.stringify({ uris: [data.uri] });
      }
    } catch {
      // No body provided, resume playback without specific track
    }

    const response = await fetch("https://api.spotify.com/v1/me/player/play", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
      body,
    });

    if (!response.ok) {
      throw new Error(`Failed to start playback: ${response.statusText}`);
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Error starting playback:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
} 