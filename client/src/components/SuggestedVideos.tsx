import React, { useEffect, useState } from 'react';
import { Play, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

interface SearchResult {
    videoId: string;
    title: string;
    thumbnail: string;
    duration: string;
    author: string;
}

interface SuggestedVideosProps {
    currentVideoId: string | null;
    currentVideoTitle: string | null;
    isHost: boolean;
    onVideoSelect: (videoId: string, title: string) => void;
    onAddToQueue: (video: SearchResult) => void;
}

export const SuggestedVideos: React.FC<SuggestedVideosProps> = ({
    currentVideoId,
    currentVideoTitle,
    isHost,
    onVideoSelect,
    onAddToQueue,
}) => {
    const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [page, setPage] = useState(1);
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Clean up video title for high relevance
    const getCleanTitle = (title: string | null) => {
        if (!title) return 'top hit music songs';
        return title
            .replace(/\(official video\)/gi, '')
            .replace(/official music video/gi, '')
            .replace(/official video/gi, '')
            .replace(/\(lyrics\)/gi, '')
            .replace(/\[.*\]/g, '')
            .replace(/full video/gi, '')
            .replace(/hd 4k/gi, '')
            .trim();
    };

    const fetchSuggestions = async (pageNum = 1, append = false) => {
        if (append) setIsFetchingMore(true);
        else setIsLoading(true);

        try {
            const cleanTitle = getCleanTitle(currentVideoTitle);
            const queryModifiers = ['', 'song', 'remix', 'lofi', 'full video', 'unplugged'];
            const modifier = queryModifiers[(pageNum - 1) % queryModifiers.length];
            const searchQuery = `${cleanTitle} ${modifier}`.trim();

            const localBackendUrl = `${window.location.protocol}//${window.location.hostname}:3001`;
            const API_URL = import.meta.env.VITE_SOCKET_URL || localBackendUrl;
            
            const res = await fetch(`${API_URL}/api/search?q=${encodeURIComponent(searchQuery)}`);
            if (!res.ok) throw new Error('Search failed');
            
            const data = await res.json();
            if (data.results && data.results.length > 0) {
                const filtered = data.results.filter((v: SearchResult) => v.videoId !== currentVideoId);
                setSuggestions(prev => {
                    if (append) {
                        const existingIds = new Set(prev.map(p => p.videoId));
                        const newUnique = filtered.filter((f: SearchResult) => !existingIds.has(f.videoId));
                        return [...prev, ...newUnique];
                    }
                    return filtered;
                });
            }
        } catch (err) {
            console.error('Failed to fetch suggestions:', err);
        } finally {
            setIsLoading(false);
            setIsFetchingMore(false);
        }
    };

    useEffect(() => {
        setPage(1);
        const timeout = setTimeout(() => fetchSuggestions(1, false), 300);
        return () => clearTimeout(timeout);
    }, [currentVideoId, currentVideoTitle]);

    // Endless Infinite Scroll Listener
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
        if (scrollHeight - (scrollTop + clientHeight) < 100 && !isLoading && !isFetchingMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchSuggestions(nextPage, true);
        }
    };

    if (isLoading) {
        return (
            <div className="glass-card p-4 mt-4 animate-pulse">
                <div className="h-6 bg-slate-700/50 rounded w-1/4 mb-4"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex flex-col gap-2">
                            <div className="w-full aspect-video bg-slate-700/50 rounded-lg"></div>
                            <div className="h-4 bg-slate-700/50 rounded w-3/4"></div>
                            <div className="h-3 bg-slate-700/50 rounded w-1/2"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (suggestions.length === 0) return null;

    return (
        <div className="glass-card p-4 mt-4">
            <div className="flex justify-between items-center mb-3">
                <h3 className="text-slate-900 dark:text-white font-semibold flex items-center gap-2">
                    Mini YouTube Recommendations ({suggestions.length})
                </h3>
            </div>
            
            <div 
                ref={containerRef}
                onScroll={handleScroll}
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-96 overflow-y-auto pr-1 scrollbar-thin"
            >
                {suggestions.map((video) => (
                    <div 
                        key={video.videoId}
                        onClick={() => {
                            if (isHost) {
                                onVideoSelect(video.videoId, video.title);
                                toast.success('Video loaded!', { icon: <Play className="w-4 h-4 text-green-500" /> });
                            } else {
                                onAddToQueue(video);
                                toast.success('Added to queue!', { icon: <Plus className="w-4 h-4 text-primary-500" /> });
                            }
                        }}
                        className="group flex flex-col gap-2 cursor-pointer bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/60 transition-all duration-200"
                    >
                        <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
                            <img 
                                src={video.thumbnail} 
                                alt={video.title}
                                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                            />
                            <div className="absolute bottom-1.5 right-1.5 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-medium text-white backdrop-blur-sm">
                                {video.duration}
                            </div>
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                                    <Play className="w-5 h-5 text-white ml-0.5" />
                                </div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between items-start gap-2">
                                <h4 className="text-sm font-medium text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors flex-1">
                                    {video.title}
                                </h4>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation(); // prevent playing video
                                        onAddToQueue(video);
                                        toast.success('Added to queue!', { icon: <Plus className="w-4 h-4 text-primary-500" /> });
                                    }}
                                    className="p-1.5 h-fit bg-primary-500/10 text-primary-600 dark:text-primary-400 hover:bg-primary-500 hover:text-white rounded transition-colors opacity-80 group-hover:opacity-100"
                                    title="Add to Queue"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                {video.author}
                            </p>
                        </div>
                    </div>
                ))}
                {isFetchingMore && (
                    <div className="col-span-full py-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                        Loading endless recommendations...
                    </div>
                )}
            </div>
        </div>
    );
};
