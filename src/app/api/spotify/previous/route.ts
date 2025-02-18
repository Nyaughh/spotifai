import { type NextRequest } from "next/server";
import { getServerAuthSession } from "~/server/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const response = await fetch("https://api.spotify.com/v1/me/player/previous", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to skip track: ${response.statusText}`);
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Error skipping to previous track:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
} 