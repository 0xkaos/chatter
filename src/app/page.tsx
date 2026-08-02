'use client';

import { useChat } from 'ai/react';
import { useState, useEffect, useRef } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Login } from '@/components/Login';
import { ImageGenerator } from '@/components/ImageGenerator';
import { ChatSession } from '@/lib/types';
import { Settings, Menu, ListFilter, X, MessageSquare, Image as ImageIcon, RotateCcw, Pencil, Check, Paperclip, Trash2 } from 'lucide-react';
import { convertFileToBase64, convertPdfToImages } from '@/lib/file-utils';

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
  const [availableModels, setAvailableModels] = useState<{id: string, label?: string, provider: string}[]>([]);
  const [hiddenModels, setHiddenModels] = useState<string[]>([]);

  // Editing State
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // Attachments State
  const [attachments, setAttachments] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const modelManagerRef = useRef<HTMLDivElement>(null);
  const modelManagerButtonRef = useRef<HTMLButtonElement>(null);
  const settingsPanelRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Load user from local storage on mount
  useEffect(() => {
    // Set sidebar open on desktop
    if (window.innerWidth >= 768) {
      setIsSidebarOpen(true);
    }

    const storedUser = localStorage.getItem('chatter_user');
    if (storedUser) {
      setUserId(storedUser);
      // Fetch user settings
      fetch(`/api/settings?userId=${storedUser}`)
        .then(res => res.json())
        .then(data => {
          if (data.hiddenModels) {
            setHiddenModels(data.hiddenModels);
          }
        })
        .catch(err => console.error('Failed to fetch settings', err));
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

  // Dismiss transient panels when tapping elsewhere or pressing Escape.
  useEffect(() => {
    if (!showModelManager && !showSettings) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (
        showModelManager &&
        !modelManagerRef.current?.contains(target) &&
        !modelManagerButtonRef.current?.contains(target)
      ) {
        setShowModelManager(false);
      }

      if (
        showSettings &&
        !settingsPanelRef.current?.contains(target) &&
        !settingsButtonRef.current?.contains(target)
      ) {
        setShowSettings(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowModelManager(false);
        setShowSettings(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showModelManager, showSettings]);

  const { messages, input, handleInputChange, handleSubmit, setMessages, reload, append, setInput } = useChat({
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

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newAttachments: string[] = [];

      for (const file of files) {
        if (file.type === 'application/pdf') {
          try {
            const images = await convertPdfToImages(file);
            newAttachments.push(...images);
          } catch (err) {
            console.error('Error converting PDF', err);
          }
        } else if (file.type.startsWith('image/')) {
          try {
            const base64 = await convertFileToBase64(file);
            newAttachments.push(base64);
          } catch (err) {
            console.error('Error reading image', err);
          }
        }
      }
      setAttachments(prev => [...prev, ...newAttachments]);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const toggleModelVisibility = (modelId: string) => {
    const newHiddenModels = hiddenModels.includes(modelId)
      ? hiddenModels.filter(id => id !== modelId)
      : [...hiddenModels, modelId];
    
    setHiddenModels(newHiddenModels);
    
    if (userId) {
      fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          settings: { hiddenModels: newHiddenModels }
        })
      }).catch(err => console.error('Failed to save settings', err));
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && attachments.length === 0) return;

    const currentAttachments = attachments.map(url => ({
      contentType: url.split(';')[0].split(':')[1] || 'image/jpeg', 
      url
    }));
    
    console.log('Sending message with attachments:', currentAttachments.length);

    // Clear attachments
    setAttachments([]);
    
    // Use append to send message with attachments
    // We pass attachments in two ways to ensure compatibility:
    // 1. experimental_attachments: For the UI to render them immediately (if supported by SDK)
    // 2. data.images: As a fallback for the backend to receive them if experimental_attachments is stripped
    
    append({
      role: 'user',
      content: input,
      experimental_attachments: currentAttachments as any,
      data: { images: attachments } // Persist images in message data
    }, {
      data: {
        images: attachments // Pass raw base64 strings for backend fallback
      }
    });
    
    setInput('');
  };

  const toggleModelManager = () => {
    if (!showModelManager) {
      setShowSettings(false);
    }
    setShowModelManager(!showModelManager);
  };

  const closeChatPopouts = () => {
    setShowModelManager(false);
    setShowSettings(false);
  };

  const toggleSidebar = () => {
    closeChatPopouts();
    setIsSidebarOpen(open => !open);
  };

  const selectTab = (tab: 'chat' | 'images') => {
    setActiveTab(tab);
    closeChatPopouts();
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const toggleSettings = () => {
    if (!showSettings) {
      setShowModelManager(false);
    }
    setShowSettings(!showSettings);
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
    closeChatPopouts();
    // On mobile, close sidebar
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleNewChat = () => {
    setCurrentChatId(null);
    setMessages([]);
    setActiveTab('chat');
    closeChatPopouts();
    if (window.innerWidth < 768) setIsSidebarOpen(false);
    // Keep current model/settings
  };

  if (!userId) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-white dark:bg-gray-900">
      {isSidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-20 bg-black/35 backdrop-blur-[1px] md:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}

      {/* Sidebar - hidden on mobile unless open */}
      <aside id="app-sidebar" className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-30 flex flex-col bg-gray-50 transition-transform duration-300 ease-in-out dark:bg-gray-900 md:relative md:translate-x-0`}>
        
        <Sidebar
          userId={userId}
          currentChatId={currentChatId}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          onLogout={handleLogout}
          onClose={() => setIsSidebarOpen(false)}
          className="flex-1"
        />
        {/* Tab Switcher in Sidebar Bottom */}
        <div className="p-2 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex gap-2">
          <button
            type="button"
            onClick={() => selectTab('chat')}
            className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md p-2 text-sm font-medium transition-colors ${activeTab === 'chat' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}`}
          >
            <MessageSquare size={16} />
            Chat
          </button>
          <button
            type="button"
            onClick={() => selectTab('images')}
            className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md p-2 text-sm font-medium transition-colors ${activeTab === 'images' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-100' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}`}
          >
            <ImageIcon size={16} />
            Images
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="relative flex h-full min-w-0 flex-1 flex-col">
        
        {activeTab === 'chat' ? (
          <>
            {/* Chat Header */}
            <header className="relative z-10 flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-2 dark:border-gray-800 dark:bg-gray-900 sm:px-4">
              <div className="flex min-w-0 items-center gap-2">
                <button 
                  type="button"
                  onClick={toggleSidebar}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 md:hidden"
                  aria-label="Open sidebar"
                  aria-controls="app-sidebar"
                  aria-expanded={isSidebarOpen}
                >
                  <Menu size={20} />
                </button>
                <div className="hidden truncate font-semibold text-gray-800 dark:text-white sm:block">
                  {currentChatId ? 'Chat' : 'New Chat'}
                </div>
              </div>
              
              <div className="flex min-w-0 items-center gap-1 sm:gap-2">
                <select
                  value={model}
                  onChange={(e) => {
                    setModel(e.target.value);
                    closeChatPopouts();
                  }}
                  onClick={() => {
                    setShowSettings(false);
                    setShowModelManager(false);
                  }}
                  className="h-11 min-w-0 w-[42vw] max-w-40 rounded-md border border-gray-300 bg-transparent px-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:text-white sm:h-auto sm:w-auto sm:max-w-xs sm:py-1 sm:text-sm"
                  aria-label="Chat model"
                >
                  {availableModels.length > 0 ? (
                    availableModels
                      .filter(m => !hiddenModels.includes(m.id))
                      .map(m => (
                        <option key={m.id} value={m.id}>
                          {m.label || m.id} ({m.provider})
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
                  ref={modelManagerButtonRef}
                  type="button"
                  onClick={toggleModelManager}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md transition-colors ${showModelManager ? 'bg-gray-100 dark:bg-gray-800 text-blue-600' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                  title="Manage Models"
                  aria-label="Manage models"
                  aria-expanded={showModelManager}
                >
                  <ListFilter size={20} />
                </button>
                
                <button
                  ref={settingsButtonRef}
                  type="button"
                  onClick={toggleSettings}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md transition-colors ${showSettings ? 'bg-gray-100 dark:bg-gray-800 text-blue-600' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                  title="Settings"
                  aria-label="Chat settings"
                  aria-expanded={showSettings}
                >
                  <Settings size={20} />
                </button>
              </div>

              {/* Model Manager Popup */}
              {showModelManager && (
                <div ref={modelManagerRef} className="fixed inset-x-3 top-16 z-50 max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain rounded-lg border border-gray-200 bg-white p-4 shadow-xl animate-in fade-in zoom-in-95 duration-100 dark:border-gray-700 dark:bg-gray-900 sm:absolute sm:left-auto sm:right-4 sm:top-14 sm:w-80">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm">Manage Models</h3>
                    <button type="button" onClick={() => setShowModelManager(false)} className="flex h-10 w-10 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300" aria-label="Close model manager">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {availableModels.map(m => (
                      <label key={m.id} className="flex cursor-pointer items-start gap-3 rounded p-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                        <input
                          type="checkbox"
                          checked={!hiddenModels.includes(m.id)}
                          onChange={() => toggleModelVisibility(m.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className={`min-w-0 break-words ${hiddenModels.includes(m.id) ? 'text-gray-400' : ''}`}>
                          {m.label || m.id} <span className="text-xs text-gray-500">({m.provider})</span>
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
              <div ref={settingsPanelRef} className="shrink-0 border-b border-gray-200 bg-gray-50 p-3 animate-in slide-in-from-top-2 dark:border-gray-700 dark:bg-gray-800 sm:p-4">
                <div className="mb-1 flex items-center justify-between">
                  <label htmlFor="system-prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    System Prompt
                  </label>
                  <button type="button" onClick={() => setShowSettings(false)} className="flex h-10 w-10 items-center justify-center rounded-md text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Close chat settings">
                    <X size={18} />
                  </button>
                </div>
                <textarea
                  id="system-prompt"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="You are a helpful assistant..."
                  className="h-24 w-full resize-none rounded-md border p-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white sm:text-sm"
                />
              </div>
            )}

            {/* Messages */}
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-3 scroll-smooth sm:p-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <div className="text-4xl mb-4">👋</div>
                  <p>Start a conversation</p>
                </div>
              ) : (
                messages.map((m, idx) => (
                  <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} group`}>
                    <div className={`relative min-w-0 max-w-[92%] break-words rounded-lg p-4 sm:max-w-[85%] ${
                      m.role === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                    }`}>
                      {/* Attachments Display */}
                      {((m.experimental_attachments?.length ?? 0) > 0 || (m.data as any)?.images?.length > 0) && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {(m.experimental_attachments || []).map((attachment, i) => (
                            <div key={`att-${i}`} className="relative rounded-lg overflow-hidden border border-black/10 dark:border-white/10 bg-black/5">
                              {attachment.contentType?.startsWith('image/') && (
                                <img 
                                  src={attachment.url} 
                                  alt="Attachment" 
                                  className="max-w-[200px] max-h-[200px] object-cover" 
                                />
                              )}
                            </div>
                          ))}
                          {/* Fallback for data.images if experimental_attachments is missing */}
                          {(!m.experimental_attachments?.length) && (m.data as any)?.images?.map((url: string, i: number) => (
                             <div key={`img-${i}`} className="relative rounded-lg overflow-hidden border border-black/10 dark:border-white/10 bg-black/5">
                                <img 
                                  src={url} 
                                  alt="Attachment" 
                                  className="max-w-[200px] max-h-[200px] object-cover" 
                                />
                             </div>
                          ))}
                        </div>
                      )}

                      {editingMessageId === m.id ? (
                        <div className="flex w-[72vw] max-w-full flex-col gap-2 sm:w-[32rem]">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full resize-none rounded border bg-white p-2 text-base text-black focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-white sm:text-sm"
                            rows={3}
                          />
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => setEditingMessageId(null)}
                              type="button"
                              className="flex h-10 w-10 items-center justify-center rounded hover:bg-white/20"
                              aria-label="Cancel edit"
                            >
                              <X size={16} />
                            </button>
                            <button 
                              onClick={() => handleEdit(m.id, editContent)}
                              type="button"
                              className="flex h-10 w-10 items-center justify-center rounded hover:bg-white/20"
                              aria-label="Save edit"
                            >
                              <Check size={16} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="whitespace-pre-wrap">{m.content}</div>
                          
                          {/* Message Actions */}
                          <div className={`absolute -bottom-8 ${m.role === 'user' ? 'right-0' : 'left-0'} flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100`}>
                            {m.role === 'user' && (
                              <button 
                                onClick={() => startEditing(m.id, m.content)}
                                type="button"
                                className="flex h-8 w-8 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                                title="Edit"
                              >
                                <Pencil size={14} />
                              </button>
                            )}
                            {m.role === 'assistant' && (
                              <button 
                                onClick={() => handleReroll(m.id)}
                                type="button"
                                className="flex h-8 w-8 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
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
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="safe-area-bottom shrink-0 border-t border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-gray-900 sm:p-4">
              {/* Attachments Preview */}
              {attachments.length > 0 && (
                <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
                  {attachments.map((url, idx) => (
                    <div key={idx} className="relative shrink-0">
                      <img src={url} alt="Attachment" className="h-20 w-20 object-cover rounded-md border border-gray-200 dark:border-gray-700" />
                      <button
                        onClick={() => removeAttachment(idx)}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={onSubmit} className="mx-auto flex max-w-4xl gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  multiple
                  accept="image/*,application/pdf"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-gray-300 text-gray-500 transition-colors hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  title="Add Attachment"
                  aria-label="Add attachment"
                >
                  <Paperclip size={20} />
                </button>
                <input
                  className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-transparent p-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:text-white"
                  value={input}
                  placeholder="Type a message..."
                  onChange={handleInputChange}
                />
                <button
                  type="submit"
                  disabled={!input.trim() && attachments.length === 0}
                  className="min-h-12 shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Send
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex h-full min-w-0 flex-col">
            <header className="h-14 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 bg-white dark:bg-gray-900 z-10">
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={toggleSidebar}
                  className="flex h-11 w-11 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 md:hidden"
                  aria-label="Open sidebar"
                  aria-controls="app-sidebar"
                  aria-expanded={isSidebarOpen}
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
      </main>
    </div>
  );
}
