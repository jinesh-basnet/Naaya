import React, { useRef, useState } from 'react';
import { FaImage, FaVideo, FaTimes } from 'react-icons/fa';
import { BsFilm, BsFileEarmarkText, BsPaperclip } from 'react-icons/bs';
import './MessageFileUpload.css';

interface MessageFileUploadProps {
  onFileSelect: (file: File, type: 'image' | 'video' | 'file') => void;
  onRemoveFile: () => void;
  selectedFile: File | null;
  fileType: 'image' | 'video' | 'file' | null;
}

const MessageFileUpload: React.FC<MessageFileUploadProps> = ({
  onFileSelect,
  onRemoveFile,
  selectedFile,
  fileType
}) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileSelect = (file: File, type: 'image' | 'video' | 'file') => {
    onFileSelect(file, type);

    // Create preview for images
    if (type === 'image') {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleImageClick = () => {
    imageInputRef.current?.click();
  };

  const handleVideoClick = () => {
    videoInputRef.current?.click();
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onRemoveFile();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="message-file-upload">
      {!selectedFile ? (
        <div className="upload-options">
          <button
            type="button"
            className="upload-btn"
            onClick={handleImageClick}
            title="Attach image"
          >
            <FaImage />
          </button>
          <button
            type="button"
            className="upload-btn"
            onClick={handleVideoClick}
            title="Attach video"
          >
            <FaVideo />
          </button>
          <button
            type="button"
            className="upload-btn"
            onClick={handleFileClick}
            title="Attach file"
          >
            <BsPaperclip />
          </button>
        </div>
      ) : (
        <div className="file-preview">
          <div className="file-info">
            {fileType === 'image' && previewUrl && (
              <img src={previewUrl} alt="Preview" className="image-preview" />
            )}
            {fileType === 'video' && (
               <BsFilm className="file-icon-placeholder" />
            )}
            {fileType === 'file' && (
               <BsFileEarmarkText className="file-icon-placeholder" />
            )}
            <div className="file-details">
              <span className="file-name">{selectedFile.name}</span>
              <span className="file-size">{formatFileSize(selectedFile.size)}</span>
            </div>
          </div>
          <button
            type="button"
            className="remove-file-btn"
            onClick={handleRemove}
            title="Remove file"
          >
            <FaTimes />
          </button>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file, 'image');
          e.target.value = '';
        }}
        style={{ display: 'none' }}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file, 'video');
          e.target.value = '';
        }}
        style={{ display: 'none' }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file, 'file');
          e.target.value = '';
        }}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default MessageFileUpload;
