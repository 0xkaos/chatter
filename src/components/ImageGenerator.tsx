'use client';

import { useState, useEffect } from 'react';
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
    <div className="flex h-full bg-white dark:bg-gray-900 overflow-hidden relative">
      {/* Settings Button */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Generation Settings"
        >
          <Settings size={20} />
        </button>
      </div>

      {/* Settings Popup */}
      {showSettings && (
        <div className="absolute top-16 right-4 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-20 p-4 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm dark:text-white">Settings</h3>
            <button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
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
      <div className="flex-1 flex flex-col h-full relative">
        
        {/* Gallery Area */}
        <div className="flex-1 overflow-y-auto p-4">
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
                  <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleDeleteImage(img)}
                      className="p-2 bg-black/50 hover:bg-red-600 text-white rounded-full backdrop-blur-sm transition-colors"
                      title="Delete Image"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-sm line-clamp-2 mb-2">{img.prompt}</p>
                    <div className="flex justify-end">
                      <button 
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
