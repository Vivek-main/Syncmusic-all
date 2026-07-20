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

    useEffect(() => {
        if (!currentVideoId || !currentVideoTitle) {
            setSuggestions([]);
            return;
        }

        const fetchSuggestions = async () => {
            setIsLoading(true);
            try {
                // Generate a search query based on the current video title to find related content
                // Remove generic words like "Official Video" or "Lyrics" to get better recommendations
                const cleanQuery = currentVideoTitle
                    .replace(/official video/i, '')
                    .replace(/lyrics/i, '')
                    .replace(/music video/i, '')
                    .trim();

                const localBackendUrl = `${window.location.protocol}//${window.location.hostname}:3001`;
                const API_URL = import.meta.env.VITE_SOCKET_URL || localBackendUrl;
                
                const res = await fetch(`${API_URL}/api/search?q=${encodeURIComponent(cleanQuery + ' song')}`);
                if (!res.ok) throw new Error('Search failed');
                
                const data = await res.json();
                if (data.results && data.results.length > 0) {
                    // Filter out the currently playing video
                    const filtered = data.results.filter((v: SearchResult) => v.videoId !== currentVideoId);
                    setSuggestions(filtered.slice(0, 4)); // Show top 4 suggestions
                }
            } catch (err) {
                console.error('Failed to fetch suggestions:', err);
            } finally {
                setIsLoading(false);
            }
        };

        // Add a small delay so we don't spam the API immediately when typing or changing fast
        const timeout = setTimeout(fetchSuggestions, 1000);
        return () => clearTimeout(timeout);
    }, [currentVideoId, currentVideoTitle]);

    if (!currentVideoId || !isHost) return null;

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
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                Suggested Videos
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {suggestions.map((video) => (
                    <div 
                        key={video.videoId}
                        onClick={() => {
                            onVideoSelect(video.videoId, video.title);
                            toast.success('Video loaded!', { icon: <Play className="w-4 h-4 text-green-500" /> });
                        }}
                        className="group flex flex-col gap-2 cursor-pointer hover:bg-slate-800/50 p-2 rounded-xl transition-all duration-200"
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
                                <h4 className="text-sm font-medium text-white line-clamp-2 leading-snug group-hover:text-primary-400 transition-colors flex-1">
                                    {video.title}
                                </h4>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation(); // prevent playing video
                                        onAddToQueue(video);
                                        toast.success('Added to queue!', { icon: <Plus className="w-4 h-4 text-primary-500" /> });
                                    }}
                                    className="p-1.5 h-fit bg-primary-500/10 text-primary-400 hover:bg-primary-500 hover:text-white rounded transition-colors opacity-0 group-hover:opacity-100"
                                    title="Add to Queue"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                                {video.author}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
