import { type NextRequest } from "next/server";
import { getServerAuthSession } from "~/server/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { position_ms } = await req.json();
    if (typeof position_ms !== 'number') {
      return new Response("Invalid position", { status: 400 });
    }

    const response = await fetch("https://api.spotify.com/v1/me/player/seek", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ position_ms }),
    });

    if (!response.ok) {
      throw new Error(`Failed to seek: ${response.statusText}`);
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Error seeking:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
} 