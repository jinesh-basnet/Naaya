import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookmarkCollectionsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import './BookmarkCollectionsModal.css';

interface BookmarkCollection {
  _id: string;
  name: string;
  description: string;
  posts: string[];
  postCount: number;
  createdAt: string;
}

interface BookmarkCollectionsModalProps {
  open: boolean;
  onClose: () => void;
  postId?: string;
  currentCollections?: string[];
}

const BookmarkCollectionsModal: React.FC<BookmarkCollectionsModalProps> = ({
  open,
  onClose,
  postId,
  currentCollections = [],
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newCollectionName, setNewCollectionName] = useState('');
  const [editingCollection, setEditingCollection] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const {
    data: collectionsData,
    isLoading: collectionsLoading,
    error: collectionsError,
  } = useQuery({
    queryKey: ['bookmarkCollections'],
    queryFn: () => bookmarkCollectionsAPI.getCollections(),
    enabled: open && !!user,
  });

  const createCollectionMutation = useMutation({
    mutationFn: (data: { name: string }) => bookmarkCollectionsAPI.createCollection(data.name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarkCollections'] });
      setNewCollectionName('');
      toast.success('Collection created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create collection');
    },
  });

  const deleteCollectionMutation = useMutation({
    mutationFn: (collectionId: string) => bookmarkCollectionsAPI.deleteCollection(collectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarkCollections'] });
      toast.success('Collection deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete collection');
    },
  });

  const updateCollectionMutation = useMutation({
    mutationFn: ({ collectionId, name }: { collectionId: string; name: string }) =>
      bookmarkCollectionsAPI.updateCollection(collectionId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarkCollections'] });
      setEditingCollection(null);
      setEditName('');
      toast.success('Collection updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update collection');
    },
  });

  const togglePostInCollectionMutation = useMutation({
    mutationFn: ({ collectionId, postId, isInCollection }: { collectionId: string; postId: string; isInCollection: boolean }) => {
      if (isInCollection) {
        return bookmarkCollectionsAPI.removePostFromCollection(collectionId, postId);
      } else {
        return bookmarkCollectionsAPI.addPostToCollection(collectionId, postId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarkCollections'] });
      toast.success('Post updated in collection');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update collection');
    },
  });

  const handleCreateCollection = () => {
    if (newCollectionName.trim()) {
      createCollectionMutation.mutate({ name: newCollectionName.trim() });
    }
  };

  const handleDeleteCollection = (collectionId: string) => {
    if (window.confirm('Are you sure you want to delete this collection?')) {
      deleteCollectionMutation.mutate(collectionId);
    }
  };

  const handleTogglePostInCollection = (collectionId: string, isInCollection: boolean) => {
    if (!postId) return;
    togglePostInCollectionMutation.mutate({ collectionId, postId, isInCollection });
  };

  const startEditing = (collection: BookmarkCollection) => {
    setEditingCollection(collection._id);
    setEditName(collection.name);
  };

  const cancelEditing = () => {
    setEditingCollection(null);
    setEditName('');
  };

  const saveEditing = () => {
    if (editName.trim() && editingCollection) {
      updateCollectionMutation.mutate({ collectionId: editingCollection, name: editName.trim() });
    }
  };

  const collections = collectionsData?.data?.collections || [];

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          {postId ? 'Add to Collection' : 'Manage Collections'}
        </div>
        <div className="modal-body">
          {collectionsLoading ? (
            <div className="loading-spinner">
              <div className="spinner" />
            </div>
          ) : collectionsError ? (
            <div className="error-message">
              Failed to load collections
            </div>
          ) : (
            <>
              <div className="create-collection">
                <input
                  type="text"
                  className="create-input"
                  placeholder="New collection name"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateCollection();
                    }
                  }}
                />
                <button
                  className="create-button"
                  onClick={handleCreateCollection}
                  disabled={!newCollectionName.trim() || createCollectionMutation.isPending}
                >
                  <span>+</span>
                  Create
                </button>
              </div>

              {collections.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📚</div>
                  <h6 className="empty-title">
                    No collections yet
                  </h6>
                  <p className="empty-description">
                    Create your first collection to organize your saved posts
                  </p>
                </div>
              ) : (
                <div>
                  {collections.map((collection: BookmarkCollection) => {
                    const isInCollection = postId ? collection.posts.includes(postId) : false;

                    return (
                      <div key={collection._id} className="collection-item">
                        {editingCollection === collection._id ? (
                          <>
                            <input
                              type="text"
                              className="edit-input"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              autoFocus
                            />
                            <div className="edit-actions">
                              <button
                                className="edit-button save"
                                onClick={saveEditing}
                                disabled={updateCollectionMutation.isPending}
                              >
                                Save
                              </button>
                              <button
                                className="edit-button cancel"
                                onClick={cancelEditing}
                              >
                                Cancel
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="collection-info">
                              <div className="collection-name">
                                {collection.name}
                                <span className="collection-post-count">
                                  {collection.postCount} posts
                                </span>
                              </div>
                              <div className="collection-description">
                                {collection.description || 'No description'}
                              </div>
                            </div>
                            <div className="collection-actions">
                              {postId && (
                                <button
                                  className="action-button"
                                  onClick={() => handleTogglePostInCollection(collection._id, isInCollection)}
                                  disabled={togglePostInCollectionMutation.isPending}
                                  title={isInCollection ? 'Remove from collection' : 'Add to collection'}
                                >
                                  {isInCollection ? '🔖' : '📑'}
                                </button>
                              )}
                              <button
                                className="action-button"
                                onClick={() => startEditing(collection)}
                                title="Edit collection"
                              >
                                ✏️
                              </button>
                              <button
                                className="action-button delete"
                                onClick={() => handleDeleteCollection(collection._id)}
                                title="Delete collection"
                              >
                                🗑️
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
        <div className="modal-footer">
          <button className="close-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookmarkCollectionsModal;
