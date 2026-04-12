import React, { useState } from 'react';
import { BsEmojiSmile } from 'react-icons/bs';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { messagesAPI } from '../services/api';
import toast from 'react-hot-toast';

interface MessageReactionsProps {
  messageId: string;
  reactions: Array<{
    user: {
      _id: string;
      username: string;
      fullName: string;
    };
    emoji: string;
    reactedAt: string;
  }>;
  currentUserId: string;
}

const MessageReactions: React.FC<MessageReactionsProps> = ({
  messageId,
  reactions,
  currentUserId
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const queryClient = useQueryClient();

  const addReactionMutation = useMutation({
    mutationFn: (emoji: string) => messagesAPI.addReaction(messageId, emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      setShowEmojiPicker(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add reaction');
    },
  });

  const removeReactionMutation = useMutation({
    mutationFn: (emoji: string) => messagesAPI.removeReaction(messageId, emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to remove reaction');
    },
  });

  const emojis = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '🔥', '👏', '🙏'];

  const handleEmojiClick = (emoji: string) => {
    const existingReaction = reactions.find(r => r.emoji === emoji && r.user._id === currentUserId);
    if (existingReaction) {
      removeReactionMutation.mutate(emoji);
    } else {
      addReactionMutation.mutate(emoji);
    }
  };

  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {} as Record<string, typeof reactions>);

  return (
    <div className="message-reactions">
      {Object.entries(groupedReactions).map(([emoji, reactionList]) => (
        <button
          key={emoji}
          className={`reaction-button ${reactionList.some(r => r.user._id === currentUserId) ? 'active' : ''}`}
          onClick={() => handleEmojiClick(emoji)}
          title={`${reactionList.map(r => r.user.fullName).join(', ')} reacted with ${emoji}`}
        >
          {emoji} {reactionList.length}
        </button>
      ))}

      <button
        className="add-reaction-button"
        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
        title="Add reaction"
      >
        <BsEmojiSmile />
      </button>

      {showEmojiPicker && (
        <div className="emoji-picker">
          {emojis.map(emoji => (
            <button
              key={emoji}
              className="emoji-option"
              onClick={() => handleEmojiClick(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MessageReactions;
