import React from 'react';
import { Link } from 'lucide-react';

interface VideoInfoProps {
    videoId: string;
    videoTitle: string | null;
    hostUsername: string;
    children?: React.ReactNode;
}

export const VideoInfo: React.FC<VideoInfoProps> = ({ videoId, videoTitle, hostUsername, children }) => {
    return (
        <div className="glass-card p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div>
                <h2 className="text-slate-900 font-bold text-xl line-clamp-1">
                    {videoTitle || 'Unknown Video'}
                </h2>
                <div className="flex items-center gap-2 mt-1 text-sm text-slate-500 font-medium">
                    <span>Selected by <span className="text-primary-600 font-semibold">{hostUsername}</span></span>
                    <span>•</span>
                    <a 
                        href={`https://youtube.com/watch?v=${videoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-slate-900 transition-colors"
                    >
                        Watch on YouTube ↗
                    </a>
                </div>
            </div>
            
            <div className="flex flex-wrap gap-2 shrink-0">
                <button 
                    onClick={() => {
                        navigator.clipboard.writeText(`https://youtube.com/watch?v=${videoId}`);
                    }}
                    className="bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs px-4 py-2 rounded-full transition-all flex items-center gap-1.5 border border-slate-200 shadow-sm hover:shadow"
                >
                    <Link className="w-3.5 h-3.5" /> Copy Link
                </button>
                {children}
            </div>
        </div>
    );
};
