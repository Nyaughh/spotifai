import { type NextRequest } from "next/server";
import { getServerAuthSession } from "~/server/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { volume_percent } = await req.json();
    if (typeof volume_percent !== 'number' || volume_percent < 0 || volume_percent > 100) {
      return new Response("Invalid volume", { status: 400 });
    }

    const response = await fetch("https://api.spotify.com/v1/me/player/volume", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ volume_percent }),
    });

    if (!response.ok) {
      throw new Error(`Failed to set volume: ${response.statusText}`);
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Error setting volume:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
} 