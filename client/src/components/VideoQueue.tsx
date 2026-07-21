import React from 'react';
import { QueueItem } from '@/types';
import { Play, Trash2, ListMusic, ExternalLink } from 'lucide-react';
import { Socket } from 'socket.io-client';
import toast from 'react-hot-toast';

interface VideoQueueProps {
    queue: QueueItem[];
    isHost: boolean;
    socket: Socket | null;
    roomId: string;
}

export const VideoQueue: React.FC<VideoQueueProps> = ({ queue, isHost, socket, roomId }) => {
    if (!queue || queue.length === 0) return null;

    const handlePlayNext = () => {
        if (!isHost || !socket) return;
        socket.emit('play-next', { roomId });
    };

    const handleRemove = (queueItemId: string) => {
        if (!isHost || !socket) return;
        socket.emit('remove-from-queue', { roomId, queueItemId });
    };

    const handleExportQueue = () => {
        const videoIds = queue.map(item => item.videoId).filter(Boolean);
        if (videoIds.length === 0) return;

        const playlistUrl = `https://www.youtube.com/watch_videos?video_ids=${videoIds.join(',')}`;
        window.open(playlistUrl, '_blank');
        toast.success('Exported queue to YouTube playlist!', { icon: <ExternalLink className="w-4 h-4 text-green-500" /> });
    };

    return (
        <div className="glass-card p-4 mt-4">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h3 className="text-slate-900 dark:text-white font-semibold flex items-center gap-2">
                    <ListMusic className="w-5 h-5 text-primary-500" />
                    Up Next ({queue.length})
                </h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExportQueue}
                        className="text-xs bg-slate-100 dark:bg-dark-700 hover:bg-slate-200 dark:hover:bg-dark-600 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 font-medium border border-slate-200 dark:border-slate-700"
                        title="Export current queue as YouTube Playlist"
                    >
                        <ExternalLink className="w-3.5 h-3.5" /> Export Playlist
                    </button>

                    {isHost && queue.length > 0 && (
                        <button
                            onClick={handlePlayNext}
                            className="text-xs bg-primary-600 hover:bg-primary-500 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 font-medium shadow-sm"
                        >
                            <Play className="w-3 h-3" /> Skip to Next
                        </button>
                    )}
                </div>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {queue.map((item, index) => (
                    <div 
                        key={item.id} 
                        className="flex items-center gap-3 p-2 rounded-lg bg-dark-600/50 hover:bg-dark-600 transition-colors group"
                    >
                        <div className="text-slate-500 font-medium text-sm w-4 text-center">
                            {index + 1}
                        </div>
                        <div className="relative w-24 aspect-video rounded overflow-hidden shrink-0">
                            <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                            <div className="absolute bottom-1 right-1 bg-black/80 px-1 rounded text-[9px] font-medium text-white">
                                {item.duration}
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-white line-clamp-1">{item.title}</h4>
                            <p className="text-xs text-slate-400 truncate">{item.author}</p>
                        </div>
                        {isHost && (
                            <button
                                onClick={() => handleRemove(item.id)}
                                className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all shrink-0"
                                title="Remove from queue"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
