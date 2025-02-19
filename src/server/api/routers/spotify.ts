import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

const handleSpotifyError = async (response: Response) => {
  const error = await response.json();
  if (response.status === 401) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Spotify session expired. Please sign in again.",
    });
  }
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: error.error?.message ?? "Failed to complete Spotify request",
  });
};

export const spotifyRouter = createTRPCRouter({
  getCurrentTrack: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.accessToken) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Not authenticated with Spotify",
      });
    }

    try {
      const response = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
        headers: {
          Authorization: `Bearer ${ctx.session.accessToken}`,
        },
      });

      if (response.status === 204) return null;
      if (!response.ok) {
        await handleSpotifyError(response);
      }

      return response.json();
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
      });
    }
  }),

  getPlayerState: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.accessToken) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Not authenticated with Spotify",
      });
    }

    try {
      const response = await fetch("https://api.spotify.com/v1/me/player", {
        headers: {
          Authorization: `Bearer ${ctx.session.accessToken}`,
        },
      });

      if (response.status === 204) return null;
      if (!response.ok) {
        await handleSpotifyError(response);
      }

      return response.json();
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
      });
    }
  }),

  play: protectedProcedure
    .input(z.object({ uri: z.string().optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.accessToken) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated with Spotify",
        });
      }

      try {
        const response = await fetch("https://api.spotify.com/v1/me/player/play", {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${ctx.session.accessToken}`,
            "Content-Type": "application/json",
          },
          body: input?.uri ? JSON.stringify({ uris: [input.uri] }) : undefined,
        });

        if (!response.ok) {
          await handleSpotifyError(response);
        }

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred",
        });
      }
    }),

  pause: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.session?.accessToken) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Not authenticated with Spotify",
      });
    }

    try {
      const response = await fetch("https://api.spotify.com/v1/me/player/pause", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${ctx.session.accessToken}`,
        },
      });

      if (!response.ok) {
        await handleSpotifyError(response);
      }

      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
      });
    }
  }),

  next: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.session?.accessToken) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Not authenticated with Spotify",
      });
    }

    try {
      const response = await fetch("https://api.spotify.com/v1/me/player/next", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ctx.session.accessToken}`,
        },
      });

      if (!response.ok) {
        await handleSpotifyError(response);
      }

      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
      });
    }
  }),

  previous: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.session?.accessToken) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Not authenticated with Spotify",
      });
    }

    try {
      const response = await fetch("https://api.spotify.com/v1/me/player/previous", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ctx.session.accessToken}`,
        },
      });

      if (!response.ok) {
        await handleSpotifyError(response);
      }

      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
      });
    }
  }),

  seek: protectedProcedure
    .input(z.object({ position_ms: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.accessToken) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated with Spotify",
        });
      }

      try {
        const response = await fetch(
          `https://api.spotify.com/v1/me/player/seek?position_ms=${input.position_ms}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${ctx.session.accessToken}`,
            },
          }
        );

        if (!response.ok) {
          await handleSpotifyError(response);
        }

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred",
        });
      }
    }),

  setVolume: protectedProcedure
    .input(z.object({ volume_percent: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.accessToken) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated with Spotify",
        });
      }

      try {
        const response = await fetch(
          `https://api.spotify.com/v1/me/player/volume?volume_percent=${input.volume_percent}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${ctx.session.accessToken}`,
            },
          }
        );

        if (!response.ok) {
          await handleSpotifyError(response);
        }

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred",
        });
      }
    }),

  getPlaylists: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.accessToken) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Not authenticated with Spotify",
      });
    }

    try {
      const response = await fetch("https://api.spotify.com/v1/me/playlists", {
        headers: {
          Authorization: `Bearer ${ctx.session.accessToken}`,
        },
      });

      if (!response.ok) {
        console.log("Error fetching playlists:", response);
        await handleSpotifyError(response);
      }

      return response.json();
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
      });
    }
  }),

  createPlaylist: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.accessToken) throw new Error("No access token");

      const response = await fetch("https://api.spotify.com/v1/me/playlists", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ctx.session.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: input.name,
          public: false,
        }),
      });

      if (!response.ok) throw new Error("Failed to create playlist");
      return response.json();
    }),

  getPlaylistTracks: protectedProcedure
    .input(z.object({ playlistId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.session.accessToken) throw new Error("No access token");

      const response = await fetch(
        `https://api.spotify.com/v1/playlists/${input.playlistId}/tracks`,
        {
          headers: {
            Authorization: `Bearer ${ctx.session.accessToken}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch playlist tracks");
      return response.json();
    }),

  searchTracks: protectedProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.accessToken) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated with Spotify",
        });
      }

      try {
        const response = await fetch(
          `https://api.spotify.com/v1/search?type=track&q=${encodeURIComponent(input.query)}`,
          {
            headers: {
              Authorization: `Bearer ${ctx.session.accessToken}`,
            },
          }
        );

        if (!response.ok) {
          await handleSpotifyError(response);
        }

        return response.json();
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred",
        });
      }
    }),

  shuffle: protectedProcedure
    .input(z.object({ state: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.accessToken) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated with Spotify",
        });
      }

      try {
        const response = await fetch(
          `https://api.spotify.com/v1/me/player/shuffle?state=${input.state}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${ctx.session.accessToken}`,
            },
          }
        );

        if (!response.ok) {
          await handleSpotifyError(response);
        }

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred",
        });
      }
    }),

  repeat: protectedProcedure
    .input(z.object({ state: z.enum(['off', 'track', 'context']) }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.accessToken) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated with Spotify",
        });
      }

      try {
        const response = await fetch(
          `https://api.spotify.com/v1/me/player/repeat?state=${input.state}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${ctx.session.accessToken}`,
            },
          }
        );

        if (!response.ok) {
          await handleSpotifyError(response);
        }

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred",
        });
      }
    }),

  getTopTracks: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.accessToken) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Not authenticated with Spotify",
      });
    }

    try {
      const response = await fetch(
        "https://api.spotify.com/v1/me/top/tracks?limit=10&time_range=short_term",
        {
          headers: {
            Authorization: `Bearer ${ctx.session.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        await handleSpotifyError(response);
      }

      return response.json();
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
      });
    }
  }),

  getTopArtists: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.accessToken) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Not authenticated with Spotify",
      });
    }

    try {
      const response = await fetch(
        "https://api.spotify.com/v1/me/top/artists?limit=8&time_range=short_term",
        {
          headers: {
            Authorization: `Bearer ${ctx.session.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        await handleSpotifyError(response);
      }

      return response.json();
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
      });
    }
  }),

  addToQueue: protectedProcedure
    .input(z.object({ uri: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.accessToken) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated with Spotify",
        });
      }

      try {
        const response = await fetch(
          `https://api.spotify.com/v1/me/player/queue?uri=${input.uri}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${ctx.session.accessToken}`,
            },
          }
        );

        if (!response.ok) {
          await handleSpotifyError(response);
        }

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred",
        });
      }
    }),

  getQueue: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.accessToken) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Not authenticated with Spotify",
      });
    }

    try {
      const response = await fetch(
        "https://api.spotify.com/v1/me/player/queue",
        {
          headers: {
            Authorization: `Bearer ${ctx.session.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        await handleSpotifyError(response);
      }

      return response.json();
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
      });
    }
  }),

  addTracksToPlaylist: protectedProcedure
    .input(z.object({ 
      playlistId: z.string(),
      uris: z.array(z.string())
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.accessToken) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated with Spotify",
        });
      }

      try {
        const response = await fetch(
          `https://api.spotify.com/v1/playlists/${input.playlistId}/tracks`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${ctx.session.accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              uris: input.uris,
            }),
          }
        );

        if (!response.ok) {
          await handleSpotifyError(response);
        }

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred",
        });
      }
    }),
}); 