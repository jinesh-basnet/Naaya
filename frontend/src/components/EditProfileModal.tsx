import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';
import { BsCamera } from 'react-icons/bs';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { usersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Avatar from './Avatar';
import './EditProfileModal.css';

interface User {
    _id: string;
    username: string;
    fullName: string;
    profilePicture: string;
    gender?: string;
    bio?: string;
    location?: {
        city: string;
        district: string;
        province: string;
    };
}

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: User;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose, currentUser }) => {
    const queryClient = useQueryClient();
    const { refetchUser } = useAuth();
    const [fullName, setFullName] = useState(currentUser.fullName || '');
    const [bio, setBio] = useState(currentUser.bio || '');
    const [gender, setGender] = useState(currentUser.gender || 'other');
    const [city, setCity] = useState(currentUser.location?.city || '');
    const [district, setDistrict] = useState(currentUser.location?.district || '');
    const [province, setProvince] = useState(currentUser.location?.province || '');
    const [profilePicture, setProfilePicture] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>(currentUser.profilePicture || '/default-profile.svg');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setFullName(currentUser.fullName || '');
            setBio(currentUser.bio || '');
            setGender(currentUser.gender || 'other');
            setCity(currentUser.location?.city || '');
            setDistrict(currentUser.location?.district || '');
            setProvince(currentUser.location?.province || '');
            setPreviewUrl(currentUser.profilePicture || '/default-profile.svg');
            setProfilePicture(null);
        }
    }, [isOpen, currentUser]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            console.log('Selected file:', file);
            setProfilePicture(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const formData = new FormData();
            formData.append('fullName', fullName);
            formData.append('bio', bio);
            formData.append('gender', gender);
            formData.append('location[city]', city);
            formData.append('location[district]', district);
            formData.append('location[province]', province);

            if (profilePicture) {
                formData.append('profilePicture', profilePicture);
            }

            await usersAPI.updateProfile(formData);

            await queryClient.invalidateQueries({ queryKey: ['profile', currentUser.username] });
            await queryClient.refetchQueries({ queryKey: ['profile', currentUser.username] });
            await refetchUser();

            toast.success('Profile updated successfully');
            onClose();
        } catch (error) {
            console.error('Failed to update profile:', error);
            toast.error('Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="edit-profile-modal-overlay"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="edit-profile-modal-content"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="edit-profile-header">
                        <h3>Edit Profile</h3>
                        <button className="close-btn" onClick={onClose}>
                            <FaTimes />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="edit-profile-body">
                        <div className="profile-picture-upload">
                            <Avatar
                                src={previewUrl}
                                alt="Preview"
                                className="profile-picture-preview"
                                size={100}
                            />
                            <label htmlFor="profile-upload" className="upload-btn-label">
                                <BsCamera style={{ marginRight: '8px' }} />
                                Change Profile Photo
                            </label>
                            <input
                                id="profile-upload"
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                            />
                        </div>

                        <div className="form-group">
                            <label>Full Name</label>
                            <input
                                type="text"
                                className="form-input"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Bio</label>
                            <textarea
                                className="form-textarea"
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                maxLength={150}
                            />
                        </div>

                        <div className="form-group">
                            <label>Gender</label>
                            <select
                                className="form-input"
                                value={gender}
                                onChange={(e) => setGender(e.target.value)}
                            >
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other / Not specified</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Location</label>
                            <div className="location-grid">
                                <input
                                    type="text"
                                    placeholder="City"
                                    className="form-input"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                />
                                <input
                                    type="text"
                                    placeholder="District"
                                    className="form-input"
                                    value={district}
                                    onChange={(e) => setDistrict(e.target.value)}
                                />
                            </div>
                            <input
                                type="text"
                                placeholder="Province"
                                className="form-input"
                                value={province}
                                onChange={(e) => setProvince(e.target.value)}
                                style={{ marginTop: '16px' }}
                            />
                        </div>

                        <div className="btn-group">
                            <button type="button" className="btn btn-cancel" onClick={onClose}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-save" disabled={loading}>
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default EditProfileModal;
