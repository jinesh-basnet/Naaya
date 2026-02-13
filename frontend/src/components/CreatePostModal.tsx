import React, { useState, useRef, useEffect } from 'react';
import { FaTimes, FaImages, FaMapMarkerAlt, FaUserPlus, FaPaperPlane, FaPlus, FaImage, FaVideo } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import './CreatePostModal.css';

interface CreatePostModalProps {
  open: boolean;
  onClose: () => void;
  onPost: (post: {
    postType: 'post' | 'reel';
    caption: string;
    media: File | null;
    tags: string[];
    location: string;
    editMode?: boolean;
    editPost?: {
      _id: string;
      content: string;
      media: Array<{
        type: string;
        url: string;
      }>;
      tags: string[];
      location: {
        name: string;
      };
    };
  }) => void;
  editMode?: boolean;
  editPost?: {
    _id: string;
    content: string;
    media: Array<{
      type: string;
      url: string;
    }>;
    tags: string[];
    location: {
      name: string;
    };
  };
}

const CreatePostModal: React.FC<CreatePostModalProps> = ({ open, onClose, onPost, editMode = false, editPost }) => {
  const [caption, setCaption] = useState('');
  const [media, setMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (editMode && editPost) {
      setCaption(editPost.content || '');
      setTags(editPost.tags || []);
      setLocation(editPost.location?.name || '');
      if (editPost.media && editPost.media.length > 0) {
        setMediaPreview(editPost.media[0].url);
      }
    }
  }, [editMode, editPost]);

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      if (videoRef.current) {
        try {
          videoRef.current.pause();
        } catch (error) {
        }
      }

      const file = e.target.files[0];
      setMedia(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        setMediaPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleDeleteTag = (tagToDelete: string) => {
    setTags(tags.filter(tag => tag !== tagToDelete));
  };

  const handlePost = () => {
    let determinedPostType: 'post' | 'reel' = 'post';
    if (media && media.type.startsWith('video/')) {
      determinedPostType = 'reel';
    } else if (!media && caption.trim() !== '') {
      determinedPostType = 'post';
    } else if (!media && caption.trim() === '') {
      return;
    } else {
      determinedPostType = 'post';
    }

    if (!media && caption.trim() !== '') {
      onPost({
        postType: determinedPostType,
        caption,
        media: null,
        tags,
        location,
        editMode,
        editPost,
      });
    } else {
      onPost({
        postType: determinedPostType,
        caption,
        media,
        tags,
        location,
        editMode,
        editPost,
      });
    }
    resetModal();
    onClose();
  };

  const resetModal = () => {
    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch (error) {
      }
    }
    setCaption('');
    setMedia(null);
    setMediaPreview('');
    setTags([]);
    setLocation('');
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>
            {editMode ? 'Edit ' : 'Create '}
            {media?.type.startsWith('video/') ? 'Reel' : 'Post'}
          </h2>
          <button className="icon-button" onClick={handleClose}>
            <FaTimes />
          </button>
        </header>

        <div className="modal-body">
          <div className="media-section">
            {!mediaPreview ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="empty-media-state"
              >
                <div className="icon-group">
                  <FaImage className="icon photo" />
                  <FaVideo className="icon video" />
                </div>
                <h3>Start your masterpiece</h3>
                <p>Drag and drop or click to upload photos and videos</p>
                <button className="select-button" onClick={() => fileInputRef.current?.click()}>
                  Upload from Device
                  <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    accept="image/*,video/*"
                    onChange={handleMediaChange}
                  />
                </button>
              </motion.div>
            ) : (
              <div className="media-preview">
                {media?.type.startsWith('video/') ? (
                  <video
                    ref={videoRef}
                    src={mediaPreview}
                    controls
                    muted
                    playsInline
                    onError={(e) => {
                      console.error('Video load error:', e);
                    }}
                  />
                ) : (
                  <img
                    src={mediaPreview}
                    alt="Preview"
                  />
                )}
                <button className="change-media" onClick={() => fileInputRef.current?.click()}>
                  Change Media
                  <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    accept="image/*,video/*"
                    onChange={handleMediaChange}
                  />
                </button>
              </div>
            )}
          </div>

          <div className="details-section">
            <div className="caption-input">
              <textarea
                className="caption-textarea"
                placeholder="Write a caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={2200}
                rows={3}
              />
              <div className="caption-count">{caption.length}/2200</div>
            </div>

            <motion.div
              className="input-group"
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <label>Location</label>
              <div className="input-with-icon">
                <FaMapMarkerAlt className="icon" />
                <input
                  type="text"
                  placeholder="Where was this taken?"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </motion.div>

            <motion.div
              className="input-group"
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <label>Collaborators</label>
              <div className="input-with-icon">
                <FaUserPlus className="icon" />
                <input
                  type="text"
                  placeholder="Who are you with?"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddTag(); }}
                />
              </div>
              <div className="tags-container">
                <AnimatePresence mode="popLayout">
                  {tags.map((tag) => (
                    <motion.span
                      key={tag}
                      className="tag"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      layout
                    >
                      {tag}
                      <span className="tag-delete" onClick={() => handleDeleteTag(tag)}>×</span>
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="button button-primary"
            onClick={handlePost}
            disabled={!media && caption.trim() === ''}
          >
            <FaPaperPlane />
            {editMode ? 'Update' : 'Share'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreatePostModal;
