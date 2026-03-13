import React, { useState, useEffect, useMemo } from 'react';
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
        sender: { _id: string };
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
            const response = await messagesAPI.getConversations();
            return response.data.conversations || response.data || [];
        },
        refetchInterval: 60000, // Background fallback
    });

    const conversations: Conversation[] = useMemo(() => {
        const raw = Array.isArray(conversationsData) ? conversationsData : [];
        const mapped = raw.map((conv: any) => {
            let partner = conv.partner;
            if (conv.type === 'direct' && !partner) {
                const partnerParticipant = conv.participants?.find((p: any) => {
                    const pId = typeof p.user === 'string' ? p.user : p.user?._id;
                    return pId !== user?._id;
                });

                if (partnerParticipant) {
                    partner = typeof partnerParticipant.user === 'object'
                        ? partnerParticipant.user
                        : { _id: partnerParticipant.user };
                }
            }
            return {
                ...conv,
                partner,
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

    // Socket listeners for real-time updates
    useEffect(() => {
        if (!socket) return;

        const handleReceiveMessage = () => {
            refetch();
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
        };

        const handleUserTyping = (data: any) => {
            if (data.userId !== user?._id) {
                setTypingUsers(prev => ({
                    ...prev,
                    [data.conversationId]: data.isTyping
                }));
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
        socket.onUserOnline(handleUserOnline);
        socket.onUserOffline(handleUserOffline);

        return () => {
            socket.offReceiveMessage(handleReceiveMessage);
            socket.offUserTyping(handleUserTyping);
            socket.offUserOnline(handleUserOnline);
            socket.offUserOffline(handleUserOffline);
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
            return conv.partner.fullName || conv.partner.username || conv.partner._id || 'Unknown User';
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
                                                        {conversation.latestMessage?.sender._id === user?._id && 'You: '}
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
                                            onClick={() => navigate(`/messages/${targetUser._id}`)}
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
