'use client';

import { useChat } from 'ai/react';
import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Login } from '@/components/Login';
import { ImageGenerator } from '@/components/ImageGenerator';
import { ChatSession } from '@/lib/types';
import { Settings, Menu, ListFilter, X, MessageSquare, Image as ImageIcon, RotateCcw, Pencil, Check } from 'lucide-react';

export const runtime = 'edge';

export default function Chat() {
  const [userId, setUserId] = useState<string | null>(null);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Default closed on mobile
  const [activeTab, setActiveTab] = useState<'chat' | 'images'>('chat');
  
  // Model & Settings State
  const [model, setModel] = useState('gpt-4o');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showModelManager, setShowModelManager] = useState(false);
  const [availableModels, setAvailableModels] = useState<{id: string, provider: string}[]>([]);
  const [hiddenModels, setHiddenModels] = useState<string[]>([]);

  // Editing State
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // Load user from local storage on mount
  useEffect(() => {
    // Set sidebar open on desktop
    if (window.innerWidth >= 768) {
      setIsSidebarOpen(true);
    }

    const storedUser = localStorage.getItem('chatter_user');
    if (storedUser) setUserId(storedUser);
    
    const storedHiddenModels = localStorage.getItem('chatter_hidden_models');
    if (storedHiddenModels) {
      try {
        setHiddenModels(JSON.parse(storedHiddenModels));
      } catch (e) {
        console.error('Failed to parse hidden models', e);
      }
    }

    // Fetch models
    fetch('/api/models')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setAvailableModels(data);
        }
      })
      .catch(err => console.error('Failed to fetch models', err));
  }, []);

  const { messages, input, handleInputChange, handleSubmit, setMessages, reload, append } = useChat({
    body: {
      model,
      userId,
      chatId: currentChatId,
      systemPrompt
    },
    onFinish: async (message) => {
      // Save chat history after each message completion
      if (userId) {
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

  const handleEdit = (messageId: string, newContent: string) => {
    const index = messages.findIndex(m => m.id === messageId);
    if (index === -1) return;

    // Keep messages before the edited one
    const newHistory = messages.slice(0, index);
    setMessages(newHistory);
    
    // Trigger new request with edited content
    append({
      role: 'user',
      content: newContent
    });
    
    setEditingMessageId(null);
  };

  const handleReroll = (messageId: string) => {
    const index = messages.findIndex(m => m.id === messageId);
    if (index === -1) return;

    // If it's the last message and it's assistant, just reload
    if (index === messages.length - 1 && messages[index].role === 'assistant') {
      reload();
      return;
    }

    // If it's an older message, we need to truncate history up to the user message before it
    // So we keep 0 to index-1 (which includes the user message).
    const newHistory = messages.slice(0, index);
    setMessages(newHistory);
    reload();
  };

  const startEditing = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditContent(content);
  };

  const toggleModelVisibility = (modelId: string) => {
    const newHiddenModels = hiddenModels.includes(modelId)
      ? hiddenModels.filter(id => id !== modelId)
      : [...hiddenModels, modelId];
    
    setHiddenModels(newHiddenModels);
    localStorage.setItem('chatter_hidden_models', JSON.stringify(newHiddenModels));
  };

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
    setActiveTab('chat'); // Switch to chat tab when selecting a chat
    // On mobile, close sidebar
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleNewChat = () => {
    setCurrentChatId(null);
    setMessages([]);
    setActiveTab('chat');
    // Keep current model/settings
  };

  if (!userId) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900 overflow-hidden">
      {/* Sidebar - hidden on mobile unless open */}
      <div className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed md:relative z-20 h-full transition-transform duration-300 ease-in-out md:translate-x-0 flex flex-col bg-gray-50 dark:bg-gray-900`}>
        {/* Mobile Close Button */}
        <button 
          onClick={() => setIsSidebarOpen(false)}
          className="md:hidden absolute top-2 right-2 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 z-50"
        >
          <X size={20} />
        </button>

        <Sidebar
          userId={userId}
          currentChatId={currentChatId}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          onLogout={handleLogout}
          className="flex-1"
        />
        {/* Tab Switcher in Sidebar Bottom */}
        <div className="p-2 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex gap-2">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'chat' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}`}
          >
            <MessageSquare size={16} />
            Chat
          </button>
          <button
            onClick={() => setActiveTab('images')}
            className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'images' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-100' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}`}
          >
            <ImageIcon size={16} />
            Images
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full w-full relative">
        
        {activeTab === 'chat' ? (
          <>
            {/* Chat Header */}
            <header className="h-14 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 bg-white dark:bg-gray-900 z-10 relative">
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
                  className="text-sm border border-gray-300 dark:border-gray-700 rounded-md px-2 py-1 bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[150px] sm:max-w-xs"
                >
                  {availableModels.length > 0 ? (
                    availableModels
                      .filter(m => !hiddenModels.includes(m.id))
                      .map(m => (
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
                  onClick={() => setShowModelManager(!showModelManager)}
                  className={`p-2 rounded-md transition-colors ${showModelManager ? 'bg-gray-100 dark:bg-gray-800 text-blue-600' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                  title="Manage Models"
                >
                  <ListFilter size={20} />
                </button>
                
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`p-2 rounded-md transition-colors ${showSettings ? 'bg-gray-100 dark:bg-gray-800 text-blue-600' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                  title="Settings"
                >
                  <Settings size={20} />
                </button>
              </div>

              {/* Model Manager Popup */}
              {showModelManager && (
                <div className="absolute top-14 right-4 w-64 max-h-[80vh] overflow-y-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-xl z-50 p-4 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm">Manage Models</h3>
                    <button onClick={() => setShowModelManager(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {availableModels.map(m => (
                      <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={!hiddenModels.includes(m.id)}
                          onChange={() => toggleModelVisibility(m.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className={hiddenModels.includes(m.id) ? 'text-gray-400' : ''}>
                          {m.id} <span className="text-xs text-gray-500">({m.provider})</span>
                        </span>
                      </label>
                    ))}
                    {availableModels.length === 0 && (
                      <div className="text-sm text-gray-500 text-center py-4">No models loaded</div>
                    )}
                  </div>
                </div>
              )}
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
                messages.map((m, idx) => (
                  <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} group`}>
                    <div className={`max-w-[85%] rounded-lg p-4 relative ${
                      m.role === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                    }`}>
                      {editingMessageId === m.id ? (
                        <div className="flex flex-col gap-2 min-w-[300px]">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full p-2 text-sm text-black dark:text-white bg-white dark:bg-gray-900 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={3}
                          />
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => setEditingMessageId(null)}
                              className="p-1 hover:bg-white/20 rounded"
                            >
                              <X size={16} />
                            </button>
                            <button 
                              onClick={() => handleEdit(m.id, editContent)}
                              className="p-1 hover:bg-white/20 rounded"
                            >
                              <Check size={16} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="whitespace-pre-wrap">{m.content}</div>
                          
                          {/* Message Actions */}
                          <div className={`absolute -bottom-6 ${m.role === 'user' ? 'right-0' : 'left-0'} opacity-0 group-hover:opacity-100 transition-opacity flex gap-1`}>
                            {m.role === 'user' && (
                              <button 
                                onClick={() => startEditing(m.id, m.content)}
                                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                title="Edit"
                              >
                                <Pencil size={14} />
                              </button>
                            )}
                            {m.role === 'assistant' && (
                              <button 
                                onClick={() => handleReroll(m.id)}
                                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                title="Regenerate from here"
                              >
                                <RotateCcw size={14} />
                              </button>
                            )}
                          </div>
                        </>
                      )}
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
          </>
        ) : (
          <div className="flex flex-col h-full">
            <header className="h-14 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 bg-white dark:bg-gray-900 z-10">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="md:hidden p-2 text-gray-600 dark:text-gray-300"
                >
                  <Menu size={20} />
                </button>
                <div className="font-semibold text-gray-800 dark:text-white">
                  Image Generator
                </div>
              </div>
            </header>
            <ImageGenerator userId={userId} />
          </div>
        )}
      </div>
    </div>
  );
}
