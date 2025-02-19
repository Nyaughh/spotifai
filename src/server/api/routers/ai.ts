import { z } from "zod";
import { Groq } from "groq-sdk";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { createCaller } from "~/server/api/root";
import { type AppRouter } from "~/server/api/root";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const systemPrompt = `You are a friendly and helpful music assistant for Spotify. You can chat about music and control playback through function calls.

Available functions:
- playTrack(uri: string) - Play a specific track
- pausePlayback() - Pause the current playback
- resumePlayback() - Resume playback
- skipToNext() - Skip to the next track
- skipToPrevious() - Skip to the previous track
- searchTracksAndPlay({ query: string }) - Search for tracks and play the first result
- createPlaylist({ name: string, query: string, limit?: number }) - Create a new playlist and automatically fill it with songs

IMPORTANT INSTRUCTIONS:
1. Keep responses concise and engaging
2. DO NOT include any thinking process or <think> tags
3. When responding to playback commands:
   - Give a brief response
   - Include exactly ONE function call in JSON format
   - Format must be: "Your response" followed by JSON
4. For playlist creation:
   - Use a SINGLE createPlaylist call with both the name and query
   - The query should describe what kind of songs to add, only add what the user asks for and nothing else
   - Optionally specify limit (default is 10)
   - Format example for creating a Beatles playlist:
     I'll create a Beatles playlist for you!
     {"function":"createPlaylist","args":{"name":"Beatles Hits","query":"The Beatles greatest hits popular songs","limit":10}}
5. For unclear commands, ask for clarification
6. If user asks for a song, search for it and play it

Example responses:
For playing a song:
"Playing Shape of You by Ed Sheeran"
{"function":"searchTracksAndPlay","args":{"query":"Shape of You Ed Sheeran"}}

For creating a playlist:
"Creating a rock workout playlist for you!"
{"function":"createPlaylist","args":{"name":"Rock Workout","query":"best high energy rock songs for workout gym motivation","limit":15}}`;

interface FunctionCall {
  function: string;
  args: Record<string, any>;
}

interface SpotifyTrack {
  uri: string;
}

interface FunctionResult {
  name: string;
  args: Record<string, any>;
  result: boolean;
}

export const aiRouter = createTRPCRouter({
  chat: protectedProcedure
    .input(z.object({ message: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: input.message,
          },
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_tokens: 500,
        top_p: 1,
        stream: false,
      });

      const response = completion.choices[0]?.message?.content?.trim() ?? 
        "I'm not sure how to respond to that.";

      console.log('AI Response:', response); // Debug log

      const regex = /\{(?:[^{}]|{[^{}]*})*\}/g;
      const functionMatches = response.match(regex);
      
      if (functionMatches) {
        try {
          console.log('Found function matches:', functionMatches); // Debug log
          const results: FunctionResult[] = [];
          const functionCalls = functionMatches.map(match => JSON.parse(match) as FunctionCall);
          console.log('Parsed function calls:', functionCalls); // Debug log
          const caller = createCaller(ctx);

          for (const functionCall of functionCalls) {
            console.log('Processing function call:', functionCall); // Debug log
            let success = false;

            switch (functionCall.function) {
              case 'playTrack':
                await caller.spotify.play({ uri: functionCall.args.uri });
                success = true;
                break;

              case 'pausePlayback':
                await caller.spotify.pause();
                success = true;
                break;

              case 'resumePlayback':
                await caller.spotify.play({});
                success = true;
                break;

              case 'skipToNext':
                await caller.spotify.next();
                success = true;
                break;

              case 'skipToPrevious':
                await caller.spotify.previous();
                success = true;
                break;

              case 'searchTracksAndPlay':
                const searchResults = await caller.spotify.searchTracks({
                  query: functionCall.args.query ?? ''
                });
                const topTrack = searchResults.tracks?.items[0];
                if (topTrack?.uri) {
                  await caller.spotify.play({ uri: topTrack.uri });
                  success = true;
                }
                break;

              case 'createPlaylist':
                console.log('Creating playlist with args:', functionCall.args); // Debug log
                // Create the playlist
                const playlist = await caller.spotify.createPlaylist({
                  name: functionCall.args.name
                });
                console.log('Created playlist:', playlist); // Debug log
                
                if (playlist && functionCall.args.query) {
                  // Search for tracks
                  const tracks = await caller.spotify.searchTracks({
                    query: functionCall.args.query
                  });
                  console.log('Found tracks:', tracks.tracks?.items.length); // Debug log
                  
                  // Add tracks to the playlist
                  const selectedTracks = tracks.tracks?.items.slice(0, functionCall.args.limit || 10);
                  if (selectedTracks?.length > 0) {
                    const trackUris = selectedTracks.map((track: SpotifyTrack) => track.uri);
                    await caller.spotify.addTracksToPlaylist({
                      playlistId: playlist.id,
                      uris: trackUris
                    });
                    success = true;
                    console.log('Successfully added tracks to playlist:', playlist.id); // Debug log
                  }
                }
                break;
            }

            results.push({
              name: functionCall.function,
              args: functionCall.args,
              result: success,
            });
          }

          const cleanResponse = response
            .replace(/<think>[\s\S]*?<\/think>/, '')
            .replace(regex, '')
            .trim();

          return {
            response: cleanResponse,
            functionCalls: results,
          };
        } catch (error) {
          console.error('Error executing function:', error);
          const cleanResponse = response
            .replace(/<think>[\s\S]*?<\/think>/, '')
            .replace(regex, '')
            .trim();
          return { response: cleanResponse };
        }
      }

      // Clean up any thinking blocks if present
      const cleanResponse = response
        .replace(/<think>[\s\S]*?<\/think>/, '')
        .trim();

      return { response: cleanResponse };
    }),
}); 