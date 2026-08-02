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
    <div className={cn("flex h-full w-72 max-w-[85vw] flex-col border-r border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900 md:w-64", className)}>
      {onClose && (
        <div className="md:hidden p-2 flex justify-end border-b border-gray-200 dark:border-gray-800">
          <button 
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>
      )}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <button
          type="button"
          onClick={onNewChat}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          <Plus size={16} />
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain p-2 space-y-1">
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
                type="button"
                onClick={(e) => deleteChat(e, chat.id)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md opacity-100 transition-all hover:bg-red-50 hover:text-red-500 md:opacity-0 md:group-hover:opacity-100 dark:hover:bg-red-950/30"
                aria-label={`Delete ${chat.title || 'chat'}`}
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
          <button type="button" onClick={onLogout} className="flex h-10 w-10 items-center justify-center rounded-md hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white" aria-label="Log out">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
