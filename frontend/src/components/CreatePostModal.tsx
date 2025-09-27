import React, { useState, useRef } from 'react';
import { FaTimes, FaImages, FaMapMarkerAlt, FaUserPlus, FaChevronRight, FaChevronLeft, FaPaperPlane } from 'react-icons/fa';
import { motion } from 'framer-motion';
import './CreatePostModal.css';

interface CreatePostModalProps {
  open: boolean;
  onClose: () => void;
  onPost: (post: {
    caption: string;
    media: File | null;
    tags: string[];
    location: string;
    filter?: string;
    brightness?: number;
    contrast?: number;
  }) => void;
}

const steps = ['Select Media', 'Edit', 'Details', 'Share'];

const filters = [
  { name: 'None', value: 'none' },
  { name: 'Clarendon', value: 'clarendon' },
  { name: 'Gingham', value: 'gingham' },
  { name: 'Moon', value: 'moon' },
  { name: 'Lark', value: 'lark' },
  { name: 'Reyes', value: 'reyes' },
  { name: 'Juno', value: 'juno' },
  { name: 'Slumber', value: 'slumber' },
  { name: 'Crema', value: 'crema' },
  { name: 'Ludwig', value: 'ludwig' },
  { name: 'Aden', value: 'aden' },
  { name: 'Perpetua', value: 'perpetua' },
];

const CreatePostModal: React.FC<CreatePostModalProps> = ({ open, onClose, onPost }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [caption, setCaption] = useState('');
  const [media, setMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [editTab, setEditTab] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setMedia(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        setMediaPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      setActiveStep(1); 
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

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handlePost = () => {
    onPost({
      caption,
      media,
      tags,
      location,
      filter: selectedFilter,
      brightness,
      contrast,
    });
    resetModal();
    onClose();
  };

  const resetModal = () => {
    setActiveStep(0);
    setCaption('');
    setMedia(null);
    setMediaPreview('');
    setTags([]);
    setLocation('');
    setSelectedFilter('none');
    setBrightness(100);
    setContrast(100);
    setEditTab(0);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!open) return null;

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <div className="step-0">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <FaImages className="icon" />
              <h3>Create new post</h3>
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
          </div>
        );

      case 1:
        return (
          <div className="step-1">
            <div className="tabs">
              <button
                className={`tab ${editTab === 0 ? 'active' : ''}`}
                onClick={() => setEditTab(0)}
              >
                Filters
              </button>
              <button
                className={`tab ${editTab === 1 ? 'active' : ''}`}
                onClick={() => setEditTab(1)}
              >
                Adjust
              </button>
              <button
                className={`tab ${editTab === 2 ? 'active' : ''}`}
                onClick={() => setEditTab(2)}
              >
                Crop
              </button>
            </div>

            <div className="edit-content">
              <div className="preview-container">
                <div
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                  }}
                >
                  {mediaPreview && (
                    <img
                      src={mediaPreview}
                      alt="Preview"
                      className="preview-image"
                    />
                  )}
                </div>
              </div>

              {editTab === 0 && (
                <div className="edit-panel">
                  <h4>Filters</h4>
                  <div className="filters">
                    {filters.map((filter) => (
                      <div
                        key={filter.value}
                        className={`filter-item ${selectedFilter === filter.value ? 'selected' : ''}`}
                        onClick={() => setSelectedFilter(filter.value)}
                      >
                        {filter.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {editTab === 1 && (
                <div className="edit-panel">
                  <div className="slider-group">
                    <label>Brightness</label>
                    <input
                      type="range"
                      className="slider"
                      value={brightness}
                      onChange={(e) => setBrightness(Number(e.target.value))}
                      min={50}
                      max={150}
                      step={1}
                    />
                  </div>
                  <div className="slider-group">
                    <label>Contrast</label>
                    <input
                      type="range"
                      className="slider"
                      value={contrast}
                      onChange={(e) => setContrast(Number(e.target.value))}
                      min={50}
                      max={150}
                      step={1}
                    />
                  </div>
                </div>
              )}

              {editTab === 2 && (
                <div className="edit-panel" style={{ textAlign: 'center' }}>
                  <p>Crop functionality coming soon</p>
                </div>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="step-2">
            <div className="caption-section">
              <img src={mediaPreview} alt="Preview" className="caption-avatar" />
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
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
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
        );

      case 3:
        return (
          <div className="step-3">
            <h3>Preview & Share</h3>

            <div className="preview-section">
              <img src={mediaPreview} alt="Preview" className="caption-avatar" />
              <div className="preview-text">
                <p>{caption || 'No caption'}</p>
                {location && <span className="meta">📍 {location}</span>}
                {tags.length > 0 && <span className="meta" style={{ marginLeft: '8px' }}>👥 {tags.join(', ')}</span>}
              </div>
            </div>

            <div className="final-preview">
              <div
                style={{
                  width: '300px',
                  height: '300px',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                }}
              >
                {mediaPreview && (
                  <img
                    src={mediaPreview}
                    alt="Final preview"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          {activeStep > 0 && (
            <button className="icon-button" onClick={handleBack}>
              <FaChevronLeft />
            </button>
          )}
          <h2>{steps[activeStep]}</h2>
          <button className="icon-button" onClick={handleClose}>
            <FaTimes />
          </button>
        </div>

        {/* Stepper */}
        <div className="stepper">
          <ul>
            {steps.map((label, index) => (
              <li key={label} className={index === activeStep ? 'step-active' : ''}>
                <div className="step-circle">{index + 1}</div>
                <div className="step-label">{label}</div>
              </li>
            ))}
          </ul>
        </div>

        {/* Content */}
        <div className="modal-body">
          {renderStepContent(activeStep)}
        </div>

        {/* Footer */}
        {activeStep > 0 && (
          <div className="modal-footer">
            <button
              className="button button-secondary"
              onClick={handleBack}
              disabled={activeStep === 0}
            >
              Back
            </button>
            {activeStep === steps.length - 1 ? (
              <button
                className="button button-primary"
                onClick={handlePost}
                disabled={!media}
              >
                <FaPaperPlane style={{ marginRight: '8px' }} />
                Share
              </button>
            ) : (
              <button
                className="button button-primary"
                onClick={handleNext}
                disabled={activeStep === 0 && !media}
              >
                Next
                <FaChevronRight style={{ marginLeft: '8px' }} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatePostModal;
