import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '@/types';
import { Socket } from 'socket.io-client';
import { Send, MessageSquare } from 'lucide-react';

interface ChatBoxProps {
    socket: Socket | null;
    roomId: string;
    chatHistory: ChatMessage[];
    username: string;
}

export const ChatBox: React.FC<ChatBoxProps> = ({ socket, roomId, chatHistory, username }) => {
    const [message, setMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatHistory]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || !socket) return;
        
        socket.emit('send-chat', { roomId, text: message, username });
        setMessage('');
    };

    return (
        <div className="glass-card flex flex-col h-[400px]">
            <div className="p-4 border-b border-white/5 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary-400" />
                <h3 className="text-white font-semibold">Room Chat</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {chatHistory.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-500 text-sm text-center px-4">
                        Say hello to the room! 👋
                    </div>
                ) : (
                    chatHistory.map((msg) => (
                        <div key={msg.id} className="flex flex-col">
                            <span className="text-[10px] text-slate-500 font-medium ml-1 mb-0.5">{msg.username}</span>
                            <div className="bg-dark-600/50 rounded-2xl rounded-tl-sm px-3 py-2 text-sm text-gray-200 w-fit max-w-[90%] break-words shadow-sm">
                                {msg.text}
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-3 border-t border-white/5 flex gap-2">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-dark-600 border border-white/5 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-primary-500/50 transition-colors"
                    maxLength={200}
                />
                <button
                    type="submit"
                    disabled={!message.trim()}
                    className="bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:hover:bg-primary-600 text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors shrink-0 shadow-lg shadow-primary-500/20"
                >
                    <Send className="w-4 h-4 ml-0.5" />
                </button>
            </form>
        </div>
    );
};
