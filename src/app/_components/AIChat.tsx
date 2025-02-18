'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  functionCall?: {
    name: string;
    params: Record<string, string>;
    result: boolean;
  };
};

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { data: session } = useSession();

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.response,
          functionCall: data.functionCall
        }]);

        // If there was a function call, add a status message
        if (data.functionCall) {
          const { name, result } = data.functionCall;
          const statusMessage = result 
            ? `✓ Successfully executed ${name}`
            : `❌ Failed to execute ${name}`;
          
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: statusMessage
          }]);
        }
      } else {
        throw new Error(data.error || 'Failed to get AI response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[500px] w-full bg-black/20 backdrop-blur-lg rounded-lg shadow-xl">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-white/70 text-center mt-4">
            Ask me anything about music or how to control your Spotify playback!
          </div>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-[#1DB954] text-white'
                  : message.content.startsWith('✓')
                  ? 'bg-[#1DB954]/20 text-white'
                  : message.content.startsWith('❌')
                  ? 'bg-red-500/20 text-white'
                  : 'bg-white/10 text-white'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/10 rounded-lg p-3 text-white">
              Thinking...
            </div>
          </div>
        )}
      </div>
      <form onSubmit={sendMessage} className="border-t border-white/10 p-4">
        <div className="flex space-x-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about music or control playback..."
            className="flex-1 p-2 rounded-lg bg-white/10 text-white placeholder-white/50 border-none focus:outline-none focus:ring-2 focus:ring-[#1DB954]"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-[#1DB954] text-white px-4 py-2 rounded-lg hover:bg-[#1ed760] focus:outline-none focus:ring-2 focus:ring-[#1DB954] disabled:opacity-50 transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
} 