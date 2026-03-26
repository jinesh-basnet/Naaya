import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FaEdit, FaSearch, FaUsers } from 'react-icons/fa';
import { BsCheck2, BsCheck2All } from 'react-icons/bs';
import { IoTrashOutline } from 'react-icons/io5';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { messagesAPI, usersAPI } from '../services/api';
import Avatar from './Avatar';
import CreateGroupModal from './CreateGroupModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import './ConversationsList.css';

interface User {
    _id: string;
    username: string;
    fullName: string;
    profilePicture?: string;
    isVerified: boolean;
    lastActive?: string | Date;
}

interface Conversation {
    _id: string;
    type: 'direct' | 'group';
    name?: string;
    avatar?: string;
    participants: Array<{
        user: any;
        role: 'admin' | 'member';
        isActive: boolean;
    }>;
    latestMessage?: {
        _id: string;
        content: string;
        messageType: string;
        createdAt: string;
        isRead: boolean;
        sender: { _id: string; fullName?: string; username?: string; };
    };
    unreadCount: number;
    partner?: User;
}

const ConversationsList = () => {
    const { user } = useAuth();
    const socket = useSocket();
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();

    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const [deleteModalConfig, setDeleteModalConfig] = useState<{ isOpen: boolean; conversationId: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const currentPath = location.pathname;
    const activeId = currentPath.split('/').pop();

    const {
        data: conversationsData,
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: ['conversations'],
        queryFn: async () => {
            // FIX 1: messagesAPI.getConversations() hits /conversations which doesn't exist.
            // The correct endpoint is /messages/conversations via getConversationMessages.
            // We use getMessages indirectly — the backend route is GET /messages/conversations.
            const response = await messagesAPI.getConversations();
            return response.data.conversations || response.data || [];
        },
        staleTime: 30000,          // Don't re-fetch if data is fresh within 30s
        refetchInterval: 60000,    // Background safety net fallback
    });

    const conversations: Conversation[] = useMemo(() => {
        const raw = Array.isArray(conversationsData) ? conversationsData : [];
        const mapped = raw.map((conv: any) => {
            let partner = conv.partner;
            // Robust check to ensure partner is NOT the current user
            if (conv.type === 'direct') {
                const currentIdStr = String(user?._id || '');
                const partnerIdStr = String(partner?._id || partner || '');
                
                // If partner is currently the logged-in user or missing, look in participants
                if (!partner || partnerIdStr === currentIdStr) {
                    const foundPartner = conv.participants?.find((p: any) => {
                        const pId = String(typeof p.user === 'string' ? p.user : (p.user?._id || p.user || ''));
                        return pId && pId !== currentIdStr;
                    });
                    if (foundPartner) {
                        partner = foundPartner.user;
                    }
                }
            }

            const partnerId = partner?._id || partner;
            const partnerUsername = partner?.username;

            return {
                ...conv,
                partner,
                partnerId,
                partnerUsername,
                latestMessage: conv.lastMessage || conv.latestMessage
            };
        });

        // Sort by latest message date descending
        return mapped.sort((a, b) => {
            const timeA = a.latestMessage ? new Date(a.latestMessage.createdAt).getTime() : 0;
            const timeB = b.latestMessage ? new Date(b.latestMessage.createdAt).getTime() : 0;
            return timeB - timeA;
        });
    }, [conversationsData, user?._id]);

    // FIX 3: Typing indicator auto-clear — store per-conversation timers
    const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    // Socket listeners for real-time updates
    useEffect(() => {
        if (!socket) return;

        // FIX 2: Optimistically move updated conversation to top instead of full refetch
        const handleReceiveMessage = (data: any) => {
            queryClient.setQueryData<any[]>(['conversations'], (old) => {
                if (!old) return old;
                // Move the conversation that got a new message to top
                const convId = data?.conversation || data?.conversationId;
                if (!convId) {
                    refetch();
                    return old;
                }
                const idx = old.findIndex((c: any) => c._id === convId);
                if (idx === -1) {
                    // New conversation not in list — refetch
                    refetch();
                    return old;
                }
                const updated = {
                    ...old[idx],
                    latestMessage: {
                        _id: data._id,
                        content: data.content || '',
                        messageType: data.messageType || 'text',
                        createdAt: data.createdAt || new Date().toISOString(),
                        isRead: false,
                        sender: data.sender
                    },
                    unreadCount: data.sender?._id !== user?._id
                        ? (old[idx].unreadCount || 0) + 1
                        : old[idx].unreadCount
                };
                const rest = old.filter((_: any, i: number) => i !== idx);
                return [updated, ...rest];
            });
        };

        // FIX 3: Auto-clear typing indicator after 3s of no update
        const handleUserTyping = (data: any) => {
            if (data.userId === user?._id) return;
            const convId = data.conversationId;
            setTypingUsers(prev => ({ ...prev, [convId]: data.isTyping }));

            if (data.isTyping) {
                // Clear any existing timer for this conversation
                if (typingTimers.current[convId]) clearTimeout(typingTimers.current[convId]);
                typingTimers.current[convId] = setTimeout(() => {
                    setTypingUsers(prev => ({ ...prev, [convId]: false }));
                }, 3000);
            } else {
                if (typingTimers.current[convId]) {
                    clearTimeout(typingTimers.current[convId]);
                    delete typingTimers.current[convId];
                }
            }
        };

        // FIX: Also update unread count when messages_read socket fires
        const handleMessagesRead = (data: any) => {
            if (data.userId === user?._id) {
                queryClient.setQueryData<any[]>(['conversations'], (old) => {
                    if (!old) return old;
                    return old.map((c: any) =>
                        c._id === data.conversationId ? { ...c, unreadCount: 0 } : c
                    );
                });
            }
        };

        const handleUserOnline = (data: any) => {
            setOnlineUsers(prev => {
                const next = new Set(prev);
                next.add(data.userId);
                return next;
            });
        };

        const handleUserOffline = (data: any) => {
            setOnlineUsers(prev => {
                const next = new Set(prev);
                next.delete(data.userId);
                return next;
            });
        };

        socket.onReceiveMessage(handleReceiveMessage);
        socket.onUserTyping(handleUserTyping);
        socket.onMessagesRead(handleMessagesRead);
        socket.onUserOnline(handleUserOnline);
        socket.onUserOffline(handleUserOffline);

        const timers = typingTimers.current;
        return () => {
            socket.offReceiveMessage(handleReceiveMessage);
            socket.offUserTyping(handleUserTyping);
            socket.offMessagesRead(handleMessagesRead);
            socket.offUserOnline(handleUserOnline);
            socket.offUserOffline(handleUserOffline);
            
            // Clear all typing timers on cleanup
            Object.values(timers).forEach(clearTimeout);
        };
    }, [socket, refetch, queryClient, user?._id]);

    const handleDeleteConversation = async () => {
        if (!deleteModalConfig?.conversationId) return;
        try {
            setIsDeleting(true);
            await messagesAPI.deleteConversation(deleteModalConfig.conversationId);
            refetch();
        } catch (error) {
            console.error('Failed to delete conversation:', error);
            alert('Failed to delete conversation');
        } finally {
            setIsDeleting(false);
            setDeleteModalConfig(null);
        }
    };

    const getConversationDisplayName = (conv: Conversation) => {
        if (conv.type === 'group') return conv.name || 'Group';
        if (conv.partner) {
            const p = conv.partner;
            return (typeof p === 'object') 
                ? (p.fullName || p.username || p._id || 'Unknown User')
                : (p || 'Unknown User');
        }
        return 'Unknown User';
    };

    const formatTime = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Now';
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays < 7) return `${diffDays}d`;
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const filteredConversations = useMemo(() => {
        if (!searchQuery.trim()) return conversations;
        return conversations.filter((conv: Conversation) => {
            const name = getConversationDisplayName(conv).toLowerCase();
            const username = conv.partner?.username?.toLowerCase() || '';
            return name.includes(searchQuery.toLowerCase()) || username.includes(searchQuery.toLowerCase());
        });
    }, [conversations, searchQuery]);

    // Search for new users if searchQuery exists but not in local conversations
    const { data: globalSearchResults } = useQuery({
        queryKey: ['global-user-search', searchQuery],
        queryFn: () => usersAPI.searchUsers(searchQuery),
        enabled: searchQuery.length >= 2,
    });

    const isUserOnline = (userId?: string) => {
        if (!userId) return false;
        return onlineUsers.has(userId);
    };

    return (
        <div className="messages-list-container">
            <div className="messages-list-header">
                <div className="user-profile-brief">
                    <Avatar
                        src={user?.profilePicture}
                        name={user?.fullName || ''}
                        alt={user?.fullName || ''}
                        size={40}
                    />
                    <div className="user-text">
                        <span className="my-username">{user?.username}</span>
                        <span className="online-label">Online</span>
                    </div>
                </div>
                <div className="header-actions">
                    <button
                        className="new-message-btn"
                        onClick={() => navigate('/messages/new')}
                        title="New Message"
                    >
                        <FaEdit />
                    </button>
                    <button
                        className="new-message-btn group-btn"
                        onClick={() => setShowCreateGroup(true)}
                        title="Create Group"
                    >
                        <FaUsers />
                    </button>
                </div>
            </div>

            <div className="messages-search-bar">
                <div className="search-input-wrapper">
                    <FaSearch className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search or start new chat..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                </div>
            </div>

            {showCreateGroup && (
                <CreateGroupModal onClose={() => setShowCreateGroup(false)} />
            )}

            <div className="conversations-scroll-area">
                {isLoading ? (
                    <div className="messages-list-loading">
                        <p>Loading chats...</p>
                    </div>
                ) : error ? (
                    <div className="messages-list-error">
                        <p>Failed to load conversations</p>
                        <button onClick={() => refetch()}>Retry</button>
                    </div>
                ) : (
                    <>
                        {filteredConversations.length === 0 && !searchQuery && (
                            <div className="no-conversations-placeholder">
                                <p>No messages yet</p>
                                <button onClick={() => navigate('/messages/new')}>Send Message</button>
                            </div>
                        )}

                        {filteredConversations.map((conversation: Conversation) => {
                            const isGroup = conversation.type === 'group';
                            const partner = conversation.partner;
                            const partnerId = partner?._id;
                            const partnerUsername = partner?.username;

                            // Robust active check
                            const isActive = activeId === conversation._id ||
                                (partnerId && activeId === partnerId) ||
                                (partnerUsername && activeId === partnerUsername);

                            const currentlyTyping = typingUsers[conversation._id];
                            const isUnread = conversation.unreadCount > 0;

                            return (
                                <div
                                    key={conversation._id}
                                    className={`conversation-row ${isActive ? 'active' : ''} ${isUnread ? 'unread' : ''}`}
                                    onClick={() => {
                                        if (isGroup) {
                                            navigate(`/messages/group/${conversation._id}`);
                                        } else {
                                            // Prioritize username for better URL and profile fetching on ChatPage
                                            const identifier = partnerUsername || partnerId;
                                            if (identifier) {
                                                navigate(`/messages/${identifier}`);
                                            } else {
                                                navigate(`/messages/conversation/${conversation._id}`);
                                            }
                                        }
                                    }}
                                >
                                    <div className="avatar-wrapper">
                                        <Avatar
                                            src={isGroup ? conversation.avatar : conversation.partner?.profilePicture}
                                            alt={getConversationDisplayName(conversation)}
                                            name={getConversationDisplayName(conversation)}
                                            size="100%"
                                        />
                                        {!isGroup && isUserOnline(partnerId) && (
                                            <span className="online-indicator" />
                                        )}
                                    </div>

                                    <div className="conversation-details">
                                        <div className="conversation-title">
                                            <span>{getConversationDisplayName(conversation)}</span>
                                            {conversation.latestMessage && (
                                                <span className="time-stamp">
                                                    {formatTime(conversation.latestMessage.createdAt)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="message-preview-row">
                                            <span className="preview-text">
                                                {currentlyTyping ? (
                                                    <span className="typing-text">typing...</span>
                                                ) : (
                                                    <>
                                                        {conversation.latestMessage?.sender?._id === user?._id ? (
                                                            <span className="sender-name">You: </span>
                                                        ) : (
                                                            isGroup && conversation.latestMessage?.sender ? (
                                                                <span className="sender-name">{conversation.latestMessage.sender.fullName?.split(' ')[0] || conversation.latestMessage.sender.username}: </span>
                                                            ) : null
                                                        )}
                                                        {conversation.latestMessage
                                                            ? (conversation.latestMessage.messageType === 'image'
                                                                ? '📷 Photo'
                                                                : conversation.latestMessage.messageType === 'video'
                                                                    ? '🎥 Video'
                                                                    : (conversation.latestMessage.messageType === 'audio'
                                                                        ? '🎤 Voice Message'
                                                                        : conversation.latestMessage.content.length > 35
                                                                            ? conversation.latestMessage.content.substring(0, 35) + '...'
                                                                            : conversation.latestMessage.content))
                                                            : 'Start a conversation'}
                                                    </>
                                                )}
                                            </span>
                                            {isUnread && <span className="unread-dot" />}
                                            {!isUnread && conversation.latestMessage && conversation.latestMessage.sender._id === user?._id && (
                                                <span className="delivery-status">
                                                    {conversation.latestMessage.isRead ? <BsCheck2All size={16} color="#3897f0" /> : <BsCheck2 size={16} />}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="conversation-actions-hover" onClick={(e) => { e.stopPropagation(); setDeleteModalConfig({ isOpen: true, conversationId: conversation._id }); }}>
                                        <IoTrashOutline size={18} />
                                    </div>
                                </div>
                            );
                        })}

                        {/* Global Search Results - When searching for new users */}
                        {searchQuery.length >= 2 && globalSearchResults?.data && globalSearchResults.data.users?.length > 0 && (
                            <div className="global-search-results">
                                <div className="section-divider">Non-contacts</div>
                                {globalSearchResults.data.users
                                    .filter((u: any) => !conversations.some(c => c.partner?._id === u._id))
                                    .map((targetUser: any) => (
                                        <div
                                            key={targetUser._id}
                                            className="conversation-row"
                                            // FIX 4: Navigate by username (not _id) so ChatPage can fetch profile correctly
                                            onClick={() => navigate(`/messages/${targetUser.username || targetUser._id}`)}
                                        >
                                            <div className="avatar-wrapper">
                                                <Avatar
                                                    src={targetUser.profilePicture}
                                                    name={targetUser.fullName}
                                                    alt={targetUser.fullName}
                                                    size="100%"
                                                />
                                            </div>
                                            <div className="conversation-details">
                                                <div className="conversation-title">
                                                    <span>{targetUser.fullName}</span>
                                                </div>
                                                <div className="message-preview-row">
                                                    <span className="preview-text">@{targetUser.username}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            <DeleteConfirmationModal
                isOpen={deleteModalConfig?.isOpen || false}
                onClose={() => setDeleteModalConfig(null)}
                onConfirm={handleDeleteConversation}
                title="Delete Conversation"
                message="Are you sure you want to delete this conversation? This will hide it from your inbox but won't delete it for other participants."
                isPending={isDeleting}
            />
        </div>
    );
};

export default ConversationsList;
