import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { extractVideoId, extractPlaylistId } from '@/services/youtube';
import { Gamepad2, Search, AlertTriangle, Play, Plus, ListMusic } from 'lucide-react';

interface SearchResult {
    videoId: string;
    title: string;
    thumbnail: string;
    duration: string;
    author: string;
}

interface VideoSearchProps {
    onVideoSelect: (videoId: string, title: string) => void;
    onAddToQueue: (video: SearchResult) => void;
    isHost: boolean;
    currentVideoId: string | null;
}

export const VideoSearch: React.FC<VideoSearchProps> = ({
    onVideoSelect,
    onAddToQueue,
    isHost,
    currentVideoId,
}) => {
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number>(-1);

    const clientSearchCacheRef = React.useRef<Map<string, SearchResult[]>>(new Map());

    const performSearch = async (searchQuery: string) => {
        const trimmed = searchQuery.trim();
        setSuggestions([]); // Clear suggestions when searching
        setSelectedSuggestionIndex(-1);

        if (!trimmed) {
            setResults([]);
            setError('');
            return;
        }

        // Don't auto-search if it's a URL
        const directVideoId = extractVideoId(trimmed);
        const playlistId = extractPlaylistId(trimmed);
        if (directVideoId || playlistId) return;

        const cacheKey = trimmed.toLowerCase();
        if (clientSearchCacheRef.current.has(cacheKey)) {
            setResults(clientSearchCacheRef.current.get(cacheKey) || []);
            setError('');
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const localBackendUrl = `${window.location.protocol}//${window.location.hostname}:3001`;
            const API_URL = import.meta.env.VITE_SOCKET_URL || localBackendUrl;
            const res = await fetch(`${API_URL}/api/search?q=${encodeURIComponent(trimmed)}`);
            if (!res.ok) throw new Error('Search failed');
            
            const data = await res.json();
            if (data.results && data.results.length > 0) {
                clientSearchCacheRef.current.set(cacheKey, data.results);
                setResults(data.results);
            } else {
                setError('No results found.');
                setResults([]);
            }
        } catch (err) {
            console.error(err);
            setError('Failed to search YouTube. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-search suggestions as the user types (debounced)
    useEffect(() => {
        const timer = setTimeout(async () => {
            const trimmed = query.trim();
            if (trimmed && !extractVideoId(trimmed) && !extractPlaylistId(trimmed)) {
                try {
                    const localBackendUrl = `${window.location.protocol}//${window.location.hostname}:3001`;
                    const API_URL = import.meta.env.VITE_SOCKET_URL || localBackendUrl;
                    const res = await fetch(`${API_URL}/api/suggestions?q=${encodeURIComponent(trimmed)}`);
                    if (res.ok) {
                        const data = await res.json();
                        setSuggestions(data.suggestions || []);
                        setSelectedSuggestionIndex(-1);
                    }
                } catch (err) {
                    console.error('Failed to fetch suggestions', err);
                }
            } else {
                setSuggestions([]);
                setSelectedSuggestionIndex(-1);
            }
        }, 200); // Fast 200ms debounce for text autocomplete

        return () => clearTimeout(timer);
    }, [query]);

    const handleSuggestionClick = (suggestion: string) => {
        setQuery(suggestion);
        setSuggestions([]);
        setSelectedSuggestionIndex(-1);
        performSearch(suggestion);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (suggestions.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedSuggestionIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedSuggestionIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
        } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
            e.preventDefault();
            const selected = suggestions[selectedSuggestionIndex];
            if (selected) {
                handleSuggestionClick(selected);
            }
        } else if (e.key === 'Escape') {
            setSuggestions([]);
            setSelectedSuggestionIndex(-1);
        }
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setError('');
        
        const trimmed = query.trim();
        if (!trimmed) return;

        // 1. Handle YouTube Playlist URL
        const playlistId = extractPlaylistId(trimmed);
        if (playlistId) {
            setIsLoading(true);
            try {
                const localBackendUrl = `${window.location.protocol}//${window.location.hostname}:3001`;
                const API_URL = import.meta.env.VITE_SOCKET_URL || localBackendUrl;
                const res = await fetch(`${API_URL}/api/playlist?list=${encodeURIComponent(playlistId)}`);
                if (!res.ok) throw new Error('Playlist load failed');

                const data = await res.json();
                if (data.videos && data.videos.length > 0) {
                    // Play the first video if no video is currently playing
                    if (!currentVideoId) {
                        onVideoSelect(data.videos[0].videoId, data.videos[0].title);
                        // Add the rest to queue
                        data.videos.slice(1).forEach((v: SearchResult) => onAddToQueue(v));
                    } else {
                        // Add all to queue
                        data.videos.forEach((v: SearchResult) => onAddToQueue(v));
                    }

                    setQuery('');
                    setResults([]);
                    toast.success(`Loaded playlist: ${data.videos.length} videos added!`, {
                        icon: <ListMusic className="w-4 h-4 text-primary-500" />
                    });
                } else {
                    setError('Playlist is empty or unavailable');
                }
            } catch (err) {
                console.error(err);
                setError('Failed to load playlist. Please check the URL.');
            } finally {
                setIsLoading(false);
            }
            return;
        }

        // 2. Handle Direct YouTube Video URL
        const directVideoId = extractVideoId(trimmed);
        if (directVideoId) {
            setIsLoading(true);
            try {
                const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${directVideoId}&format=json`;
                let title = `YouTube Video (${directVideoId})`;
                try {
                    const response = await fetch(oEmbedUrl);
                    if (response.ok) {
                        const data = await response.json();
                        title = data.title || title;
                    }
                } catch {
                    console.warn('[VideoSearch] Could not fetch video title');
                }
                onVideoSelect(directVideoId, title);
                setQuery('');
                setResults([]);
                toast.success('Video loaded!', { icon: <Play className="w-4 h-4 text-green-500" /> });
            } catch (err) {
                toast.error('Failed to load video');
            } finally {
                setIsLoading(false);
            }
            return;
        }

        // 3. Trigger regular video search
        performSearch(query);
    };

    const handleSelectResult = (result: SearchResult) => {
        onVideoSelect(result.videoId, result.title);
        setQuery('');
        setResults([]);
        toast.success('Video loaded!', { icon: <Play className="w-4 h-4 text-green-500" /> });
    };

    if (!isHost) {
        return (
            <div className="glass-card p-4 text-center">
                <p className="text-slate-500 text-sm font-medium flex items-center justify-center gap-1.5">
                    <Gamepad2 className="w-4 h-4" /> Only the host and co-hosts can change the video
                </p>
                {currentVideoId && (
                    <a
                        href={`https://youtube.com/watch?v=${currentVideoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 text-xs hover:underline mt-1 inline-block font-medium transition-colors"
                    >
                        View on YouTube ↗
                    </a>
                )}
            </div>
        );
    }

    return (
        <div className="glass-card p-4">
            <h3 className="text-slate-900 font-semibold mb-3 flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-500" /> Load or Search YouTube
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3">
                <div className="relative">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setError('');
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Search videos, paste YouTube link or Playlist URL..."
                        className="w-full bg-white/80 dark:bg-dark-700/80 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 text-sm pr-24 transition-all shadow-sm focus:bg-white dark:focus:bg-dark-700"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !query.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium px-4 py-2 rounded-md transition-all shadow-[0_4px_10px_rgba(139,92,246,0.2)] hover:shadow-[0_6px_15px_rgba(139,92,246,0.3)]"
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-1">
                                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            </span>
                        ) : (
                            'Search'
                        )}
                    </button>
                </div>

                {error && (
                    <p className="text-red-500 text-xs flex items-center gap-1 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" /> {error}
                    </p>
                )}
            </form>

            {suggestions.length > 0 && results.length === 0 && (
                <div className="mt-2 space-y-1 max-h-60 overflow-y-auto">
                    {suggestions.map((suggestion, index) => (
                        <button
                            key={index}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className={`w-full flex items-center gap-2 p-2.5 rounded-xl transition-all text-left border text-sm font-medium ${
                                index === selectedSuggestionIndex
                                    ? 'bg-primary-500/20 border-primary-500/40 text-primary-700 dark:text-primary-300 font-semibold shadow-sm'
                                    : 'bg-white dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700/60 text-slate-800 dark:text-slate-200'
                            }`}
                        >
                            <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400" />
                            <span>{suggestion}</span>
                        </button>
                    ))}
                </div>
            )}

            {results.length > 0 && (
                <div className="mt-4 space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin pr-1">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Search Results</span>
                        <button 
                            onClick={() => setResults([])}
                            className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium transition-colors"
                        >
                            Clear
                        </button>
                    </div>
                    {results.map(result => (
                        <div key={result.videoId} className="flex gap-2 w-full p-2.5 rounded-xl transition-all bg-white dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700/60 text-slate-900 dark:text-white shadow-sm">
                            <button
                                onClick={() => handleSelectResult(result)}
                                className="flex items-start gap-3 flex-1 text-left"
                            >
                                <img 
                                    src={result.thumbnail} 
                                    alt="" 
                                    className="w-24 h-16 object-cover rounded-lg bg-slate-100 dark:bg-slate-900 shrink-0 border border-slate-200/50 dark:border-slate-700/50"
                                />
                                <div className="flex flex-col flex-1 min-w-0 py-0.5">
                                    <span className="text-sm text-slate-900 dark:text-white font-semibold line-clamp-2 leading-tight">
                                        {result.title}
                                    </span>
                                    <span className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 line-clamp-1 font-medium flex items-center gap-1">
                                        {result.author}
                                        <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                                        <span className="text-slate-500 dark:text-slate-400">{result.duration}</span>
                                    </span>
                                </div>
                            </button>
                            <button
                                onClick={() => {
                                    onAddToQueue(result);
                                    toast.success('Added to queue!', { icon: <Plus className="w-4 h-4 text-primary-500" /> });
                                }}
                                className="p-2 h-fit bg-primary-500/10 text-primary-600 dark:text-primary-400 hover:bg-primary-500 hover:text-white rounded-lg transition-colors border border-primary-500/20 shrink-0"
                                title="Add to Queue"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
            
            {results.length === 0 && suggestions.length === 0 && !error && (
                <p className="text-slate-500 text-xs mt-3 text-center">
                    Type a search term (e.g. "lofi hip hop") or paste a video URL.
                </p>
            )}
        </div>
    );
};