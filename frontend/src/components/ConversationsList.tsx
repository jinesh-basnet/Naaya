import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FaEdit, FaSearch } from 'react-icons/fa';
import { BsChevronDown } from 'react-icons/bs';
import { useAuth } from '../contexts/AuthContext';
import { messagesAPI, usersAPI } from '../services/api';
import Avatar from './Avatar';
import './ConversationsList.css';

interface User {
    _id: string;
    username: string;
    fullName: string;
    profilePicture?: string;
    isVerified: boolean;
    lastActive?: Date;
}

interface Conversation {
    _id?: string;
    type: 'direct' | 'group';
    name?: string;
    avatar?: string;
    participants: Array<{
        user: User;
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

const ConversationsList: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchQuery, setSearchQuery] = useState('');

    const activeId = location.pathname.split('/').pop();

    const {
        data: conversationsData,
        isLoading,
        error
    } = useQuery({
        queryKey: ['conversations'],
        queryFn: messagesAPI.getConversations,
        refetchInterval: 30000,
    });

    // Integrated Search
    const { data: searchData, isLoading: searching } = useQuery({
        queryKey: ['user-search', searchQuery],
        queryFn: () => usersAPI.searchUsers(searchQuery),
        enabled: searchQuery.length >= 1,
    });

    const conversations: Conversation[] = (conversationsData as any)?.conversations || [];
    const searchUsers: User[] = (searchData as any)?.data?.users || (searchData as any)?.users || [];

    const filteredConversations = conversations.filter(conv => {
        if (conv.type === 'direct' && conv.partner) {
            return conv.partner.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                conv.partner.username.toLowerCase().includes(searchQuery.toLowerCase());
        } else if (conv.type === 'group') {
            return conv.name?.toLowerCase().includes(searchQuery.toLowerCase());
        }
        return false;
    });

    // Users returned from search who don't have an existing conversation
    const newContactUsers = searchQuery.length >= 1 ? searchUsers.filter(u =>
        u._id !== user?._id && !conversations.some(c => c.type === 'direct' && c.partner?._id === u._id)
    ) : [];

    const handleConversationClick = (conversation: Conversation) => {
        if (conversation.type === 'direct' && conversation.partner) {
            navigate(`/messages/${conversation.partner._id}`);
        } else if (conversation.type === 'group') {
            navigate(`/messages/group/${conversation._id}`);
        }
    };

    const handleUserClick = (targetUser: User) => {
        navigate(`/messages/${targetUser._id}`);
        setSearchQuery('');
    };

    const getConversationDisplayName = (conversation: Conversation) => {
        if (conversation.type === 'direct' && conversation.partner) {
            return conversation.partner.fullName;
        } else if (conversation.type === 'group') {
            return conversation.name || 'Group Chat';
        }
        return 'Unknown';
    };

    const getConversationAvatar = (conversation: Conversation) => {
        if (conversation.type === 'direct' && conversation.partner) {
            return conversation.partner.profilePicture || '/default-profile.svg';
        } else if (conversation.type === 'group') {
            return conversation.avatar || '/default-group.png';
        }
        return '/default-profile.svg';
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

        if (diffInHours < 24) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffInHours < 168) {
            return date.toLocaleDateString([], { weekday: 'short' });
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    };

    if (isLoading) {
        return <div className="messages-list-loading">Loading conversations...</div>;
    }

    if (error) {
        return <div className="messages-list-error">Failed to load conversations.</div>;
    }

    return (
        <div className="messages-list-container">
            <div className="messages-list-header">
                <div className="user-profile-brief">
                    <Avatar
                        src={user?.profilePicture}
                        name={user?.fullName || ''}
                        alt={user?.fullName || ''}
                        size={40}
                        className="my-avatar"
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
                </div>
            </div>



            <div className="messages-search-bar">
                <div className={`search-input-wrapper ${searchQuery.length > 0 ? 'has-value' : ''}`}>
                    <FaSearch className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                </div>
            </div>

            <div className="conversations-scroll-area">
                {searchQuery.length > 0 && (
                    <div className="search-sections">
                        {filteredConversations.length > 0 && (
                            <div className="search-section">
                                <h4 className="section-title">Messages</h4>
                                {filteredConversations.map((conversation) => (
                                    <div
                                        key={conversation._id || conversation.partner?._id}
                                        className={`conversation-row ${(conversation.partner?._id === activeId) || (conversation._id === activeId) ? 'active' : ''}`}
                                        onClick={() => handleConversationClick(conversation)}
                                    >
                                        <div className="avatar-wrapper">
                                            <Avatar
                                                src={getConversationAvatar(conversation)}
                                                alt=""
                                                name={getConversationDisplayName(conversation)}
                                                className="conversation-avatar-img"
                                                size="100%"
                                            />
                                        </div>
                                        <div className="conversation-details">
                                            <span className="conversation-title">{getConversationDisplayName(conversation)}</span>
                                            <span className="preview-text">{conversation.latestMessage?.content || 'No messages'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {newContactUsers.length > 0 && (
                            <div className="search-section">
                                <h4 className="section-title">Users</h4>
                                {newContactUsers.map((targetUser) => (
                                    <div
                                        key={targetUser._id}
                                        className="conversation-row"
                                        onClick={() => handleUserClick(targetUser)}
                                    >
                                        <div className="avatar-wrapper">
                                            <Avatar
                                                src={targetUser.profilePicture}
                                                alt=""
                                                name={targetUser.fullName}
                                                className="conversation-avatar-img"
                                                size="100%"
                                            />
                                        </div>
                                        <div className="conversation-details">
                                            <span className="conversation-title">{targetUser.fullName}</span>
                                            <span className="preview-text">@{targetUser.username}</span>
                                        </div>
                                        {targetUser.isVerified && <span className="verified-badge">✓</span>}
                                    </div>
                                ))}
                            </div>
                        )}

                        {searching && <div className="searching-loader">Searching users...</div>}

                        {!searching && filteredConversations.length === 0 && newContactUsers.length === 0 && (
                            <div className="no-results">No results found for "{searchQuery}"</div>
                        )}
                    </div>
                )}

                {!searchQuery && (
                    <>
                        {conversations.length === 0 ? (
                            <div className="no-conversations-placeholder">
                                <p>No messages yet.</p>
                                <button onClick={() => navigate('/messages/new')}>Send a message</button>
                            </div>
                        ) : (
                            conversations.map((conversation) => {
                                const isActive = (conversation.partner?._id === activeId) || (conversation._id === activeId);
                                const isUnread = conversation.unreadCount > 0;

                                return (
                                    <div
                                        key={conversation._id || conversation.partner?._id}
                                        className={`conversation-row ${isActive ? 'active' : ''} ${isUnread ? 'unread' : ''}`}
                                        onClick={() => handleConversationClick(conversation)}
                                    >
                                        <div className="avatar-wrapper">
                                            <Avatar
                                                src={getConversationAvatar(conversation)}
                                                alt=""
                                                name={getConversationDisplayName(conversation)}
                                                className="conversation-avatar-img"
                                                size="100%"
                                            />
                                            {conversation.type === 'direct' && conversation.partner?.lastActive && (
                                                <span className="online-indicator" />
                                            )}
                                        </div>

                                        <div className="conversation-details">
                                            <span className="conversation-title">
                                                {getConversationDisplayName(conversation)}
                                                {conversation.unreadCount > 0 && <span className="unread-dot" />}
                                            </span>
                                            <div className="message-preview-row">
                                                <span className={`preview-text ${isUnread ? 'bold' : ''}`}>
                                                    {conversation.latestMessage?.sender._id === user?._id && 'You: '}
                                                    {conversation.latestMessage
                                                        ? (conversation.latestMessage.content.length > 30
                                                            ? conversation.latestMessage.content.substring(0, 30) + '...'
                                                            : conversation.latestMessage.content)
                                                        : 'Start a conversation'}
                                                </span>
                                                {conversation.latestMessage && (
                                                    <>
                                                        <span className="separator">•</span>
                                                        <span className="time-stamp">{formatTime(conversation.latestMessage.createdAt)}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default ConversationsList;
