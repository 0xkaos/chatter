'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Plus, Trash2, Image as ImageIcon, Copy, Settings, X } from 'lucide-react';

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
  
  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);
  const [steps, setSteps] = useState(4);
  const settingsRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);

  // Fetch history and snippets on mount
  useEffect(() => {
    fetchHistory();
    fetchSnippets();
  }, [userId]);

  useEffect(() => {
    if (!showSettings) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!settingsRef.current?.contains(target) && !settingsButtonRef.current?.contains(target)) {
        setShowSettings(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowSettings(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showSettings]);

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
        body: JSON.stringify({ 
          prompt, 
          userId,
          width,
          height,
          steps
        }),
      });

      if (res.ok) {
        const newImage = await res.json();
        setImages([newImage, ...images]);
        setPrompt(''); // Optional: clear prompt after generation
      } else {
        const errorText = await res.text();
        console.error('Generation failed:', res.status, errorText);
      }
    } catch (e) {
      console.error('Error generating image', e);
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteImage = async (image: GeneratedImage) => {
    if (!confirm('Are you sure you want to delete this image?')) return;
    
    try {
      const res = await fetch(`/api/images/delete?key=${encodeURIComponent(image.id)}&userId=${userId}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        setImages(images.filter(img => img.id !== image.id));
      } else {
        console.error('Failed to delete image');
      }
    } catch (e) {
      console.error('Error deleting image', e);
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
    <div className="relative flex h-full min-h-0 min-w-0 overflow-hidden bg-white dark:bg-gray-900">
      {/* Settings Button */}
      <div className="absolute top-4 right-4 z-10">
        <button
          ref={settingsButtonRef}
          type="button"
          onClick={() => setShowSettings(!showSettings)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-md transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          title="Generation Settings"
          aria-label="Generation settings"
          aria-expanded={showSettings}
        >
          <Settings size={20} />
        </button>
      </div>

      {/* Settings Popup */}
      {showSettings && (
        <div ref={settingsRef} className="fixed inset-x-3 top-20 z-20 max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 shadow-xl animate-in fade-in zoom-in-95 duration-100 dark:border-gray-700 dark:bg-gray-800 sm:absolute sm:left-auto sm:right-4 sm:top-16 sm:w-72">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm dark:text-white">Settings</h3>
            <button type="button" onClick={() => setShowSettings(false)} className="flex h-10 w-10 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-300" aria-label="Close generation settings">
              <X size={16} />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Width: {width}px
              </label>
              <input 
                type="range" 
                min="256" 
                max="1024" 
                step="64" 
                value={width} 
                onChange={(e) => setWidth(Number(e.target.value))}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Height: {height}px
              </label>
              <input 
                type="range" 
                min="256" 
                max="1024" 
                step="64" 
                value={height} 
                onChange={(e) => setHeight(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Steps: {steps}
              </label>
              <input 
                type="range" 
                min="1" 
                max="8" 
                step="1" 
                value={steps} 
                onChange={(e) => setSteps(Number(e.target.value))}
                className="w-full"
              />
              <p className="text-[10px] text-gray-500 mt-1">Flux Schnell works best with 4 steps.</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col">
        
        {/* Gallery Area */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4">
          {images.length === 0 && !generating ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <ImageIcon size={48} className="mb-4 opacity-50" />
              <p>No images generated yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {generating && (
                <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center animate-pulse border border-gray-200 dark:border-gray-700">
                  <span className="text-gray-500">Generating...</span>
                </div>
              )}
              {images.map((img) => (
                <div key={img.id} className="group relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                  <a 
                    href={img.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block w-full h-full cursor-zoom-in"
                  >
                    <img 
                      src={img.url} 
                      alt={img.prompt} 
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </a>
                  
                  {/* Overlay Actions */}
                  <div className="absolute right-2 top-2 flex gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                    <button 
                      type="button"
                      onClick={() => handleDeleteImage(img)}
                      className="p-2 bg-black/50 hover:bg-red-600 text-white rounded-full backdrop-blur-sm transition-colors"
                      title="Delete Image"
                      aria-label="Delete image"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                    <p className="text-white text-sm line-clamp-2 mb-2">{img.prompt}</p>
                    <div className="flex justify-end">
                      <button 
                        type="button"
                        onClick={() => insertSnippet(img.prompt)}
                        className="flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 text-white px-2 py-1 rounded backdrop-blur-sm transition-colors"
                      >
                        <Copy size={12} /> Use Prompt
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="safe-area-bottom shrink-0 border-t border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900 sm:p-4">
          
          {/* Snippets Bar */}
          {showSnippets && (
            <div className="mb-4">
              <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase">Snippets</span>
                <div className="flex min-w-0 gap-2">
                  <input 
                    value={newSnippet}
                    onChange={(e) => setNewSnippet(e.target.value)}
                    placeholder="New snippet..."
                    className="min-w-0 flex-1 rounded border p-2 text-base dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-xs"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSnippet()}
                  />
                  <button type="button" onClick={handleAddSnippet} className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-blue-100 text-blue-600 hover:bg-blue-200" aria-label="Add snippet">
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
                    <button type="button" onClick={() => handleDeleteSnippet(idx)} className="flex h-7 w-7 items-center justify-center text-gray-400 opacity-100 transition-opacity hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100" aria-label="Delete snippet">
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleGenerate} className="flex gap-2 max-w-4xl mx-auto">
            <textarea
              className="h-24 min-w-0 flex-1 resize-none rounded-lg border border-gray-300 bg-transparent p-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:text-white"
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
