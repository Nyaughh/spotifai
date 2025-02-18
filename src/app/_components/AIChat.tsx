'use client';

import { useState, useEffect } from 'react';
import { api } from "~/trpc/react";
import AIInput_01 from '~/components/kokonutui/ai-input-01';
import { Popover, PopoverTrigger, PopoverContent } from '~/components/ui/popover';
import { History, Plus } from 'lucide-react';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  functionCall?: {
    name: string;
    args: Record<string, string>;
    result: boolean;
  };
};

interface ChatHistory {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
}

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

  const recommendations = [
    "Suggest songs similar to 'Bohemian Rhapsody'",
    "Create a workout playlist",
    "Find sad songs for a rainy day",
    "Recommend some indie rock bands",
  ];

  const generateChatTitle = (firstMessage: string) => {
    return firstMessage.length > 30 
      ? firstMessage.substring(0, 30) + "..."
      : firstMessage;
  };

  const chatMutation = api.ai.chat.useMutation({
    onSuccess: (data) => {
      const newMessage: Message = {
        role: 'assistant',
        content: data.response,
        functionCall: data.functionCall
      };
      
      const updatedMessages = [...messages, newMessage];
      setMessages(updatedMessages);

      if (messages.length === 1) {
        const newChatId = crypto.randomUUID();
        const newChat: ChatHistory = {
          id: newChatId,
          title: generateChatTitle(messages[0]?.content || ''),
          messages: updatedMessages,
          createdAt: new Date().toISOString()
        };
        
        const updatedHistory = [newChat, ...chatHistory];
        setChatHistory(updatedHistory);
        setCurrentChatId(newChatId);
        localStorage.setItem('chatHistory', JSON.stringify(updatedHistory));
      } else if (currentChatId) {
        // Update existing chat
        const updatedHistory = chatHistory.map(chat => 
          chat.id === currentChatId 
            ? { ...chat, messages: updatedMessages }
            : chat
        );
        setChatHistory(updatedHistory);
        localStorage.setItem('chatHistory', JSON.stringify(updatedHistory));
      }
    },
    onError: (error) => {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    },
    onSettled: () => {
      setIsLoading(false);
    }
  });

  useEffect(() => {
    const savedHistory = localStorage.getItem('chatHistory');
    if (savedHistory) {
      setChatHistory(JSON.parse(savedHistory));
    }
  }, []);

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;

    const newMessage: Message = { role: 'user', content: message };
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);

    if (currentChatId) {
      // Update existing chat
      const updatedHistory = chatHistory.map(chat => 
        chat.id === currentChatId 
          ? { ...chat, messages: updatedMessages }
          : chat
      );
      setChatHistory(updatedHistory);
      localStorage.setItem('chatHistory', JSON.stringify(updatedHistory));
    }

    setIsLoading(true);
    chatMutation.mutate({ message });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-zinc-800 p-4">
        <h2 className="text-sm font-medium text-white">AI Assistant</h2>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <button className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white">
                <History className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] border-zinc-800 bg-zinc-900 p-4 text-white">
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Chat History</h3>
                <div className="space-y-2">
                  {chatHistory.length === 0 ? (
                    <p className="text-xs text-zinc-500">No previous chats</p>
                  ) : (
                    chatHistory.map((chat) => (
                      <button
                        key={chat.id}
                        onClick={() => {
                          setMessages(chat.messages);
                          setCurrentChatId(chat.id);
                        }}
                        className="w-full p-2 text-left text-sm rounded-lg hover:bg-zinc-800 transition-colors"
                      >
                        <div className="font-medium truncate">{chat.title}</div>
                        <div className="text-xs text-zinc-500">
                          {new Date(chat.createdAt).toLocaleDateString()}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <button
            onClick={() => {
              setMessages([]);
              setCurrentChatId(null);
            }}
            className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {messages.length === 0 ? (
        <div className="flex-1 p-4 space-y-4">
          <h3 className="text-sm font-medium text-zinc-400">Suggested prompts</h3>
          <div className="space-y-2">
            {recommendations.map((rec) => (
              <button
                key={rec}
                onClick={() => handleSendMessage(rec)}
                className="w-full p-3 text-left text-sm rounded-lg bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                {rec}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-zinc-700 text-white'
                    : message.content.startsWith('✓')
                    ? 'bg-green-500/20 text-green-200'
                    : message.content.startsWith('❌')
                    ? 'bg-red-500/20 text-red-200'
                    : 'bg-zinc-800 text-white'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-zinc-800 p-3 text-zinc-400">
                Thinking...
              </div>
            </div>
          )}
        </div>
      )}

      <div className="border-t border-zinc-700/50 p-4">
        <AIInput_01 onSend={handleSendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
} 