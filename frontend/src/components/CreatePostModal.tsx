import React, { useState, useRef, useEffect } from 'react';
import { FaTimes, FaMapMarkerAlt, FaUserPlus, FaPaperPlane, FaImage } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import './CreatePostModal.css';

interface CreatePostModalProps {
  open: boolean;
  onClose: () => void;
  onPost: (post: {
    postType: 'post' | 'reel' | 'story';
    caption: string;
    media: File | null;
    language: 'nepali' | 'english' | 'mixed';
    visibility: 'public' | 'followers' | 'private';
    hashtags: string[];
    mentions: string[];
    tags: string[];
    location: string;
    editMode?: boolean;
    editPost?: {
      _id: string;
      content: string;
      language?: string;
      visibility?: string;
      postType?: string;
      hashtags?: string[];
      mentions?: string[];
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
    language?: string;
    visibility?: string;
    postType?: string;
    hashtags?: string[];
    mentions?: string[];
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
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [mentions, setMentions] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [language, setLanguage] = useState<'nepali' | 'english' | 'mixed'>('english');
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'private'>('public');
  const [postType, setPostType] = useState<'post' | 'reel' | 'story'>('post');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (editMode && editPost) {
      setCaption(editPost.content || '');
      setTags(editPost.tags || []);
      setLocation(editPost.location?.name || '');
      setLanguage(editPost.language as any || 'english');
      setVisibility(editPost.visibility as any || 'public');
      setPostType(editPost.postType as any || 'post');
      setHashtags(editPost.hashtags || []);
      setMentions(editPost.mentions || []);
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

  const parseTags = (input: string) => {
    const words = input.trim().split(' ');
    let newHashtags: string[] = [...hashtags];
    let newMentions: string[] = [...mentions];
    let newTags: string[] = [...tags];
    
    words.forEach(word => {
      const trimmed = word.replace(/[#,@]/g, '').trim().toLowerCase();
      if (trimmed && trimmed.length > 0) {
        if (word.startsWith('#') && !newHashtags.includes(`#${trimmed}`)) {
          newHashtags.push(`#${trimmed}`);
        } else if (word.startsWith('@') && !newMentions.includes(`@${trimmed}`)) {
          newMentions.push(`@${trimmed}`);
        } else if (!newTags.includes(trimmed)) {
          newTags.push(trimmed);
        }
      }
    });
    return { newHashtags, newMentions, newTags };
  };


  const handleAddTag = () => {
    if (tagInput.trim()) {
      const parsed = parseTags(tagInput);
      setHashtags(parsed.newHashtags);
      setMentions(parsed.newMentions);
      setTags(parsed.newTags);
      setTagInput('');
    }
  };

  const handleDeleteTag = (type: 'tag' | 'hashtag' | 'mention', item: string) => {
    if (type === 'hashtag') setHashtags(prev => prev.filter(t => t !== item));
    else if (type === 'mention') setMentions(prev => prev.filter(t => t !== item));
    else setTags(prev => prev.filter(t => t !== item));
  };

  const handlePost = () => {
    onPost({
      postType,
      caption,
      media,
      language,
      visibility,
      hashtags,
      mentions,
      tags,
      location,
      editMode,
      editPost
    });
    setCaption('');
    setMedia(null);
    setMediaPreview('');
    setTags([]);
    setHashtags([]);
    setMentions([]);
    setLocation('');
    setLanguage('english');
    setVisibility('public');
    setPostType('post');
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
                    placeholder="Who are you with? Use #hashtag @mention"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddTag(); }}
                  />
                </div>
                <div className="tags-container">
                  <div>Tags: <AnimatePresence mode="popLayout">
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
                        <span className="tag-delete" onClick={() => handleDeleteTag('tag', tag)}>×</span>
                      </motion.span>
                    ))}
                  </AnimatePresence></div>
                  <div>Hashtags: <AnimatePresence mode="popLayout">
                    {hashtags.map((tag) => (
                      <motion.span
                        key={tag}
                        className="tag hashtag"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        layout
                      >
                        {tag}
                        <span className="tag-delete" onClick={() => handleDeleteTag('hashtag', tag)}>×</span>
                      </motion.span>
                    ))}
                  </AnimatePresence></div>
                  <div>Mentions: <AnimatePresence mode="popLayout">
                    {mentions.map((tag) => (
                      <motion.span
                        key={tag}
                        className="tag mention"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        layout
                      >
                        {tag}
                        <span className="tag-delete" onClick={() => handleDeleteTag('mention', tag)}>×</span>
                      </motion.span>
                    ))}
                  </AnimatePresence></div>
                </div>
              </motion.div>

              {/* New fields */}
              <motion.div className="input-group" initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
                <label>Language</label>
                <select value={language} onChange={(e) => setLanguage(e.target.value as any)}>
                  <option value="english">English</option>
                  <option value="nepali">Nepali</option>
                  <option value="mixed">Mixed</option>
                </select>
              </motion.div>

              <motion.div className="input-group" initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
                <label>Post Type</label>
                <select value={postType} onChange={(e) => setPostType(e.target.value as any)}>
                  <option value="post">Post</option>
                  <option value="reel">Reel</option>
                  <option value="story">Story</option>
                </select>
              </motion.div>

              <motion.div className="input-group" initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
                <label>Visibility</label>
                <select value={visibility} onChange={(e) => setVisibility(e.target.value as any)}>
                  <option value="public">Public</option>
                  <option value="followers">Followers</option>
                  <option value="private">Private</option>
                </select>
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
