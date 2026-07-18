import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { extractVideoId } from '@/services/youtube';
import { Gamepad2, Search, AlertTriangle, Play } from 'lucide-react';

interface SearchResult {
    videoId: string;
    title: string;
    thumbnail: string;
    duration: string;
    author: string;
}

interface VideoSearchProps {
    onVideoSelect: (videoId: string, title: string) => void;
    isHost: boolean;
    currentVideoId: string | null;
}

export const VideoSearch: React.FC<VideoSearchProps> = ({
    onVideoSelect,
    isHost,
    currentVideoId,
}) => {
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setResults([]);

        const trimmed = query.trim();
        if (!trimmed) return;

        setIsLoading(true);

        // Check if it's a direct URL or video ID
        const directVideoId = extractVideoId(trimmed);
        if (directVideoId) {
            try {
                // Fetch video title from YouTube oEmbed API
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
                toast.success('Video loaded!', { icon: <Play className="w-4 h-4 text-green-500" /> });
            } catch (err) {
                toast.error('Failed to load video');
            } finally {
                setIsLoading(false);
            }
            return;
        }

        // Otherwise, perform a search
        try {
            const API_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
            const res = await fetch(`${API_URL}/api/search?q=${encodeURIComponent(trimmed)}`);
            if (!res.ok) throw new Error('Search failed');
            
            const data = await res.json();
            if (data.results && data.results.length > 0) {
                setResults(data.results);
            } else {
                setError('No results found.');
            }
        } catch (err) {
            console.error(err);
            setError('Failed to search YouTube. Please try again.');
        } finally {
            setIsLoading(false);
        }
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
                        placeholder="Search for videos or paste a URL..."
                        className="w-full bg-white/80 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 text-sm pr-24 transition-all shadow-sm focus:bg-white"
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

            {results.length > 0 && (
                <div className="mt-4 space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin pr-1">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Search Results</span>
                        <button 
                            onClick={() => setResults([])}
                            className="text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors"
                        >
                            Clear
                        </button>
                    </div>
                    {results.map(result => (
                        <button
                            key={result.videoId}
                            onClick={() => handleSelectResult(result)}
                            className="w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left bg-white border border-slate-100 shadow-sm hover:shadow"
                        >
                            <img 
                                src={result.thumbnail} 
                                alt="" 
                                className="w-24 h-16 object-cover rounded-lg bg-slate-100 shrink-0 border border-slate-200/50"
                            />
                            <div className="flex flex-col flex-1 min-w-0 py-0.5">
                                <span className="text-sm text-slate-900 font-semibold line-clamp-2 leading-tight">
                                    {result.title}
                                </span>
                                <span className="text-xs text-slate-600 mt-1.5 line-clamp-1 font-medium flex items-center gap-1">
                                    {result.author}
                                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                                    <span className="text-slate-500">{result.duration}</span>
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
            
            {results.length === 0 && !error && (
                <p className="text-slate-500 text-xs mt-3 text-center">
                    Type a search term (e.g. "lofi hip hop") or paste a video URL.
                </p>
            )}
        </div>
    );
};