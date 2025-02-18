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

IMPORTANT INSTRUCTIONS:
1. Keep responses concise and engaging
2. DO NOT include any thinking process or <think> tags
3. When responding to playback commands:
   - Give a brief response
   - Include exactly ONE function call in JSON format
   - Format must be: "Your response" followed by JSON
4. For unclear commands, ask for clarification
5. If user asks for a song, search for it and play it`;


interface FunctionCall {
  function: string;
  args: Record<string, string>;
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
        max_tokens: 150,
        top_p: 1,
        stream: false,
      });

      const response = completion.choices[0]?.message?.content?.trim() ?? 
        "I'm not sure how to respond to that.";

      // Create a caller for executing tRPC procedures
      const caller = createCaller(ctx);

      // Check if the response contains a function call
      const regex = /\{(?:[^{}]|{[^{}]*})*\}/;
      const functionMatch = regex.exec(response);
      
      if (functionMatch) {
        try {
          const functionCall = JSON.parse(functionMatch[0]) as FunctionCall;
          let success = false;

          // Execute the appropriate function based on the AI's response
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
              console.log("Searching for tracks:", functionCall);
              const searchResults = await caller.spotify.searchTracks({
                  query: functionCall.args.query ?? ''
                
              });
              const topTrack = searchResults.tracks?.items[0];
              if (topTrack?.uri) {
                await caller.spotify.play({ uri: topTrack.uri });
                success = true;
              }
              break;
          }

          // Remove the function call JSON and any thinking text from the response
          const cleanResponse = response
            .replace(/<think>[\s\S]*?<\/think>/, '')
            .replace(regex, '')
            .trim();

          return {
            response: cleanResponse,
            functionCall: {
              name: functionCall.function,
              args: functionCall.args,
              result: success,
            },
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