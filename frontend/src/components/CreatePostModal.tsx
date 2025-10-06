import React, { useState, useRef, useEffect } from 'react';
import { FaTimes, FaImages, FaMapMarkerAlt, FaUserPlus, FaPaperPlane } from 'react-icons/fa';
import { motion } from 'framer-motion';
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
        <div className="modal-header">
          <h2>{editMode ? 'Edit Post' : 'Create Post'}</h2>
          <button className="icon-button" onClick={handleClose}>
            <FaTimes />
          </button>
        </div>

        <div className="modal-body">
          <div className="media-section">
            {!mediaPreview ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <FaImages className="icon" />
                <h3>Select media</h3>
                <p>Share photos and videos with your community</p>
                <button className="select-button" onClick={() => fileInputRef.current?.click()}>
                  Select from computer
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

            <div className="input-group">
              <label>Add location</label>
              <div className="input-with-icon">
                <FaMapMarkerAlt className="icon" />
                <input
                  type="text"
                  placeholder="Add location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>

            <div className="input-group">
              <label>Tag people</label>
              <div className="input-with-icon">
                <FaUserPlus className="icon" />
                <input
                  type="text"
                  placeholder="Tag people"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddTag(); }}
                />
              </div>
              <div className="tags-container">
                {tags.map((tag) => (
                  <span key={tag} className="tag">
                    {tag}
                    <span className="tag-delete" onClick={() => handleDeleteTag(tag)}>×</span>
                  </span>
                ))}
              </div>
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
      </div>
    </div>
  );
};

export default CreatePostModal;
