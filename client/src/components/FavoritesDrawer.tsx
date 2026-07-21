import React, { useEffect, useState } from 'react';
import { Heart, Plus, Trash2, X, Music } from 'lucide-react';
import toast from 'react-hot-toast';

export interface FavoriteItem {
    videoId: string;
    title: string;
    thumbnail: string;
    duration: string;
    author: string;
    addedAt: number;
}

interface FavoritesDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    isHost: boolean;
    onVideoSelect: (videoId: string, title: string) => void;
    onAddToQueue: (video: any) => void;
}

const STORAGE_KEY = 'syncmusic_favorites';

export const getSavedFavorites = (): FavoriteItem[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

export const saveFavoriteTrack = (track: { videoId: string; title: string; thumbnail?: string; duration?: string; author?: string }) => {
    const existing = getSavedFavorites();
    if (existing.some(f => f.videoId === track.videoId)) {
        // Remove if already exists
        const updated = existing.filter(f => f.videoId !== track.videoId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        toast('Removed from Favorites', { icon: '💔' });
        return false;
    } else {
        const newItem: FavoriteItem = {
            videoId: track.videoId,
            title: track.title,
            thumbnail: track.thumbnail || `https://img.youtube.com/vi/${track.videoId}/hqdefault.jpg`,
            duration: track.duration || '3:30',
            author: track.author || 'YouTube',
            addedAt: Date.now(),
        };
        const updated = [newItem, ...existing];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        toast.success('Saved to Favorites!', { icon: <Heart className="w-4 h-4 text-red-500 fill-red-500" /> });
        return true;
    }
};

export const FavoritesDrawer: React.FC<FavoritesDrawerProps> = ({
    isOpen,
    onClose,
    isHost,
    onVideoSelect,
    onAddToQueue,
}) => {
    const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

    useEffect(() => {
        if (isOpen) {
            setFavorites(getSavedFavorites());
        }
    }, [isOpen]);

    const handleRemove = (videoId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const updated = favorites.filter(f => f.videoId !== videoId);
        setFavorites(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        toast('Removed from Favorites', { icon: '💔' });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md bg-white dark:bg-[#111827] h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-slide-left">
                {/* Drawer Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-2">
                        <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">My Favorite Tracks</h2>
                        <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-xs font-semibold">
                            {favorites.length}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Favorites List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                    {favorites.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                            <Music className="w-12 h-12 mb-3 stroke-[1.5] text-slate-300 dark:text-slate-700" />
                            <p className="font-semibold text-slate-700 dark:text-slate-300">No favorite tracks yet</p>
                            <p className="text-xs text-slate-400 mt-1 max-w-xs">
                                Click the ❤️ icon on any playing track or search result to save it here for quick access!
                            </p>
                        </div>
                    ) : (
                        favorites.map((item) => (
                            <div
                                key={item.videoId}
                                onClick={() => {
                                    if (isHost) {
                                        onVideoSelect(item.videoId, item.title);
                                        toast.success('Playing favorite track!');
                                    } else {
                                        onAddToQueue(item);
                                        toast.success('Added favorite to queue!');
                                    }
                                }}
                                className="group flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 cursor-pointer transition-all"
                            >
                                <img
                                    src={item.thumbnail}
                                    alt=""
                                    className="w-16 h-12 object-cover rounded-lg bg-black shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                        {item.title}
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        {item.author} • {item.duration}
                                    </p>
                                </div>

                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onAddToQueue(item);
                                            toast.success('Added to queue!');
                                        }}
                                        className="p-1.5 rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400 hover:bg-primary-500 hover:text-white transition-colors"
                                        title="Add to Queue"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(e) => handleRemove(item.videoId, e)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                        title="Remove from Favorites"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
