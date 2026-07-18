/**
 * Connection Status Banner
 * Shows when user is disconnected or reconnecting
 */

import React from 'react';
import { ConnectionStatus } from '@/types';
import { cn } from '@/utils/cn';
import { Plug, RefreshCw, Zap } from 'lucide-react';

interface ConnectionBannerProps {
    status: ConnectionStatus;
}

export const ConnectionBanner: React.FC<ConnectionBannerProps> = ({ status }) => {
    if (status === 'connected') return null;

    const config = {
        disconnected: {
            bg: 'bg-red-500/90',
            icon: <Plug className="w-4 h-4" />,
            message: 'Disconnected from server. Trying to reconnect...',
        },
        reconnecting: {
            bg: 'bg-orange-500/90',
            icon: <RefreshCw className="w-4 h-4 animate-spin" />,
            message: 'Reconnecting to server...',
        },
        connecting: {
            bg: 'bg-yellow-500/90',
            icon: <Zap className="w-4 h-4" />,
            message: 'Connecting to server...',
        },
    };

    const { bg, icon, message } = config[status] || config.connecting;

    return (
        <div className={cn('fixed top-0 inset-x-0 z-50 py-2 px-4 flex items-center justify-center gap-2 text-white text-sm font-medium animate-fade-in', bg)}>
            {icon}
            {message}
        </div>
    );
};