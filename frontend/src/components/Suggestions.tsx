import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { usersAPI } from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

import './Suggestions.css';

const Suggestions: React.FC<{ limit?: number }> = ({ limit = 6 }) => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [loadingUserIds, setLoadingUserIds] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery(['suggestions', limit], () =>
    usersAPI.getSuggestions(limit).then(r => r.data),
    { staleTime: 1000 * 60 }
  );

  const followMutation = useMutation({
    mutationFn: (userId: string) => usersAPI.followUser(userId),
    onMutate: async (userId: string) => {
      setLoadingUserIds(prev => [...prev, userId]);
      await queryClient.cancelQueries(['suggestions', limit]);
      const previous = queryClient.getQueryData<any>(['suggestions', limit]);

      if (previous?.users) {
        const next = {
          ...previous,
          users: previous.users.map((u: any) => u._id === userId ? { ...u, isFollowing: true, followersCount: (u.followersCount ?? 0) + 1 } : u)
        };
        queryClient.setQueryData(['suggestions', limit], next);
      }

      return { previous };
    },
    onError: (err: any, userId: string, context: any) => {
      setLoadingUserIds(prev => prev.filter(id => id !== userId));
      if (context?.previous) queryClient.setQueryData(['suggestions', limit], context.previous);
      toast.error(err.response?.data?.message || 'Failed to follow');
    },
    onSettled: (dataRes, errorRes, userId) => {
      setLoadingUserIds(prev => prev.filter(id => id !== userId));
      queryClient.invalidateQueries(['suggestions', limit]);
    }
  });

  const unfollowMutation = useMutation({
    mutationFn: (userId: string) => usersAPI.unfollowUser(userId),
    onMutate: async (userId: string) => {
      setLoadingUserIds(prev => [...prev, userId]);
      await queryClient.cancelQueries(['suggestions', limit]);
      const previous = queryClient.getQueryData<any>(['suggestions', limit]);

      if (previous?.users) {
        const next = {
          ...previous,
          users: previous.users.map((u: any) => u._id === userId ? { ...u, isFollowing: false, followersCount: Math.max(0, (u.followersCount ?? 0) - 1) } : u)
        };
        queryClient.setQueryData(['suggestions', limit], next);
      }

      return { previous };
    },
    onError: (err: any, userId: string, context: any) => {
      setLoadingUserIds(prev => prev.filter(id => id !== userId));
      if (context?.previous) queryClient.setQueryData(['suggestions', limit], context.previous);
      toast.error(err.response?.data?.message || 'Failed to unfollow');
    },
    onSettled: (dataRes, errorRes, userId) => {
      setLoadingUserIds(prev => prev.filter(id => id !== userId));
      queryClient.invalidateQueries(['suggestions', limit]);
    }
  });

  useEffect(() => {
    const handleFollow = () => refetch();
    const handleUnfollow = () => refetch();
    (global as any).socket?.on('user_followed', handleFollow);
    (global as any).socket?.on('user_unfollowed', handleUnfollow);
    return () => {
      (global as any).socket?.off('user_followed', handleFollow);
      (global as any).socket?.off('user_unfollowed', handleUnfollow);
    };
  }, [refetch]);

  if (isLoading) return <div className="suggestions">Loading suggestions...</div>;
  if (error) return <div className="suggestions">Error loading suggestions</div>;

  const users = data?.users || [];

  return (
    <aside className="suggestions">
      <div className="suggestions-header">
        <h3>People you may know</h3>
      </div>

      <div className="suggestions-carousel" role="list">
        {users.length === 0 && <div className="empty-suggestions">No suggestions right now</div>}

        {users.map((u: any) => (
          <div key={u._id} className="suggestion-card" role="listitem">
            <div className="card-top">
              <img src={u.profilePicture || '/default-profile.png'} alt={u.username} className="card-avatar" />
              <div className="card-badge">{u.suggestionReason ? (u.suggestionReason.replace('_', ' ')) : ''}</div>
            </div>
            <div className="card-info">
              <div
                className={"card-name" + (u._id !== currentUser?._id ? ' clickable' : '')}
                onClick={() => u._id !== currentUser?._id && navigate(`/profile/${u.username}`)}
                role={u._id !== currentUser?._id ? 'link' : undefined}
                tabIndex={u._id !== currentUser?._id ? 0 : -1}
                onKeyPress={(e) => { if (e.key === 'Enter' && u._id !== currentUser?._id) navigate(`/profile/${u.username}`); }}
              >
                {u.fullName}
              </div>
              <div
                className={"card-username" + (u._id !== currentUser?._id ? ' clickable' : '')}
                onClick={() => u._id !== currentUser?._id && navigate(`/profile/${u.username}`)}
                role={u._id !== currentUser?._id ? 'link' : undefined}
                tabIndex={u._id !== currentUser?._id ? 0 : -1}
                onKeyPress={(e) => { if (e.key === 'Enter' && u._id !== currentUser?._id) navigate(`/profile/${u.username}`); }}
              >
                @{u.username}
              </div>
              <div className="card-meta">{u.followersCount ?? 0} followers</div>
            </div>
            <div className="card-action">
              <button
                className={"toggle-btn " + (u.isFollowing ? 'following' : 'not-following')}
                onClick={() => (u.isFollowing ? unfollowMutation.mutate(u._id) : followMutation.mutate(u._id))}
                disabled={loadingUserIds.includes(u._id)}
                aria-pressed={!!u.isFollowing}
              >
                {loadingUserIds.includes(u._id) ? '...' : (u.isFollowing ? 'Following' : 'Follow')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default Suggestions;
