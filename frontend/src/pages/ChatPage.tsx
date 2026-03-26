import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaArrowLeft, FaPaperPlane, FaImage, FaTimes, FaVideo, FaLock, FaSearch } from 'react-icons/fa';
import { BsEmojiSmile, BsInfoCircle, BsCheck2, BsCheck2All, BsFileEarmarkText, BsPaperclip } from 'react-icons/bs';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { messagesAPI, usersAPI, api } from '../services/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import ConversationsList from '../components/ConversationsList';
import MessageActions from '../components/MessageActions';
import Avatar from '../components/Avatar';
import GroupInfoModal from '../components/GroupInfoModal';
import MessageSearch from '../components/MessageSearch';
import { messageCache } from '../utils/localCache';
import { generateKeyPair, encryptContent, decryptContent, deriveSharedSecret } from '../utils/encryptionUtils';
import './ChatPage.css';

interface Message {
  _id: string;
  sender: {
    _id: string;
    username: string;
    fullName: string;
    profilePicture?: string;
    isVerified: boolean;
  };
  content: string;
  messageType: string;
  createdAt: string;
  isRead: boolean;
  readAt?: string;
  reactions: Array<{
    user: {
      _id: string;
      username: string;
      fullName: string;
      profilePicture?: string;
    };
    emoji: string;
    reactedAt: string;
  }>;
  replyTo?: {
    _id: string;
    content: string;
    sender: {
      _id: string;
      username: string;
      fullName: string;
    };
  };
  clientId?: string;
  status?: 'sending' | 'sent' | 'failed';
  isDelivered?: boolean;
  isEncrypted?: boolean;
  iv?: string;
  isDeleted?: boolean;
}

interface Conversation {
  _id: string;
  type: 'direct' | 'group';
  participants: Array<{
    user: {
      _id: string;
      username: string;
      fullName: string;
      profilePicture?: string;
      isVerified: boolean;
      lastActive?: string;
    };
    role: 'admin' | 'member';
    isActive: boolean;
  }>;
  name?: string;
  avatar?: string;
}

const DecryptedText: React.FC<{ message: Message, currentUser: any, conversation: any }> = ({ message, currentUser, conversation }) => {
  const [decrypted, setDecrypted] = React.useState<string | null>(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    const decrypt = async () => {
      if (message.isEncrypted && message.iv) {
        try {
          const partner = conversation?.participants?.find((p: any) => {
            const pId = typeof p.user === 'string' ? p.user : p.user?._id;
            return pId !== currentUser?._id;
          })?.user;

          if (!partner?.encryption?.publicKey) {
            setError(true);
            return;
          }
          const storedKeys = JSON.parse(localStorage.getItem(`e2ee_keys_${currentUser?._id}`) || '{}');
          if (!storedKeys.privateKey) {
            setError(true);
            return;
          }
          const sharedSecret = await deriveSharedSecret(storedKeys.privateKey, partner.encryption.publicKey);
          const text = await decryptContent(message.content, message.iv, sharedSecret);
          setDecrypted(text);
        } catch (err) {
          console.error('Decryption error:', err);
          setError(true);
        }
      }
    };
    decrypt();
  }, [message, currentUser, conversation]);

  if (error) return <span className="encrypted-status failed"><FaLock className="lock-icon" /> Encrypted</span>;
  if (message.isEncrypted && !decrypted) return <span className="encrypted-status decrypting">🔒 Decrypting...</span>;
  return <span>{decrypted || message.content}</span>;
};

const ChatPage: React.FC = () => {
  const { userId, conversationId, groupId } = useParams<{ userId?: string; conversationId?: string; groupId?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const socket = useSocket();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string, text: string, name: string } | null>(null);
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const [cachedMessages, setCachedMessages] = useState<Message[]>([]);
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const isDirectMessage = !!userId && userId !== 'new';
  const isNewMessage = userId === 'new';
  const effectiveConversationId = conversationId || groupId;
  const currentConversationId = effectiveConversationId || (isDirectMessage ? `direct_${[user?._id, userId].sort().join('_')}` : '');

  useEffect(() => {
    let delayDebounceFn: NodeJS.Timeout | undefined;
    if (isNewMessage && recipientSearch.trim().length >= 2) {
      delayDebounceFn = setTimeout(async () => {
        setIsSearching(true);
        try {
          const res = await usersAPI.searchUsers(recipientSearch);
          setSearchResults(res.data.users || []);
        } catch (err) {
          console.error('Error searching recipients:', err);
        } finally {
          setIsSearching(false);
        }
      }, 300);
    } else {
      setSearchResults([]);
    }

    return () => {
      if (delayDebounceFn) clearTimeout(delayDebounceFn);
    };
  }, [recipientSearch, isNewMessage]);

  const { data: targetUserProfileData } = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: () => usersAPI.getProfile(userId!),
    enabled: !!userId && userId !== 'new',
  });

  const targetUser = (targetUserProfileData as any)?.data?.user || (targetUserProfileData as any)?.user || (targetUserProfileData as any)?.data || targetUserProfileData;
  const targetUserId = targetUser?._id || userId;

  const { data: conversationData, isLoading: conversationLoading, error: conversationError } = useQuery({
    queryKey: ['conversation', currentConversationId, targetUserId],
    queryFn: () => isDirectMessage
      ? messagesAPI.getConversationByUserId(targetUserId!)
      : messagesAPI.getConversation(effectiveConversationId!),
    enabled: (!!effectiveConversationId || (isDirectMessage && !!targetUserId)) && userId !== 'new',
  });

  useEffect(() => {
    if (conversationError) {
      const err = conversationError as any;
      if (err.response?.status === 403) {
        toast.error('You do not have permission to access this conversation');
        navigate('/messages');
      } else if (err.response?.status === 404) {
        // expected for new conversations
        console.log('Conversation not found, will be created on first message');
      } else {
        console.error('Failed to load conversation:', conversationError);
      }
    }
  }, [conversationError, navigate]);

  const conversation: Conversation | undefined = useMemo(() => {
    const raw = (conversationData as any)?.data?.conversation || (conversationData as any)?.conversation || (conversationData as any)?.data;
    if (!raw) return undefined;

    let partner = raw.partner;
    const currentIdStr = String(user?._id || '');

    if (raw.type === 'direct') {
      const partnerIdStr = String(partner?._id || partner || '');
      if (!partner || partnerIdStr === currentIdStr) {
        const foundPartner = raw.participants?.find((p: any) => {
          const pId = String(typeof p.user === 'string' ? p.user : (p.user?._id || p.user || ''));
          return pId && pId !== currentIdStr;
        });
        if (foundPartner) {
          partner = typeof foundPartner.user === 'object' ? foundPartner.user : { _id: foundPartner.user };
        }
      }
    }

    return {
      ...raw,
      partner
    };
  }, [conversationData, user?._id]);

  const { data: messagesData, isLoading: messagesLoading, refetch: refetchMessages, error: messagesError } = useQuery({
    queryKey: ['messages', conversation?._id || (isDirectMessage ? targetUserId : effectiveConversationId)],
    queryFn: () => {
      if (conversation?._id) {
        return messagesAPI.getConversationMessages(conversation._id);
      }
      return isDirectMessage
        ? messagesAPI.getMessages(targetUserId!)
        : messagesAPI.getConversationMessages(effectiveConversationId!);
    },
    enabled: (!!conversation?._id || !!effectiveConversationId || (isDirectMessage && !!targetUserId)) && userId !== 'new',
  });

  useEffect(() => {
    if (messagesError) {
      const err = messagesError as any;
      if (err.response?.status === 403) {
        toast.error('Unable to load messages for this conversation');
      } else {
        console.error('Failed to load messages:', messagesError);
      }
    }
  }, [messagesError]);

  const messages: Message[] = useMemo(() => {
    const rawMessages = (messagesData as any)?.data?.messages || (messagesData as any)?.messages || (messagesData as any)?.data || [];
    const serverMessages = Array.isArray(rawMessages) ? rawMessages : [];

    const combined = [...cachedMessages, ...serverMessages, ...optimisticMessages];
    const uniqueMap = new Map();

    combined.forEach(m => {
      const key = m._id || m.clientId;
      if (!uniqueMap.has(key) || (m._id && !uniqueMap.get(key)._id)) {
        uniqueMap.set(key, m);
      }
    });

    const finalMessages = Array.from(uniqueMap.values()).sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    if (serverMessages.length > 0 && conversation?._id) {
      messageCache.saveMessages(serverMessages.map(m => ({
        ...m,
        conversationId: conversation._id
      })));
    }

    return finalMessages;
  }, [messagesData, optimisticMessages, cachedMessages, conversation?._id]);


  const sendMessageMutation = useMutation({
    mutationFn: (data: { content: string, replyTo?: string, clientId: string, iv?: string, isEncrypted?: boolean }) => {
      const payload: any = {
        content: data.content,
        messageType: 'text',
        replyTo: data.replyTo,
        clientId: data.clientId,
        iv: data.iv,
        isEncrypted: data.isEncrypted
      };

      if (conversation?._id) {
        payload.conversationId = conversation._id;
      } else if (isDirectMessage) {
        payload.recipientId = userId;
        payload.conversationId = currentConversationId;
      } else {
        payload.conversationId = currentConversationId;
      }

      return api.post('/messages', payload);
    },
    onSuccess: (response: any, variables) => {
      setMessageInput('');
      setReplyTo(null);
      setOptimisticMessages(prev => prev.filter(m => m.clientId !== variables.clientId));
      refetchMessages();
      queryClient.invalidateQueries({ queryKey: ['conversations'] });

      if (isNewMessage && response.data?.participantId) {
        navigate(`/messages/${response.data.participantId}`, { replace: true });
      } else if (isNewMessage && response.data?.conversationId) {
        navigate(`/messages/group/${response.data.conversationId}`, { replace: true });
      }
    },
    onError: (error: any, variables) => {
      setOptimisticMessages(prev => prev.map(m =>
        m.clientId === variables.clientId ? { ...m, status: 'failed' } : m
      ));
      toast.error(error.response?.data?.message || 'Failed to send message');
    },
  });

  useEffect(() => {
    if (conversation?._id) {
      messageCache.getMessages(conversation._id).then(msgs => {
        setCachedMessages(msgs as any);
      });
    }
  }, [conversation?._id]);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.sender._id !== user?._id && !lastMessage.isRead) {
      messagesAPI.markMessageAsRead(lastMessage._id).then(() => {
        queryClient.invalidateQueries({ queryKey: ['messages', isDirectMessage ? userId : effectiveConversationId] });
        if (conversation?._id) {
          queryClient.invalidateQueries({ queryKey: ['messages', conversation._id] });
        }
      }).catch(err => {
        console.error('Failed to mark message as read:', err);
      });
    }
  }, [messages, user?._id, currentConversationId, queryClient, isDirectMessage, userId, effectiveConversationId, conversation?._id]);

  useEffect(() => {
    const roomToJoin = conversation?._id || currentConversationId;
    if (socket?.isConnected && roomToJoin) {
      socket.joinConversation(roomToJoin);
    }

    return () => {
      if (socket?.isConnected && roomToJoin) {
        socket.leaveConversation(roomToJoin);
      }
    };
  }, [socket, currentConversationId, conversation?._id]);

  useEffect(() => {
    const markReadId = conversation?._id || (currentConversationId !== 'new' ? currentConversationId : null);
    if (markReadId) {
      const markAllRead = async () => {
        try {
          await messagesAPI.markAllMessagesAsRead(markReadId);
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        } catch (error) {
          console.error('Failed to mark all messages as read:', error);
        }
      };

      markAllRead();
    }
  }, [conversation?._id, currentConversationId, queryClient]);

  useEffect(() => {
    const handleReceiveMessage = (data: any) => {
      const msgConvId = data.conversation?._id || data.conversation;
      if (msgConvId === currentConversationId || (conversation?._id && msgConvId === conversation._id)) {
        refetchMessages();
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      }
    };

    const handleMessageEdited = (data: any) => {
      const msgConvId = data.conversationId?._id || data.conversationId;
      if (msgConvId === currentConversationId || (conversation?._id && msgConvId === conversation._id)) {
        // Update local cache or refetch
        queryClient.setQueryData(['messages', conversation?._id || (isDirectMessage ? targetUserId : effectiveConversationId)], (prev: any) => {
          if (!prev) return prev;
          const messages = (prev.data?.messages || prev.messages || prev.data || []);
          const updatedMessages = messages.map((m: any) =>
            m._id === data.messageId ? { ...m, ...data.messageData } : m
          );
          return { ...prev, messages: updatedMessages };
        });
      }
    };

    const handleMessageDeleted = (data: any) => {
      const msgConvId = data.conversationId?._id || data.conversationId;
      if (msgConvId === currentConversationId || (conversation?._id && msgConvId === conversation._id)) {
        queryClient.setQueryData(['messages', conversation?._id || (isDirectMessage ? targetUserId : effectiveConversationId)], (prev: any) => {
          if (!prev) return prev;
          const messages = (prev.data?.messages || prev.messages || prev.data || []);
          const updatedMessages = messages.map((m: any) =>
            m._id === data.messageId ? { ...m, isDeleted: true, content: 'This message was unsent' } : m
          );
          return { ...prev, messages: updatedMessages };
        });
      }
    };

    const handleReactionAdded = (data: any) => {
      const msgId = data.messageId;
      queryClient.setQueryData(['messages', conversation?._id || (isDirectMessage ? targetUserId : effectiveConversationId)], (prev: any) => {
        if (!prev) return prev;
        const messages = (prev.data?.messages || prev.messages || prev.data || []);
        const updatedMessages = messages.map((m: any) =>
          m._id === msgId ? { ...m, reactions: data.reaction } : m
        );
        return { ...prev, messages: updatedMessages };
      });
    };

    if (socket) {
      socket.onReceiveMessage(handleReceiveMessage);
      socket.onMessageEdited(handleMessageEdited);
      socket.onMessageDeleted(handleMessageDeleted);
      socket.onReactionAdded(handleReactionAdded);
    }

    return () => {
      if (socket) {
        socket.offReceiveMessage(handleReceiveMessage);
        socket.offMessageEdited(handleMessageEdited);
        socket.offMessageDeleted(handleMessageDeleted);
        socket.offReactionAdded(handleReactionAdded);
      }
    };
  }, [socket, currentConversationId, refetchMessages, queryClient, conversation?._id, isDirectMessage, targetUserId, effectiveConversationId]);

  useEffect(() => {
    const handleUserTyping = (data: any) => {
      const typingConvId = data.conversationId?._id || data.conversationId;
      if ((typingConvId === currentConversationId || (conversation?._id && typingConvId === conversation._id)) && data.userId !== user?._id) {
        setIsTyping(data.isTyping);
      }
    };

    if (socket) {
      socket.onUserTyping(handleUserTyping);
    }

    return () => {
      if (socket) {
        socket.offUserTyping(handleUserTyping);
      }
    };
  }, [socket, currentConversationId, user?._id, conversation?._id]);

  useEffect(() => {
    const setupKeys = async () => {
      if (!user) return;

      const storedKeys = localStorage.getItem(`e2ee_keys_${user._id}`);
      if (!storedKeys && !(user as any).encryption?.publicKey) {
        try {
          const keys = await generateKeyPair();
          localStorage.setItem(`e2ee_keys_${user._id}`, JSON.stringify(keys));
          await usersAPI.updateKeys({
            publicKey: keys.publicKey,
            privateKeyEncrypted: keys.privateKey
          });
          toast.success('Secure messaging enabled');
        } catch (err) {
          console.error('E2EE setup error:', err);
        }
      }
    };
    setupKeys();
  }, [user]);

  useEffect(() => {
    const handleUserOnline = (data: any) => {
      if (data.userId === userId) setIsPartnerOnline(true);
    };
    const handleUserOffline = (data: any) => {
      if (data.userId === userId) setIsPartnerOnline(false);
    };

    if (socket) {
      socket.onUserOnline(handleUserOnline);
      socket.onUserOffline(handleUserOffline);
    }
    return () => {
      if (socket) {
        socket.offUserOnline(handleUserOnline);
        socket.offUserOffline(handleUserOffline);
      }
    };
  }, [socket, userId]);

  const hasScrolledRef = useRef<string | null>(null);

  // Scroll to bottom effect
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (messages.length > 0 && messagesEndRef.current) {
      const chatKey = conversation?._id || currentConversationId;
      const isNewChat = hasScrolledRef.current !== chatKey;

      const scrollToBottom = () => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({
            behavior: isNewChat ? 'auto' : 'smooth',
            block: 'end'
          });
          if (isNewChat) {
            hasScrolledRef.current = chatKey;
          }
        }
      };

      // Small delay to ensure layout is ready
      timeoutId = setTimeout(scrollToBottom, 60);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [messages, userId, conversation?._id, currentConversationId]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !user) return;

    const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const originalContent = messageInput.trim();
    let payloadContent = originalContent;
    let iv: string | undefined;
    let isEncrypted = false;

    if (conversation?.type === 'direct') {
      const partner = (conversation as any).partner;
      if (partner && (partner as any).encryption?.publicKey) {
        const storedKeysStr = localStorage.getItem(`e2ee_keys_${user._id}`);
        if (storedKeysStr) {
          try {
            const storedKeys = JSON.parse(storedKeysStr);
            if (storedKeys.privateKey) {
              const sharedSecret = await deriveSharedSecret(storedKeys.privateKey, (partner as any).encryption.publicKey);
              const encrypted = await encryptContent(originalContent, sharedSecret);
              payloadContent = encrypted.ciphertext;
              iv = encrypted.iv;
              isEncrypted = true;
            }
          } catch (e) {
            console.error('Encryption failed:', e);
          }
        }
      }
    }

    const optimisticMsg: Message = {
      _id: '',
      clientId,
      content: originalContent,
      messageType: 'text',
      sender: {
        _id: user._id,
        username: user.username,
        fullName: user.fullName,
        isVerified: !!user.isVerified,
        profilePicture: user.profilePicture
      },
      createdAt: new Date().toISOString(),
      isRead: false,
      reactions: [],
      status: 'sending',
      replyTo: replyTo ? {
        _id: replyTo.id,
        content: replyTo.text,
        sender: {
          _id: '',
          username: '',
          fullName: replyTo.name
        }
      } : undefined
    };

    setOptimisticMessages(prev => [...prev, optimisticMsg]);
    setMessageInput('');
    setReplyTo(null);

    sendMessageMutation.mutate({
      content: payloadContent,
      replyTo: replyTo?.id,
      clientId,
      iv,
      isEncrypted
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageInput(e.target.value);

    if (socket.isConnected && currentConversationId) {
      socket.startTyping(currentConversationId);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        socket.stopTyping(currentConversationId);
      }, 2000);
    }
  };

  const handleReply = (id: string, text: string, name: string) => {
    setReplyTo({ id, text, name });
    inputRef.current?.focus();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getChatTitle = () => {
    if (isNewMessage) return 'New Message';

    // 1. Try targetUser from explicit profile fetch
    if (targetUser && (targetUser.fullName || targetUser.username)) {
      return targetUser.fullName || targetUser.username;
    }

    // 2. Try conversation partner info
    if (conversation) {
      const partner = (conversation as any).partner;
      if (partner?.fullName || partner?.username) {
        return partner.fullName || partner.username;
      }

      // 3. Try participants list
      const otherParticipant = conversation.participants?.find((p: any) => {
        const pId = typeof p.user === 'string' ? p.user : (p.user?._id || p.user);
        return String(pId) !== String(user?._id);
      });

      if (otherParticipant?.user && typeof otherParticipant.user === 'object') {
        if (otherParticipant.user.fullName || otherParticipant.user.username) {
          return otherParticipant.user.fullName || otherParticipant.user.username;
        }
      }

      if (conversation.name) return conversation.name;
    }

    // 4. Try to find other user's name from existing messages
    if (messages && messages.length > 0) {
      const otherSender = messages.find(m => m.sender?._id !== user?._id)?.sender;
      if (otherSender && (otherSender.fullName || otherSender.username)) {
        return otherSender.fullName || otherSender.username;
      }
    }

    // 5. Fallback while loading
    if (conversationLoading || messagesLoading) return 'Loading...';

    // 6. Fallback to userId from URL if available
    if (userId && userId !== 'new') return userId;

    return 'Chat';
  };

  const getChatAvatar = () => {
    if (isNewMessage) return '/default-profile.svg';

    // 1. Try targetUser profile picture
    if (targetUser?.profilePicture) {
      return targetUser.profilePicture;
    }

    // 2. Try conversation partner or participant info
    if (conversation) {
      const partner = (conversation as any).partner;
      if (partner?.profilePicture) return partner.profilePicture;

      const otherParticipant = conversation.participants?.find((p: any) => {
        const pId = typeof p.user === 'string' ? p.user : (p.user?._id || p.user);
        return String(pId) !== String(user?._id);
      });

      if (otherParticipant?.user?.profilePicture) {
        return otherParticipant.user.profilePicture;
      }

      if (conversation.avatar) return conversation.avatar;
    }

    // 3. Try messages for sender avatar
    if (messages && messages.length > 0) {
      const otherSenderAvatar = messages.find(m => m.sender?._id !== user?._id)?.sender?.profilePicture;
      if (otherSenderAvatar) return otherSenderAvatar;
    }

    return '/default-profile.svg';
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' = 'image') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('conversationId', currentConversationId);
    formData.append('messageType', type);

    toast.promise(
      api.post('/messages', formData),
      {
        loading: `Uploading ${type}...`,
        success: `${type.charAt(0).toUpperCase() + type.slice(1)} sent!`,
        error: `Failed to upload ${type}`,
      }
    ).then(() => {
      refetchMessages();
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.body.addEventListener('mousedown', handleClickOutside);
    return () => document.body.removeEventListener('mousedown', handleClickOutside);
  }, []);


  const onEmojiClick = (emojiData: any) => {
    setMessageInput(prev => prev + emojiData.emoji);
    // setShowEmojiPicker(false); // Keep it open for multiple emojis
  };

  const isMobile = window.innerWidth < 768;

  if (!isNewMessage && (conversationLoading || messagesLoading)) {
    return (
      <div className="chat-loading-page">
        <div className="loading-bg">
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
        </div>
        <div className="chat-loading-container">
          <div className="spinner-glow"></div>
          <div className="loading-skeleton-header"></div>
          <div className="loading-skeleton-messages">
            <div className="skeleton-msg short"></div>
            <div className="skeleton-msg long"></div>
            <div className="skeleton-msg medium"></div>
          </div>
          <p>Encrypting your connection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-page-wrapper">
      <div className="chat-background-decorative">
        <div className="gradient-blob blob-top"></div>
        <div className="gradient-blob blob-bottom"></div>
        <div className="mesh-grid"></div>
      </div>

      <input
        type="file"
        id="image-upload"
        hidden
        accept="image/*"
        onChange={(e) => handleFileUpload(e, 'image')}
      />
      <input
        type="file"
        id="video-upload"
        hidden
        onChange={(e) => handleFileUpload(e, 'video')}
      />
      <input
        type="file"
        id="file-upload"
        hidden
        accept="*"
        onChange={(e) => handleFileUpload(e, 'file' as 'image' | 'video')}
      />

      {!isMobile && (
        <div className="messages-sidebar-wrapper">
          <ConversationsList />
        </div>
      )}

      <div className="chat-content-area">
        <div className="chat-header">
          <button className="back-button" onClick={() => navigate('/messages')}>
            <FaArrowLeft />
          </button>

          {isNewMessage ? (
            <div className="new-message-header">
              <span className="to-label">To:</span>
              <input
                type="text"
                className="recipient-search-input"
                placeholder="Type a name or username..."
                value={recipientSearch}
                onChange={(e) => setRecipientSearch(e.target.value)}
                autoFocus
              />
            </div>
          ) : (
            <div className={`chat-profile ${conversation?.type === 'group' ? 'is-group' : ''}`} onClick={() => conversation?.type === 'group' && setShowGroupInfo(true)}>
              <Avatar
                src={getChatAvatar()}
                alt={getChatTitle()}
                name={getChatTitle()}
                size={48}
                className="chat-avatar"
              />
              <div className="chat-details">
                <div className="title-row">
                  <h2>{getChatTitle()}</h2>
                  {conversation?.type === 'direct' && (
                    <span className={`status-dot ${isPartnerOnline ? 'online' : 'offline'}`} />
                  )}
                </div>
                {(conversation?.type === 'direct' || conversation?.participants?.length === 2 || isDirectMessage) ? (
                  <span className={isPartnerOnline ? "online-status-text" : "offline-status-text"}>
                    {isPartnerOnline ? 'Active now' : 'Offline'}
                  </span>
                ) : (
                  <span className="member-count">{conversation?.participants?.length || 0} members</span>
                )}
              </div>
            </div>
          )}

          {!isNewMessage && (
            <button
              className="header-icon-btn"
              onClick={() => setShowSearch(true)}
              title="Search Messages"
            >
              <FaSearch size={20} />
            </button>
          )}
          {!isNewMessage && conversation?.type === 'group' && (
            <button
              className="info-button"
              onClick={() => setShowGroupInfo(true)}
              title="Group Info"
            >
              <BsInfoCircle size={24} />
            </button>
          )}
        </div>

        {showSearch && (conversation?._id || currentConversationId) && (
          <MessageSearch
            conversationId={conversation?._id || currentConversationId}
            isOpen={showSearch}
            onClose={() => setShowSearch(false)}
            onMessageSelect={(msgId) => {
              setHighlightedMessageId(msgId);
              setShowSearch(false);
              const element = document.getElementById(`message-${msgId}`);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('highlight-animation');
                setTimeout(() => element.classList.remove('highlight-animation'), 3000);
              }
            }}
          />
        )}

        {showGroupInfo && conversation && (
          <GroupInfoModal
            conversation={conversation as any}
            onClose={() => setShowGroupInfo(false)}
          />
        )}

        <div className="messages-container">
          <div className="messages-list">
            {isNewMessage && (
              <div className="new-message-search-results">
                {isSearching ? (
                  <div className="search-loading">Searching users...</div>
                ) : searchResults.length > 0 ? (
                  searchResults.map(targetUser => (
                    <div
                      key={targetUser._id}
                      className="recipient-result-row"
                      onClick={() => navigate(`/messages/${targetUser._id}`, { replace: true })}
                    >
                      <Avatar
                        src={targetUser.profilePicture}
                        alt={targetUser.fullName}
                        name={targetUser.fullName}
                        size={40}
                      />
                      <div className="recipient-info">
                        <span className="recipient-name">{targetUser.fullName}</span>
                        <span className="recipient-username">@{targetUser.username}</span>
                      </div>
                    </div>
                  ))
                ) : recipientSearch.trim().length > 0 ? (
                  <div className="no-results">No users found for "{recipientSearch}"</div>
                ) : (
                  <div className="new-message-placeholder">
                    <div className="placeholder-content">
                      <div className="placeholder-icon"><FaPaperPlane /></div>
                      <h3>New Conversation</h3>
                      <p>Search for a friend to start chatting.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            {messages.length === 0 && !isNewMessage && !messagesLoading && (
              <div className="no-messages-prompt">
                <div className="prompt-icon"><FaPaperPlane /></div>
                <h3>Start a Conversation</h3>
                <p>No messages here yet. Be the first to say hello!</p>
              </div>
            )}
            {messages.map((message, index) => {
              const currentDate = new Date(message.createdAt).toDateString();
              const prevDate = index > 0 ? new Date(messages[index - 1].createdAt).toDateString() : null;
              const showDivider = currentDate !== prevDate;
              const isOwn = message.sender?._id === user?._id;
              const prevMessage = index > 0 ? messages[index - 1] : null;
              const isSameSenderAsPrev = prevMessage && prevMessage.sender?._id === message.sender?._id && !showDivider;
              const showAvatar = !isOwn && !isSameSenderAsPrev;
              const isFirstInGroup = !isSameSenderAsPrev;

              return (
                <motion.div
                  key={message._id || message.clientId}
                  id={`message-${message._id}`}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  layout
                  className={`message-wrapper-outer ${message._id === highlightedMessageId ? 'highlighted' : ''}`}
                >
                  {showDivider && (
                    <div className="date-divider">
                      <span className="date-text">
                        {new Date(message.createdAt).toLocaleDateString([], {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: new Date(message.createdAt).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                        })}
                      </span>
                    </div>
                  )}
                  <div className={`message-item ${isOwn ? 'own' : 'other'} ${isFirstInGroup ? 'first-in-group' : 'consecutive'}`}>
                    {showAvatar ? (
                      <Avatar
                        src={message.sender.profilePicture}
                        alt={message.sender.fullName}
                        name={message.sender.fullName}
                        size={32}
                        className="message-avatar"
                      />
                    ) : (
                      !isOwn && <div className="avatar-placeholder" style={{ width: 32 }} />
                    )}
                    <div className="message-content">
                      {message.replyTo && (
                        <div className="reply-preview-bubble">
                          <span className="reply-name">{message.replyTo.sender.fullName}</span>
                          <p className="reply-content">{message.replyTo.content?.substring(0, 50)}</p>
                        </div>
                      )}
                      <div className="message-bubble-wrapper">
                        <div className={`message-bubble ${['image', 'video', 'shared_post', 'shared_reel'].includes(message.messageType) ? 'has-media' : ''}`}>
                          {message.messageType === 'shared_post' && (
                            <div className="shared-content-preview">
                              <div className="shared-content-header">
                                <span className="shared-label">Shared Post</span>
                              </div>
                              <div className="shared-content-body">
                                {message.content && <p className="shared-caption">{message.content}</p>}
                                <div className="shared-media-placeholder">
                                  <FaImage />
                                </div>
                              </div>
                            </div>
                          )}

                          {message.messageType === 'shared_reel' && (
                            <div className="shared-content-preview reel">
                              <div className="shared-content-header">
                                <span className="shared-label">Shared Reel</span>
                              </div>
                              <div className="shared-reel-media">
                                <video src={message.content} muted />
                                <div className="reel-overlay">
                                  <FaPaperPlane />
                                </div>
                              </div>
                            </div>
                          )}

                          {message.messageType === 'image' && (
                            <img src={message.content} alt="shared" className="shared-image" />
                          )}


                          {message.messageType === 'video' && (
                            <div className="video-message-container">
                              <video controls src={message.content} className="video-player" />
                            </div>
                          )}

                          {message.messageType === 'file' && (
                            <div className="file-message-container">
                              <a href={message.content} target="_blank" rel="noreferrer" className="file-download-link">
                                <BsFileEarmarkText className="file-icon" />
                                <span>Download File</span>
                              </a>
                            </div>
                          )}

                          {message.messageType === 'text' && (
                            <p className={message.isDeleted ? 'deleted-message-text' : ''}>
                              {message.isDeleted ? (
                                <span className="italic-muted">This message was unsent</span>
                              ) : message.isEncrypted ? (
                                <DecryptedText message={message} currentUser={user} conversation={conversation} />
                              ) : (
                                message.content.split(/(@\w+)/g).map((part, i) =>
                                  part.startsWith('@') ? <span key={i} style={{ color: '#34B7F1', fontWeight: 600 }}>{part}</span> : part
                                )
                              )}
                            </p>
                          )}

                          <div className="message-meta">
                            <span className="message-time">{formatTime(message.createdAt)}</span>
                            {isOwn && message.status === 'sent' && (
                              <span className="message-status">
                                {message.isRead ? <BsCheck2All size={14} className="read-tick" color="#34B7F1" /> : message.isDelivered ? <BsCheck2All size={14} /> : <BsCheck2 size={14} />}
                              </span>
                            )}
                          </div>
                        </div>

                        {!message.isDeleted && (
                          <MessageActions
                            messageId={message._id}
                            clientId={message.clientId}
                            content={message.content}
                            isOwnMessage={isOwn}
                            status={message.status}
                            onReply={handleReply}
                            onRetry={() => {
                              if (message.clientId) {
                                setOptimisticMessages(prev => prev.map(m =>
                                  m.clientId === message.clientId ? { ...m, status: 'sending' } : m
                                ));
                                sendMessageMutation.mutate({
                                  content: message.content,
                                  replyTo: message.replyTo?._id,
                                  clientId: message.clientId
                                });
                              }
                            }}
                            senderName={message.sender.fullName}
                            partnerPublicKey={conversation?.type === 'direct' ? (conversation as any).partner?.encryption?.publicKey : undefined}
                            conversationType={conversation?.type}
                          />
                        )}
                      </div>

                      {message.reactions.length > 0 && (
                        <div className="message-reactions">
                          {message.reactions.map((r, i) => (
                            <span key={i} className="reaction-badge" title={r.user?.fullName}>{r.emoji}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
            {isTyping && (
              <div className="typing-indicator-wrapper">
                <div className="typing-indicator-dots">
                  <span></span><span></span><span></span>
                </div>
                <span className="typing-text">{getChatTitle()} is typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {!isNewMessage && (
          <div className="message-input-area">
            {replyTo && (
              <div className="active-reply-preview">
                <div className="reply-info">
                  <span className="replying-to">Replying to {replyTo.name}</span>
                  <p className="reply-content">{replyTo.text.substring(0, 80)}...</p>
                </div>
                <button className="cancel-reply" onClick={() => setReplyTo(null)}>
                  <FaTimes />
                </button>
              </div>
            )}

            <div className="input-row">
              <div className="emoji-picker-wrapper" ref={emojiPickerRef}>
                <button
                  className="icon-btn"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  type="button"
                >
                  <BsEmojiSmile />
                </button>
                {showEmojiPicker && (
                  <div className="emoji-picker-container">
                    <EmojiPicker
                      onEmojiClick={onEmojiClick}
                      theme={Theme.DARK}
                      lazyLoadEmojis={true}
                    />
                  </div>
                )}
              </div>

              <textarea
                ref={inputRef}
                value={messageInput}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Type message..."
                rows={1}
                onFocus={() => setShowEmojiPicker(false)}
              />

              {!messageInput.trim() && (
                <div className="input-extras">
                  <label htmlFor="image-upload" className="icon-btn" title="Image"><FaImage /></label>
                  <label htmlFor="video-upload" className="icon-btn" title="Video"><FaVideo /></label>
                  <label htmlFor="file-upload" className="icon-btn" title="File"><BsPaperclip /></label>
                </div>
              )}

              {messageInput.trim() && (
                <button className="send-btn" onClick={handleSendMessage} type="button"><FaPaperPlane /></button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
