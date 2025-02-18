import { type NextRequest } from "next/server";
import { searchTracks } from "~/utils/spotify";
import { getServerAuthSession } from "~/server/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get("q");

    if (!query) {
      return new Response("Missing search query", { status: 400 });
    }

    const results = await searchTracks(session, query);
    return Response.json(results);
  } catch (error) {
    console.error("Error searching tracks:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
} 