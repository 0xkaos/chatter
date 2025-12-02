'use client';

import { useState, useEffect } from 'react';
import { Send, Plus, Trash2, Image as ImageIcon, Copy } from 'lucide-react';

interface ImageGeneratorProps {
  userId: string;
}

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  createdAt: number;
}

export function ImageGenerator({ userId }: ImageGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [snippets, setSnippets] = useState<string[]>([]);
  const [newSnippet, setNewSnippet] = useState('');
  const [showSnippets, setShowSnippets] = useState(true);

  // Fetch history and snippets on mount
  useEffect(() => {
    fetchHistory();
    fetchSnippets();
  }, [userId]);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/images/history?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setImages(data);
      }
    } catch (e) {
      console.error('Failed to fetch image history', e);
    }
  };

  const fetchSnippets = async () => {
    try {
      const res = await fetch(`/api/images/snippets?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setSnippets(data);
      }
    } catch (e) {
      console.error('Failed to fetch snippets', e);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || generating) return;

    setGenerating(true);
    try {
      const res = await fetch('/api/images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, userId }),
      });

      if (res.ok) {
        const newImage = await res.json();
        setImages([newImage, ...images]);
        setPrompt(''); // Optional: clear prompt after generation
      } else {
        console.error('Generation failed');
      }
    } catch (e) {
      console.error('Error generating image', e);
    } finally {
      setGenerating(false);
    }
  };

  const handleAddSnippet = async () => {
    if (!newSnippet.trim()) return;
    const updatedSnippets = [...snippets, newSnippet.trim()];
    setSnippets(updatedSnippets);
    setNewSnippet('');
    await saveSnippets(updatedSnippets);
  };

  const handleDeleteSnippet = async (index: number) => {
    const updatedSnippets = snippets.filter((_, i) => i !== index);
    setSnippets(updatedSnippets);
    await saveSnippets(updatedSnippets);
  };

  const saveSnippets = async (updatedSnippets: string[]) => {
    await fetch('/api/images/snippets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, snippets: updatedSnippets }),
    });
  };

  const insertSnippet = (snippet: string) => {
    setPrompt(prev => (prev ? `${prev} ${snippet}` : snippet));
  };

  return (
    <div className="flex h-full bg-white dark:bg-gray-900 overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative">
        
        {/* Gallery Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {images.length === 0 && !generating ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <ImageIcon size={48} className="mb-4 opacity-50" />
              <p>No images generated yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {generating && (
                <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center animate-pulse">
                  <span className="text-gray-500">Generating...</span>
                </div>
              )}
              {images.map((img) => (
                <div key={img.id} className="group relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                  <img 
                    src={img.url} 
                    alt={img.prompt} 
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                    <p className="text-white text-xs line-clamp-3 mb-2">{img.prompt}</p>
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => insertSnippet(img.prompt)}
                        className="p-1.5 bg-white/20 hover:bg-white/40 rounded text-white"
                        title="Use Prompt"
                      >
                        <Copy size={14} />
                      </button>
                      <a 
                        href={img.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-1.5 bg-white/20 hover:bg-white/40 rounded text-white"
                        title="Open Full Size"
                      >
                        <ImageIcon size={14} />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
          
          {/* Snippets Bar */}
          {showSnippets && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase">Snippets</span>
                <div className="flex gap-2">
                  <input 
                    value={newSnippet}
                    onChange={(e) => setNewSnippet(e.target.value)}
                    placeholder="New snippet..."
                    className="text-xs p-1 border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSnippet()}
                  />
                  <button onClick={handleAddSnippet} className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                {snippets.map((snippet, idx) => (
                  <div key={idx} className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full text-xs group border border-gray-200 dark:border-gray-700">
                    <button onClick={() => insertSnippet(snippet)} className="hover:text-blue-500 truncate max-w-[150px]">
                      {snippet}
                    </button>
                    <button onClick={() => handleDeleteSnippet(idx)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleGenerate} className="flex gap-2 max-w-4xl mx-auto">
            <textarea
              className="flex-1 p-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-24"
              value={prompt}
              placeholder="Describe the image you want to generate..."
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerate(e);
                }
              }}
            />
            <div className="flex flex-col gap-2">
              <button
                type="submit"
                disabled={!prompt.trim() || generating}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-1 flex items-center justify-center"
              >
                {generating ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={20} />}
              </button>
              <button
                type="button"
                onClick={() => setShowSnippets(!showSnippets)}
                className={`px-4 py-2 rounded-lg border transition-colors ${showSnippets ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                title="Toggle Snippets"
              >
                <ListIcon />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function ListIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"></line>
      <line x1="8" y1="12" x2="21" y2="12"></line>
      <line x1="8" y1="18" x2="21" y2="18"></line>
      <line x1="3" y1="6" x2="3.01" y2="6"></line>
      <line x1="3" y1="12" x2="3.01" y2="12"></line>
      <line x1="3" y1="18" x2="3.01" y2="18"></line>
    </svg>
  );
}
