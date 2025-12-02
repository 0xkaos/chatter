'use client';

import { useChat } from 'ai/react';
import { useRef, useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Login } from '@/components/Login';
import { ChatSession } from '@/lib/types';
import { Settings, Menu } from 'lucide-react';

export const runtime = 'edge';

export default function Chat() {
  const [userId, setUserId] = useState<string | null>(null);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Model & Settings State
  const [model, setModel] = useState('gpt-4o');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [availableModels, setAvailableModels] = useState<{id: string, provider: string}[]>([]);

  // Load user from local storage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('chatter_user');
    if (storedUser) setUserId(storedUser);

    // Fetch models
    fetch('/api/models')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setAvailableModels(data);
          // Optional: Set default model if current one isn't in list?
          // For now, keep 'gpt-4o' as default or let user choose.
        }
      })
      .catch(err => console.error('Failed to fetch models', err));
  }, []);

  const { messages, input, handleInputChange, handleSubmit, setMessages, reload } = useChat({
    body: {
      model,
      userId,
      chatId: currentChatId,
      systemPrompt
    },
    onFinish: async (message) => {
      // Save chat history after each message completion
      if (userId) {
        // We need the full message history including the new one
        // Since onFinish gives us the new message, we can construct the payload
        // However, useChat doesn't give us the updated messages array immediately in onFinish in a way that's easy to sync without race conditions for saving.
        // A better approach for saving might be to rely on the server to save, or trigger a save here.
        // For this demo, we'll trigger a save to the history API.
        
        // Note: In a real app, we'd probably want the server to handle persistence during the stream or after.
        // Here we'll do a "lazy" save or rely on the user to see it in the sidebar on refresh.
        // Actually, let's just let the server handle saving if we pass the chatId.
        // But our current /api/chat doesn't save to R2. 
        // So we need to explicitly save it.
        
        const savedMessages = [...messages, message];
        const title = savedMessages[0]?.content.substring(0, 30) || 'New Chat';
        
        const chatData: ChatSession = {
          id: currentChatId || crypto.randomUUID(),
          userId,
          title,
          messages: savedMessages,
          createdAt: Date.now(),
          model,
          systemPrompt
        };

        if (!currentChatId) {
          setCurrentChatId(chatData.id);
        }

        await fetch('/api/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chatData)
        });
      }
    }
  });

  const handleLogin = (username: string) => {
    setUserId(username);
    localStorage.setItem('chatter_user', username);
  };

  const handleLogout = () => {
    setUserId(null);
    setCurrentChatId(null);
    setMessages([]);
    localStorage.removeItem('chatter_user');
  };

  const handleSelectChat = (chat: ChatSession) => {
    setCurrentChatId(chat.id);
    setMessages(chat.messages);
    setModel(chat.model || 'gpt-4o');
    setSystemPrompt(chat.systemPrompt || '');
    // On mobile, close sidebar
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleNewChat = () => {
    setCurrentChatId(null);
    setMessages([]);
    // Keep current model/settings
  };

  if (!userId) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900 overflow-hidden">
      {/* Sidebar - hidden on mobile unless open */}
      <div className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed md:relative z-20 h-full transition-transform duration-300 ease-in-out md:translate-x-0`}>
        <Sidebar
          userId={userId}
          currentChatId={currentChatId}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          onLogout={handleLogout}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full w-full relative">
        {/* Header */}
        <header className="h-14 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 bg-white dark:bg-gray-900 z-10">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="md:hidden p-2 text-gray-600 dark:text-gray-300"
            >
              <Menu size={20} />
            </button>
            <div className="font-semibold text-gray-800 dark:text-white">
              {currentChatId ? 'Chat' : 'New Chat'}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="text-sm border border-gray-300 dark:border-gray-700 rounded-md px-2 py-1 bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {availableModels.length > 0 ? (
                availableModels.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.id} ({m.provider})
                  </option>
                ))
              ) : (
                <>
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                </>
              )}
            </select>
            
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-md transition-colors ${showSettings ? 'bg-gray-100 dark:bg-gray-800 text-blue-600' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
              <Settings size={20} />
            </button>
          </div>
        </header>

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-gray-50 dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700 animate-in slide-in-from-top-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              System Prompt
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="You are a helpful assistant..."
              className="w-full p-2 text-sm border rounded-md dark:bg-gray-900 dark:border-gray-600 dark:text-white h-24 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <div className="text-4xl mb-4">👋</div>
              <p>Start a conversation</p>
            </div>
          ) : (
            messages.map(m => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg p-4 ${
                  m.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                }`}>
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
          <form onSubmit={handleSubmit} className="flex gap-2 max-w-4xl mx-auto">
            <input
              className="flex-1 p-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={input}
              placeholder="Type a message..."
              onChange={handleInputChange}
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
