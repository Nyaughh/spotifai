import { Groq } from 'groq-sdk';
import { NextResponse } from 'next/server';

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const systemPrompt = `You are a friendly and helpful music assistant for Spotify. You can chat about music, give recommendations, and respond to questions.
Keep your responses concise and engaging. If users ask you to control Spotify (play, pause, etc), politely explain you can only chat about music for now.`;

export async function POST(request: Request) {
  try {
    const { message } = await request.json();
    console.log('Received message:', message);

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ 
        response: "Please send me a message to chat about music!" 
      });
    }

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: message
        }
      ],
      model: 'deepseek-r1-distill-llama-70b',
      temperature: 0.7,
      max_tokens: 150,
      top_p: 1,
      stream: false,
    });

    const response = completion.choices[0]?.message?.content?.trim() || "I'm not sure how to respond to that.";
    console.log('AI Response:', response);

    return NextResponse.json({ response });

  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json(
      { response: "Sorry, I'm having trouble connecting right now. Please try again in a moment." },
      { status: 500 }
    );
  }
} 