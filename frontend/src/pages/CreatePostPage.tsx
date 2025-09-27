import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FaPlus, FaImage, FaVideo, FaTimes } from 'react-icons/fa';
import toast from 'react-hot-toast';

const CreatePostPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [caption, setCaption] = useState('');
  const [media, setMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        setMedia(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          setMediaPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        toast.error('Please select an image or video file.');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !media || !caption.trim()) {
      toast.error('Please log in, select media, and add a caption.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Simulate API call to create post
      // In real implementation, use api.post('/posts', { caption, media })
      toast.success('Post created successfully!');
      navigate('/home');
    } catch (error) {
      toast.error('Failed to create post.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/home');
  };

  return (
    <div className="create-post-page" style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <div className="header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Create New Post</h2>
        <button onClick={handleCancel} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>
          <FaTimes />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="media-upload" style={{ border: '2px dashed var(--text-secondary)', borderRadius: 'var(--border-radius)', padding: '40px', textAlign: 'center', marginBottom: '20px' }}>
          {mediaPreview ? (
            <div style={{ position: 'relative' }}>
              <img src={mediaPreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: 'var(--border-radius)' }} />
              <button
                type="button"
                onClick={() => { setMedia(null); setMediaPreview(null); }}
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: 'rgba(0,0,0,0.5)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <FaTimes size={14} />
              </button>
            </div>
          ) : (
            <>
              <label htmlFor="media-input" style={{ cursor: 'pointer', display: 'block', marginBottom: '10px' }}>
                <FaPlus size={48} style={{ color: 'var(--text-secondary)', marginBottom: '10px' }} />
                <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Choose photo or video</p>
              </label>
              <input
                id="media-input"
                type="file"
                accept="image/*,video/*"
                onChange={handleMediaChange}
                style={{ display: 'none' }}
              />
            </>
          )}
        </div>

        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Write a caption..."
          style={{
            width: '100%',
            minHeight: '100px',
            padding: '12px',
            border: '1px solid var(--text-secondary)',
            borderRadius: 'var(--border-radius)',
            resize: 'vertical',
            fontFamily: 'inherit',
            marginBottom: '20px',
            fontSize: '16px'
          }}
          maxLength={2200}
        />

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={handleCancel}
            style={{
              padding: '10px 20px',
              background: 'var(--text-secondary)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--border-radius)',
              cursor: 'pointer',
              fontWeight: 600
            }}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={{
              padding: '10px 20px',
              background: 'var(--primary-main)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--border-radius)',
              cursor: 'pointer',
              fontWeight: 600
            }}
            disabled={isSubmitting || !media || !caption.trim()}
          >
            {isSubmitting ? 'Posting...' : 'Share Post'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePostPage;
