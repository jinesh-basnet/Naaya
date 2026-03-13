import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FaTimes, FaUserPlus, FaSignOutAlt, FaUser } from 'react-icons/fa';
import { messagesAPI } from '../services/api';
import Avatar from './Avatar';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import './GroupInfoModal.css';

interface Participant {
    user: {
        _id: string;
        username: string;
        fullName: string;
        profilePicture?: string;
    };
    role: 'admin' | 'member';
    joinedAt: string;
}

interface GroupInfoModalProps {
    conversation: {
        _id: string;
        name?: string;
        description?: string;
        avatar?: string;
        participants: Participant[];
    };
    onClose: () => void;
}

const GroupInfoModal: React.FC<GroupInfoModalProps> = ({ conversation, onClose }) => {
    const { user: currentUser } = useAuth();
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(conversation.name || '');
    const [description, setDescription] = useState(conversation.description || '');
    const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
    const [showAddMember, setShowAddMember] = useState(false);
    const [newMemberId, setNewMemberId] = useState('');

    const isAdmin = conversation.participants.find(p => p.user._id === currentUser?._id)?.role === 'admin';

    const updateGroupMutation = useMutation({
        mutationFn: (data: { name?: string, description?: string }) =>
            messagesAPI.updateGroup(conversation._id, data),
        onSuccess: () => {
            toast.success('Group updated successfully');
            queryClient.invalidateQueries({ queryKey: ['conversation', conversation._id] });
            setIsEditing(false);
        }
    });

    const leaveGroupMutation = useMutation({
        mutationFn: () => messagesAPI.leaveGroup(conversation._id),
        onSuccess: () => {
            toast.success('You left the group');
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            setShowLeaveConfirm(false);
            onClose();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to leave group');
        }
    });

    const removeParticipantMutation = useMutation({
        mutationFn: (targetUserId: string) => messagesAPI.removeParticipant(conversation._id, targetUserId),
        onSuccess: () => {
            toast.success('Member removed');
            queryClient.invalidateQueries({ queryKey: ['conversation', conversation._id] });
            setShowRemoveConfirm(false);
            setSelectedParticipant(null);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to remove member');
        }
    });

    const updateRoleMutation = useMutation({
        mutationFn: ({ targetUserId, role }: { targetUserId: string, role: 'admin' | 'member' }) =>
            messagesAPI.updateParticipantRole(conversation._id, targetUserId, role),
        onSuccess: () => {
            toast.success('Role updated');
            queryClient.invalidateQueries({ queryKey: ['conversation', conversation._id] });
        }
    });

    const addParticipantMutation = useMutation({
        mutationFn: (userId: string) => messagesAPI.addParticipants(conversation._id, [userId]),
        onSuccess: () => {
            toast.success('Member added');
            queryClient.invalidateQueries({ queryKey: ['conversation', conversation._id] });
            setShowAddMember(false);
            setNewMemberId('');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to add member');
        }
    });

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content group-info-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <button className="close-btn" onClick={onClose}><FaTimes /></button>
                </div>

                <div className="modal-body">
                    <div className="group-profile">
                        <Avatar src={conversation.avatar} name={conversation.name || 'Group'} alt={conversation.name || 'Group'} size={100} className="group-avatar" />

                        {isEditing ? (
                            <div className="edit-form">
                                <input
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Group Name"
                                    className="edit-input"
                                />
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Description"
                                    className="edit-textarea"
                                />
                                <div className="edit-actions">
                                    <button className="btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
                                    <button className="btn-primary" onClick={() => updateGroupMutation.mutate({ name, description })}>Save</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <h2>{conversation.name}</h2>
                                <p className="group-desc">{conversation.description || 'No description'}</p>
                                {isAdmin && <button className="edit-btn" onClick={() => setIsEditing(true)}>Edit Group Info</button>}
                            </>
                        )}
                    </div>

                    <div className="members-section">
                        <div className="section-header">
                            <h3>Members ({conversation.participants.length})</h3>
                            {isAdmin && <button className="add-member-btn" title="Add Members" onClick={() => setShowAddMember(true)}><FaUserPlus /></button>}
                        </div>

                        <div className="members-list">
                            {conversation.participants.map(p => (
                                <div key={p.user._id} className="member-item">
                                    <Avatar src={p.user.profilePicture} name={p.user.fullName} alt={p.user.fullName} size={36} />
                                    <div className="member-info">
                                        <span className="member-name">{p.user.fullName} {p.user._id === currentUser?._id && '(You)'}</span>
                                        <span className="member-username">@{p.user.username}</span>
                                    </div>
                                    <div className="member-actions-container">
                                        {p.role === 'admin' ? (
                                            <span className="admin-badge"><FaUser /> Admin</span>
                                        ) : null}

                                        {isAdmin && p.user._id !== currentUser?._id && (
                                            <div className="admin-actions">
                                                {p.role === 'member' ? (
                                                    <button
                                                        className="action-btn promote"
                                                        title="Promote to Admin"
                                                        onClick={() => updateRoleMutation.mutate({ targetUserId: p.user._id, role: 'admin' })}
                                                    >
                                                        <FaUserPlus />
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="action-btn demote"
                                                        title="Demote to Member"
                                                        onClick={() => updateRoleMutation.mutate({ targetUserId: p.user._id, role: 'member' })}
                                                    >
                                                        <FaUser />
                                                    </button>
                                                )}
                                                <button
                                                    className="action-btn remove"
                                                    title="Remove from Group"
                                                    onClick={() => {
                                                        setSelectedParticipant(p);
                                                        setShowRemoveConfirm(true);
                                                    }}
                                                >
                                                    <FaTimes />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        className="leave-group-btn"
                        onClick={() => setShowLeaveConfirm(true)}
                    >
                        <FaSignOutAlt /> Leave Group
                    </button>
                </div>
            </div>

            <DeleteConfirmationModal
                isOpen={showRemoveConfirm}
                onClose={() => {
                    setShowRemoveConfirm(false);
                    setSelectedParticipant(null);
                }}
                onConfirm={() => selectedParticipant && removeParticipantMutation.mutate(selectedParticipant.user._id)}
                title="Remove Member?"
                message={`Are you sure you want to remove ${selectedParticipant?.user.fullName} from the group?`}
                isPending={removeParticipantMutation.isPending}
            />

            <DeleteConfirmationModal
                isOpen={showLeaveConfirm}
                onClose={() => setShowLeaveConfirm(false)}
                onConfirm={() => leaveGroupMutation.mutate()}
                title="Leave Group?"
                message="Are you sure you want to leave this group? You will no longer be able to send or receive messages in this conversation."
                isPending={leaveGroupMutation.isPending}
            />

            {showAddMember && (
                <div className="modal-overlay" onClick={() => setShowAddMember(false)}>
                    <div className="delete-modal" onClick={e => e.stopPropagation()}>
                        <h3>Add Member</h3>
                        <p style={{marginBottom: '1rem'}}>Enter the User ID of the new member:</p>
                        <input
                            type="text"
                            value={newMemberId}
                            onChange={(e) => setNewMemberId(e.target.value)}
                            placeholder="User ID (MongoDB ID)"
                            style={{width: '100%', padding: '0.5rem', marginBottom: '1rem', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#333', color: 'white'}}
                        />
                        <div className="delete-actions">
                            <button className="btn-cancel" onClick={() => setShowAddMember(false)}>Cancel</button>
                            <button
                                className="btn-danger"
                                style={{backgroundColor: '#34B7F1'}}
                                onClick={() => addParticipantMutation.mutate(newMemberId)}
                                disabled={!newMemberId || addParticipantMutation.isPending}
                            >
                                {addParticipantMutation.isPending ? 'Adding...' : 'Add Member'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GroupInfoModal;
