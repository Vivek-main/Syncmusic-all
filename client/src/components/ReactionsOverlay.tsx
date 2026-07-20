import React, { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';

interface ReactionsOverlayProps {
    socket: Socket | null;
}

interface Reaction {
    id: string;
    emoji: string;
    left: number;
}

export const ReactionsOverlay: React.FC<ReactionsOverlayProps> = ({ socket }) => {
    const [reactions, setReactions] = useState<Reaction[]>([]);

    useEffect(() => {
        if (!socket) return;

        const handleReaction = ({ emoji, userId }: { emoji: string; userId: string; timestamp: number }) => {
            const newReaction = {
                id: `${Date.now()}-${Math.random()}`,
                emoji,
                // Random horizontal position between 10% and 90%
                left: 10 + Math.random() * 80,
            };

            setReactions(prev => [...prev, newReaction]);

            // Remove reaction after animation completes (3 seconds)
            setTimeout(() => {
                setReactions(prev => prev.filter(r => r.id !== newReaction.id));
            }, 3000);
        };

        socket.on('room-reaction', handleReaction);
        return () => {
            socket.off('room-reaction', handleReaction);
        };
    }, [socket]);

    return (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {reactions.map((reaction) => (
                <div
                    key={reaction.id}
                    className="absolute bottom-0 text-4xl animate-float-up opacity-0"
                    style={{ left: `${reaction.left}%` }}
                >
                    {reaction.emoji}
                </div>
            ))}
        </div>
    );
};
