import { type NextRequest } from "next/server";
import { getServerAuthSession } from "~/server/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerAuthSession();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const response = await fetch(
      `https://api.spotify.com/v1/playlists/${params.id}/tracks`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch playlist tracks: ${response.statusText}`);
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error("Error fetching playlist tracks:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
} 