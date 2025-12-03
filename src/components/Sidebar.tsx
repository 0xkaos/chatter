'use client';

import { useState, useEffect } from 'react';
import { Message } from 'ai';
import { Plus, MessageSquare, Trash2, Settings, LogOut, X } from 'lucide-react';
import { ChatSession } from '@/lib/types';
import { cn } from '@/lib/utils';

interface SidebarProps {
  userId: string;
  currentChatId: string | null;
  onSelectChat: (chat: ChatSession) => void;
  onNewChat: () => void;
  onLogout: () => void;
  onClose?: () => void;
  className?: string;
}

export function Sidebar({ userId, currentChatId, onSelectChat, onNewChat, onLogout, onClose, className }: SidebarProps) {
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChats = async () => {
    try {
      const res = await fetch(`/api/history?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setChats(data);
      }
    } catch (error) {
      console.error('Failed to fetch chats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchChats();
    }
  }, [userId, currentChatId]); // Refresh when chat changes (saved)

  const deleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this chat?')) return;

    try {
      await fetch(`/api/history?userId=${userId}&chatId=${chatId}`, {
        method: 'DELETE',
      });
      fetchChats();
      if (currentChatId === chatId) {
        onNewChat();
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  };

  return (
    <div className={cn("flex flex-col h-full bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 w-64", className)}>
      {onClose && (
        <div className="md:hidden p-2 flex justify-end border-b border-gray-200 dark:border-gray-800">
          <button 
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X size={20} />
          </button>
        </div>
      )}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors shadow-sm"
        >
          <Plus size={16} />
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? (
          <div className="text-center text-gray-500 text-sm py-4">Loading...</div>
        ) : chats.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-4">No saved chats</div>
        ) : (
          chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => onSelectChat(chat)}
              className={cn(
                "group flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors",
                currentChatId === chat.id
                  ? "bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white"
                  : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
              )}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <MessageSquare size={16} className="shrink-0" />
                <span className="truncate text-sm">{chat.title || 'Untitled Chat'}</span>
              </div>
              <button
                onClick={(e) => deleteChat(e, chat.id)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            {userId}
          </div>
          <button onClick={onLogout} className="hover:text-gray-900 dark:hover:text-white">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
