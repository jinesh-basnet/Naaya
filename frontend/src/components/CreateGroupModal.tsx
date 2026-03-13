import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaTimes, FaSearch, FaUsers } from 'react-icons/fa';
import { api, messagesAPI } from '../services/api';
import Avatar from './Avatar';
import toast from 'react-hot-toast';
import './CreateGroupModal.css';

interface User {
    _id: string;
    username: string;
    fullName: string;
    profilePicture?: string;
}

interface CreateGroupModalProps {
    onClose: () => void;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ onClose }) => {
    const [groupName, setGroupName] = useState('');
    const [description, setDescription] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const queryClient = useQueryClient();

    // Search users for the group
    const { data: searchData, isLoading: searching } = useQuery({
        queryKey: ['user-search', searchQuery],
        queryFn: async () => {
            const response = await api.get(`/users/search?query=${searchQuery}`);
            return response.data.users as User[];
        },
        enabled: searchQuery.length >= 2,
    });

    const createGroupMutation = useMutation({
        mutationFn: (data: { name: string, participants: string[], description?: string }) =>
            messagesAPI.createGroup(data),
        onSuccess: () => {
            toast.success('Group created successfully!');
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            onClose();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to create group');
        }
    });

    const toggleUserSelection = (userId: string) => {
        setSelectedUsers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleCreateGroup = () => {
        if (!groupName.trim()) {
            toast.error('Please enter a group name');
            return;
        }
        if (selectedUsers.length === 0) {
            toast.error('Please select at least one member');
            return;
        }
        createGroupMutation.mutate({
            name: groupName,
            participants: selectedUsers,
            description
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content create-group-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2><FaUsers /> Create New Group</h2>
                    <button className="close-btn" onClick={onClose}><FaTimes /></button>
                </div>

                <div className="modal-body">
                    <div className="input-group">
                        <label>Group Name</label>
                        <input
                            type="text"
                            placeholder="e.g. Project Team"
                            value={groupName}
                            onChange={e => setGroupName(e.target.value)}
                        />
                    </div>

                    <div className="input-group">
                        <label>Description (Optional)</label>
                        <textarea
                            placeholder="What's this group about?"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </div>

                    <div className="member-selection">
                        <label>Add Members</label>
                        <div className="search-bar">
                            <FaSearch className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="users-list">
                            {searching ? (
                                <div className="loading-spinner">Searching...</div>
                            ) : searchData && searchData.length > 0 ? (
                                searchData.map(user => (
                                    <div
                                        key={user._id}
                                        className={`user-item ${selectedUsers.includes(user._id) ? 'selected' : ''}`}
                                        onClick={() => toggleUserSelection(user._id)}
                                    >
                                        <Avatar src={user.profilePicture} name={user.fullName} alt={user.fullName} size={32} />
                                        <div className="user-info">
                                            <span className="full-name">{user.fullName}</span>
                                            <span className="username">@{user.username}</span>
                                        </div>
                                        <div className="checkbox">
                                            {selectedUsers.includes(user._id) && <div className="checked"></div>}
                                        </div>
                                    </div>
                                ))
                            ) : searchQuery.length >= 2 ? (
                                <div className="no-users">No users found</div>
                            ) : (
                                <div className="search-hint">Type at least 2 characters to search</div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <span className="selected-count">{selectedUsers.length} members selected</span>
                    <button
                        className="btn-primary create-btn"
                        onClick={handleCreateGroup}
                        disabled={createGroupMutation.isLoading}
                    >
                        {createGroupMutation.isLoading ? 'Creating...' : 'Create Group'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateGroupModal;
