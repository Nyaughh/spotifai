import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

type FunctionParams = Record<string, string>;

// Define available functions
const availableFunctions = {
  playTrack: async (params: FunctionParams) => {
    const response = await fetch('/api/spotify/player/play', {
      method: 'PUT',
      body: JSON.stringify({ trackId: params.trackId }),
    });
    return response.ok;
  },
  createPlaylist: async (params: FunctionParams) => {
    const response = await fetch('/api/spotify/playlists', {
      method: 'POST',
      body: JSON.stringify({ 
        name: params.name, 
        description: params.description 
      }),
    });
    return response.ok;
  },
  pausePlayback: async () => {
    const response = await fetch('/api/spotify/player/pause', {
      method: 'PUT',
    });
    return response.ok;
  },
  resumePlayback: async () => {
    const response = await fetch('/api/spotify/player/play', {
      method: 'PUT',
    });
    return response.ok;
  },
  skipToNext: async () => {
    const response = await fetch('/api/spotify/player/next', {
      method: 'POST',
    });
    return response.ok;
  },
  skipToPrevious: async () => {
    const response = await fetch('/api/spotify/player/previous', {
      method: 'POST',
    });
    return response.ok;
  },
};

const systemPrompt = `You are a helpful AI assistant for Spotify. You can control playback and manage playlists.
Your task is to analyze user requests and convert them into function calls.

Here are the available functions:
- For "pause" or "stop" -> use pausePlayback()
- For "play" or "resume" -> use resumePlayback()
- For "next" or "skip" -> use skipToNext()
- For "previous" or "back" -> use skipToPrevious()
- For creating playlists -> use createPlaylist(name, description)

IMPORTANT: Respond ONLY with a JSON object in this EXACT format:
For functions without parameters:
{"function": "functionName"}

For functions with parameters:
{"function": "createPlaylist", "params": {"name": "playlist name", "description": "playlist description"}}

Do not include any other text in your response. Only the JSON object.`;

export async function POST(request: Request) {
  try {
    const { message } = await request.json();

    // Initialize the model
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    // Send the message with system prompt
    const prompt = `${systemPrompt}\n\nUser request: "${message}"\nRespond with the appropriate function call:`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    console.log('AI Response:', text); // Debug log

    try {
      // Try to parse the response as JSON
      const functionCall = JSON.parse(text);
      
      if (functionCall.function && functionCall.function in availableFunctions) {
        const params = functionCall.params || {};
        const result = await availableFunctions[functionCall.function as keyof typeof availableFunctions](params);
        
        let actionDescription = '';
        switch (functionCall.function) {
          case 'pausePlayback':
            actionDescription = 'pause the music';
            break;
          case 'resumePlayback':
            actionDescription = 'resume playback';
            break;
          case 'skipToNext':
            actionDescription = 'skip to the next track';
            break;
          case 'skipToPrevious':
            actionDescription = 'go back to the previous track';
            break;
          case 'createPlaylist':
            actionDescription = `create a playlist called "${params.name}"`;
            break;
          default:
            actionDescription = functionCall.function;
        }

        return NextResponse.json({
          response: `I'll ${actionDescription} for you.`,
          functionCall: { 
            name: functionCall.function, 
            params, 
            result 
          }
        });
      }
    } catch (parseError) {
      console.error('Error parsing function call:', parseError, 'Response:', text);
    }

    // If we couldn't parse a function call or execute it
    return NextResponse.json({ 
      response: "I'm not sure how to help with that. Try saying something like 'pause', 'play', 'next track', or 'create a playlist called...'",
    });

  } catch (error: any) {
    console.error('Error in AI route:', error);
    const errorMessage = error.status === 503 
      ? "The AI service is temporarily unavailable. Please try again in a moment."
      : "Sorry, I encountered an error. Please try again.";
    
    return NextResponse.json(
      { error: errorMessage },
      { status: error.status || 500 }
    );
  }
} 