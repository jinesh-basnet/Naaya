import React, { useState, useRef, useEffect } from 'react';
import { FaTimes, FaMapMarkerAlt, FaUserPlus, FaPaperPlane, FaImage } from 'react-icons/fa';
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
    onPost({
      postType: 'post',
      caption,
      media,
      tags,
      location,
      editMode,
      editPost
    });
    setCaption('');
    setMedia(null);
    setMediaPreview('');
    setTags([]);
    setLocation('');
    onClose();
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        className="modal-content"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{editMode ? 'Edit Post' : 'Create Post'}</h2>
          <button className="icon-button" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="modal-body">
          <div className="media-section">
            {mediaPreview ? (
              <div className="media-preview">
                {media?.type?.startsWith('video') || mediaPreview.startsWith('data:video') ? (
                  <video ref={videoRef} src={mediaPreview} controls className="preview-video" />
                ) : (
                  <img src={mediaPreview} alt="Preview" className="preview-image" />
                )}
                <button className="change-media" onClick={() => { setMedia(null); setMediaPreview(''); }}>
                  <FaTimes /> Remove Media
                </button>
              </div>
            ) : (
              <div className="media-upload-area">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleMediaChange}
                  accept="image/*,video/*"
                  hidden
                />
                <FaImage className="icon photo" size={48} />
                <h3>Upload Media</h3>
                <p>Drag and drop or click to select a photo or video</p>
                <button className="select-button" onClick={() => fileInputRef.current?.click()}>
                  Select from computer
                </button>
              </div>
            )}
          </div>

          <div className="details-section">
            <div className="content-section">
              <textarea
                className="caption-textarea"
                placeholder="Write a caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={2200}
              />
              <div className="caption-count">{caption.length}/2200</div>
            </div>
            <div className="options-section">
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
      </motion.div>
    </div>
  );
};

export default CreatePostModal;
