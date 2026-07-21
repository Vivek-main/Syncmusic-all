import React, { useEffect, useState, useRef } from 'react';
import { Mic, Music } from 'lucide-react';

interface LyricsDisplayProps {
    videoTitle: string | null;
    currentTime: number;
}

interface LyricLine {
    time: number;
    text: string;
}

export const LyricsDisplay: React.FC<LyricsDisplayProps> = ({ videoTitle, currentTime }) => {
    const [lines, setLines] = useState<LyricLine[]>([]);
    const [plainText, setPlainText] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [activeLineIndex, setActiveLineIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);

    // Parse LRC format string "[00:12.34] Lyrics line" into array
    const parseLRC = (lrcString: string): LyricLine[] => {
        const parsed: LyricLine[] = [];
        const linesArr = lrcString.split('\n');
        const lrcRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\](.*)/;

        linesArr.forEach((line) => {
            const match = line.match(lrcRegex);
            if (match) {
                const min = parseInt(match[1], 10);
                const sec = parseInt(match[2], 10);
                const ms = match[3] ? parseInt(match[3].slice(0, 2), 10) / 100 : 0;
                const time = min * 60 + sec + ms;
                const text = match[4].trim();
                if (text) {
                    parsed.push({ time, text });
                }
            }
        });

        return parsed.sort((a, b) => a.time - b.time);
    };

    // Fetch lyrics when title changes
    useEffect(() => {
        if (!videoTitle) {
            setLines([]);
            setPlainText(null);
            return;
        }

        const fetchLyrics = async () => {
            setIsLoading(true);
            try {
                const localBackendUrl = `${window.location.protocol}//${window.location.hostname}:3001`;
                const API_URL = import.meta.env.VITE_SOCKET_URL || localBackendUrl;
                const res = await fetch(`${API_URL}/api/lyrics?q=${encodeURIComponent(videoTitle)}`);

                if (res.ok) {
                    const data = await res.json();
                    if (data.syncedLyrics) {
                        const parsed = parseLRC(data.syncedLyrics);
                        setLines(parsed);
                    } else if (data.plainLyrics) {
                        setPlainText(data.plainLyrics);
                        setLines([]);
                    }
                } else {
                    setLines([]);
                    setPlainText(null);
                }
            } catch (err) {
                console.error('[Lyrics] Fetch error', err);
            } finally {
                setIsLoading(false);
            }
        };

        const timer = setTimeout(fetchLyrics, 500);
        return () => clearTimeout(timer);
    }, [videoTitle]);

    // Track active line based on current video timestamp
    useEffect(() => {
        if (lines.length === 0) return;

        let index = -1;
        for (let i = 0; i < lines.length; i++) {
            if (currentTime >= lines[i].time) {
                index = i;
            } else {
                break;
            }
        }
        setActiveLineIndex(index);
    }, [currentTime, lines]);

    // Auto-scroll active line to center of lyrics container
    useEffect(() => {
        if (activeLineIndex >= 0 && containerRef.current) {
            const activeEl = containerRef.current.children[activeLineIndex] as HTMLElement;
            if (activeEl) {
                activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [activeLineIndex]);

    if (!videoTitle) return null;

    return (
        <div className="glass-card p-4 mt-4">
            <h3 className="text-slate-900 dark:text-white font-semibold mb-3 text-sm flex items-center gap-2">
                <Mic className="w-4 h-4 text-primary-500" /> Live Karaoke Lyrics
            </h3>

            {isLoading && (
                <div className="flex items-center justify-center py-8 text-slate-500 text-xs gap-2">
                    <span className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    Fetching synchronized lyrics...
                </div>
            )}

            {!isLoading && lines.length > 0 && (
                <div
                    ref={containerRef}
                    className="max-h-60 overflow-y-auto space-y-2 py-4 px-2 text-center scrollbar-thin rounded-xl bg-slate-50 dark:bg-dark-800 border border-slate-100 dark:border-dark-700"
                >
                    {lines.map((line, idx) => (
                        <p
                            key={idx}
                            className={`text-sm md:text-base font-semibold transition-all duration-300 ${
                                idx === activeLineIndex
                                    ? 'text-primary-600 dark:text-primary-400 scale-105 font-bold tracking-wide drop-shadow-sm'
                                    : 'text-slate-400 dark:text-slate-500 opacity-60'
                            }`}
                        >
                            {line.text}
                        </p>
                    ))}
                </div>
            )}

            {!isLoading && lines.length === 0 && plainText && (
                <div className="max-h-60 overflow-y-auto whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300 p-4 rounded-xl bg-slate-50 dark:bg-dark-800 border border-slate-100 dark:border-dark-700 leading-relaxed">
                    {plainText}
                </div>
            )}

            {!isLoading && lines.length === 0 && !plainText && (
                <div className="text-center py-6 text-slate-400 text-xs flex flex-col items-center gap-1.5">
                    <Music className="w-6 h-6 text-slate-300" />
                    <span>No synchronized lyrics found for this song.</span>
                </div>
            )}
        </div>
    );
};
