import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });

  // Add token to request headers for API routes
  if (request.nextUrl.pathname.startsWith('/api/spotify/')) {
    if (!token?.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Clone the request headers and add the token
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-spotify-token', token.accessToken as string);

    // Create a new request with the updated headers
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/spotify/:path*',
  ],
}; 