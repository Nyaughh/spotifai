import { type NextRequest } from "next/server";
import { getUserPlaylists } from "~/utils/spotify";
import { getServerAuthSession } from "~/server/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const playlists = await getUserPlaylists(session);
    return Response.json(playlists);
  } catch (error) {
    console.error("Error fetching playlists:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { name } = await req.json();
    if (!name) {
      return new Response("Name is required", { status: 400 });
    }

    const response = await fetch(
      `https://api.spotify.com/v1/me/playlists`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          public: false,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create playlist: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error("Error creating playlist:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
} 