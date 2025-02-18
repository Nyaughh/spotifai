import { type NextRequest } from "next/server";
import { getServerAuthSession } from "~/server/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerAuthSession();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    // First, check if the track is already liked
    const checkResponse = await fetch(
      `https://api.spotify.com/v1/me/tracks/contains?ids=${params.id}`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      }
    );

    if (!checkResponse.ok) {
      throw new Error(`Failed to check track status: ${checkResponse.statusText}`);
    }

    const [isLiked] = await checkResponse.json();

    // Toggle like status
    const response = await fetch(
      `https://api.spotify.com/v1/me/tracks?ids=${params.id}`,
      {
        method: isLiked ? "DELETE" : "PUT",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update track like status: ${response.statusText}`);
    }

    return new Response(null, { status: 200 });
  } catch (error) {
    console.error("Error updating track like status:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
} 