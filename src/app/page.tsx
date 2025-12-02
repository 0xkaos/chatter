'use client';

import { useChat } from 'ai/react';
import { useRef, useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Login } from '@/components/Login';
import { ChatSession } from '@/lib/types';
import { Send, Paperclip, Image as ImageIcon, Settings as SettingsIcon } from 'lucide-react';

export const runtime = 'edge';

export default function Chat() {
  const [userId, setUserId] = useState<string | null>(null);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [model, setModel] = useState('gpt-4o');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  
  // Load user from local storage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('chatter_user');
    if (storedUser) setUserId(storedUser);
  }, []);

  const { messages, input, handleInputChange, handleSubmit, setMessages, reload } = useChat({
    body: {
      model,
      systemPrompt,
    },
    onFinish: async (message) => {
      // Save chat history after each message
      // We rely on the effect below to save the updated state
    }
  });

  // Effect to save chat when messages change (debounced)
  useEffect(() => {
    if (userId && currentChatId && messages.length > 0) {
      const saveChat = async () => {
        const chatData: ChatSession = {
          id: currentChatId,
          userId,
          title: messages[0].content.substring(0, 50) + '...',
          messages,
          createdAt: Date.now(), // In a real app, preserve original creation time
          model,
          systemPrompt
        };
        
        await fetch('/api/history', {
          method: 'POST',
          body: JSON.stringify(chatData),
        });
      };
      
      // Debounce save
      const timeout = setTimeout(saveChat, 1000);
      return () => clearTimeout(timeout);
    }
  }, [messages, userId, currentChatId, model, systemPrompt]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FileList | null>(null);

  const handleLogin = (username: string) => {
    setUserId(username);
    localStorage.setItem('chatter_user', username);
  };

  const handleLogout = () => {
    setUserId(null);
    localStorage.removeItem('chatter_user');
    setMessages([]);
    setCurrentChatId(null);
  };

  const handleNewChat = () => {
    setMessages([]);
    setCurrentChatId(crypto.randomUUID());
    setSystemPrompt('');
    setModel('gpt-4o');
  };

  const handleSelectChat = (chat: ChatSession) => {
    setCurrentChatId(chat.id);
    setMessages(chat.messages);
    setModel(chat.model || 'gpt-4o');
    setSystemPrompt(chat.systemPrompt || '');
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!currentChatId) {
      setCurrentChatId(crypto.randomUUID());
    }

    if (files && files.length > 0) {
      const attachments = await Promise.all(
        Array.from(files).map(async (file) => {
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        })
      );

      handleSubmit(e, {
        data: {
          images: attachments
        }
      });
      
      setFiles(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else {
      handleSubmit(e);
    }
  };

  if (!userId) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        userId={userId}
        currentChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onLogout={handleLogout}
        className="hidden md:flex"
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative">
        {/* Header */}
        <div className="h-14 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 bg-white dark:bg-gray-900 z-10">
          <div className="font-semibold">
            {model}
          </div>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
          >
            <SettingsIcon size={20} />
          </button>
        </div>

        {/* Settings Panel (Overlay) */}
        {showSettings && (
          <div className="absolute top-14 right-0 w-80 bg-white dark:bg-gray-800 border-l border-b border-gray-200 dark:border-gray-700 shadow-lg p-4 z-20">
            <h3 className="font-bold mb-4">Chat Settings</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Model</label>
              <select 
                value={model} 
                onChange={(e) => setModel(e.target.value)}
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">System Prompt</label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="w-full p-2 border rounded h-32 dark:bg-gray-700 dark:border-gray-600 text-sm"
                placeholder="You are a helpful assistant..."
              />
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <p className="text-xl font-semibold mb-2">Welcome to Chatter</p>
              <p className="text-sm">Start a new conversation or select one from history.</p>
            </div>
          )}
          
          {messages.map(m => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg p-4 ${
                m.role === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 dark:bg-gray-800'
              }`}>
                <div className="font-bold text-xs mb-1 opacity-70">{m.role === 'user' ? 'You' : 'AI'}</div>
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <form onSubmit={onSubmit} className="flex items-end gap-2 max-w-4xl mx-auto relative">
            <input
              type="file"
              className="hidden"
              ref={fileInputRef}
              onChange={(e) => setFiles(e.target.files)}
              multiple
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${files && files.length > 0 ? 'text-blue-500' : 'text-gray-500'}`}
            >
              {files && files.length > 0 ? <ImageIcon size={20} /> : <Paperclip size={20} />}
            </button>
            
            <div className="flex-1 relative">
              <input
                className="w-full p-3 pr-12 bg-gray-100 dark:bg-gray-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={input}
                placeholder="Type a message..."
                onChange={handleInputChange}
              />
              <button
                type="submit"
                disabled={!input.trim() && (!files || files.length === 0)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </form>
          {files && files.length > 0 && (
            <div className="max-w-4xl mx-auto mt-2 text-xs text-gray-500">
              {files.length} file(s) selected
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
