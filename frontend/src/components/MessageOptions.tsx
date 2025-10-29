import React, { useState, useRef, useEffect } from 'react';
import { MdMoreVert } from 'react-icons/md';

interface Props {
  message: any;
  currentUserId: string | undefined;
  onEdit: (message: any) => void;
  onDelete: (messageId: string) => void;
  onReact: (message: any, emoji: string) => void;
}

const EMOJIS = ['❤️','👍','😂','😮','😢','🔥'];

const MessageOptions: React.FC<Props> = ({ message, currentUserId, onEdit, onDelete, onReact }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const canEdit = message.sender && (message.sender._id === currentUserId);
  const canDelete = canEdit;

  const userReaction = message.reactions && message.reactions.find((r: any) => r.user === currentUserId || (r.user && r.user._id === currentUserId));

  return (
    <div className="message-options" ref={ref}>
      <button className="more-btn small" onClick={() => setOpen(v => !v)} aria-label="Message options">
        <MdMoreVert />
      </button>
      {open && (
        <div className="options-menu">
          <div className="reactions-row">
            {EMOJIS.map(e => (
              <button key={e} className={`emoji-btn ${userReaction && userReaction.emoji === e ? 'selected' : ''}`} onClick={() => { onReact(message, e); setOpen(false); }} aria-label={`React ${e}`}>{e}</button>
            ))}
          </div>
          <div className="options-actions">
            {canEdit && <button className="option" onClick={() => { onEdit(message); setOpen(false); }}>Edit</button>}
            {canDelete && <button className="option" onClick={() => { onDelete(message._id); setOpen(false); }}>Delete</button>}
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageOptions;
