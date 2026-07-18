/**
 * User List Component
 * Displays all connected users with their roles and latency
 */

import React from 'react';
import { RoomUser } from '@/types';
import { cn } from '@/utils/cn';
import { Users, Crown, SlidersHorizontal } from 'lucide-react';

interface UserListProps {
    users: RoomUser[];
    currentUserId: string;
    hostId: string;
    controllers?: string[];
    isHost?: boolean;
    onGrantControl?: (userId: string) => void;
    onRevokeControl?: (userId: string) => void;
}

export const UserList: React.FC<UserListProps> = ({
    users,
    currentUserId,
    hostId,
    controllers = [],
    isHost = false,
    onGrantControl,
    onRevokeControl,
}) => {
    return (
        <div className="glass-card p-4">
            <h3 className="text-slate-900 font-semibold mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500" /> Connected Users
                <span className="ml-auto text-xs text-slate-600 font-medium bg-slate-100 px-2 py-1 rounded-full border border-slate-200">
                    {users.length} online
                </span>
            </h3>

            <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                {users.map((user) => (
                    <UserListItem
                        key={user.id}
                        user={user}
                        isCurrentUser={user.id === currentUserId}
                        isHost={user.id === hostId}
                        isController={controllers.includes(user.id)}
                        canManage={isHost && user.id !== currentUserId}
                        onGrantControl={onGrantControl}
                        onRevokeControl={onRevokeControl}
                    />
                ))}
            </div>
        </div>
    );
};

interface UserListItemProps {
    user: RoomUser;
    isCurrentUser: boolean;
    isHost: boolean;
    isController: boolean;
    canManage: boolean;
    onGrantControl?: (userId: string) => void;
    onRevokeControl?: (userId: string) => void;
}

const UserListItem: React.FC<UserListItemProps> = ({
    user,
    isCurrentUser,
    isHost,
    isController,
    canManage,
    onGrantControl,
    onRevokeControl,
}) => {
    const latencyColor =
        user.latency < 50 ? 'text-green-600' :
            user.latency < 150 ? 'text-yellow-600' :
                'text-red-600';

    return (
        <div
            className={cn(
                'flex flex-col gap-2 px-3 py-2 rounded-xl transition-all border',
                isCurrentUser ? 'bg-primary-50 border-primary-200 shadow-sm' : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
            )}
        >
            <div className="flex items-center gap-3">
            {/* Avatar */}
            <div
                className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
                    isHost ? 'bg-yellow-500 text-black' : 'bg-primary-600 text-white'
                )}
            >
                {user.username.charAt(0).toUpperCase()}
            </div>

            {/* Name & Role */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <span className="text-slate-900 text-sm font-semibold truncate">
                        {user.username}
                    </span>
                    {isCurrentUser && (
                        <span className="text-xs text-slate-500 font-medium">(you)</span>
                    )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                    {isHost && (
                        <span className="text-xs text-yellow-600 font-medium flex items-center gap-1">
                            <Crown className="w-3 h-3" /> Host
                        </span>
                    )}
                    {isController && !isHost && (
                        <span className="text-xs text-secondary-600 font-medium flex items-center gap-1">
                            <SlidersHorizontal className="w-3 h-3" /> Co-Host
                        </span>
                    )}
                </div>
            </div>

            {/* Latency */}
            {user.latency > 0 && (
                <div className={cn('text-xs font-mono font-medium flex-shrink-0', latencyColor)}>
                    {user.latency}ms
                </div>
            )}

            {/* Online indicator */}
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full flex-shrink-0 shadow-sm" />
            </div>

            {/* Management Buttons */}
            {canManage && (
                <div className="flex gap-2 mt-1 border-t border-slate-200 pt-2">
                    {isController ? (
                        <button
                            onClick={() => onRevokeControl?.(user.id)}
                            className="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg font-medium transition-colors w-full border border-red-200"
                        >
                            Revoke Access
                        </button>
                    ) : (
                        <button
                            onClick={() => onGrantControl?.(user.id)}
                            className="text-xs bg-secondary-50 text-secondary-600 hover:bg-secondary-100 px-3 py-1.5 rounded-lg font-medium transition-colors w-full border border-secondary-200"
                        >
                            Grant Access
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};