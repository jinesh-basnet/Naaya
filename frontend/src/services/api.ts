import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api` : '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (identifier: string, password: string) =>
    api.post('/auth/login', { identifier, password }),

  register: (userData: any) =>
    api.post('/auth/register', userData),

  getMe: () =>
    api.get('/auth/me'),

  logout: () => {
    const refreshToken = localStorage.getItem('refreshToken');
    return api.post('/auth/logout', { refreshToken });
  }
};

export const postsAPI = {
  createPost: (postData: any) => api.post('/posts', postData),
  updatePost: (postId: string, postData: any) => api.put(`/posts/${postId}`, postData),
  deletePost: (postId: string) => api.delete(`/posts/${postId}`),
  getFeed: (feedType: string = 'fyp', page: number = 1, limit: number = 10) =>
    api.get(`/posts/feed?feedType=${feedType}&page=${page}&limit=${limit}`),
  getCombinedFeed: (page: number = 1, limit: number = 20) =>
    api.get(`/feed/simple?page=${page}&limit=${limit}`),
  getPost: (postId: string) => api.get(`/posts/${postId}`),
  likePost: (postId: string) => api.post(`/posts/${postId}/like`),
  savePost: (postId: string) => api.post(`/posts/${postId}/save`),
  sharePost: (postId: string) => api.post(`/posts/${postId}/share`),
  viewPost: (postId: string) => api.post(`/posts/${postId}/view`),
  reportPost: (postId: string, data: any) => api.post(`/posts/${postId}/report`, data),
  getComments: (postId: string, page: number = 1) => api.get(`/posts/${postId}/comments?page=${page}`),
  addComment: (postId: string, content: string) => api.post(`/posts/${postId}/comments`, { content }),
  replyToComment: (postId: string, commentId: string, content: string) => api.post(`/posts/${postId}/comments/${commentId}/reply`, { content }),
  replyToReply: (postId: string, replyId: string, content: string) => api.post(`/posts/${postId}/replies/${replyId}/reply`, { content }),
  likeReply: (postId: string, replyId: string) => api.post(`/posts/${postId}/replies/${replyId}/like`),
  deleteComment: (postId: string, commentId: string) => api.delete(`/posts/${postId}/comments/${commentId}`),
  deleteReply: (postId: string, replyId: string) => api.delete(`/posts/${postId}/replies/${replyId}`),
  getUserPosts: (username: string, page: number = 1, limit: number = 10) => api.get(`/posts/user/${username}?page=${page}&limit=${limit}`),
  getUserBookmarks: (page: number = 1, limit: number = 10) => api.get(`/posts/bookmarks?page=${page}&limit=${limit}`),
  searchPosts: (query: string) => api.get(`/posts/search?q=${encodeURIComponent(query)}`),
  getExploreOverview: () => api.get('/posts/explore'),
};

export const reelsAPI = {
  getFeed: (page: number = 1) => api.get(`/reels/feed?page=${page}`),
  getUserReels: (userId: string, page: number = 1, limit: number = 12) => api.get(`/reels/user/${userId}?page=${page}&limit=${limit}`),
  searchReels: (query: string) => api.get(`/reels/search?q=${encodeURIComponent(query)}`),
  getPost: (reelId: string) => api.get(`/reels/${reelId}`),
  likeReel: (reelId: string) => api.post(`/reels/${reelId}/like`),
  saveReel: (reelId: string) => api.post(`/reels/${reelId}/save`),
  getSavedReels: (page: number = 1) => api.get(`/reels/saved?page=${page}`),
  deleteReel: (reelId: string) => api.delete(`/reels/${reelId}`),
  getReelComments: (reelId: string, page: number = 1, limit: number = 20) => api.get(`/reels/${reelId}/comments?page=${page}&limit=${limit}`),
  commentReel: (reelId: string, content: string) => api.post(`/reels/${reelId}/comments`, { content }),
  replyToComment: (reelId: string, commentId: string, content: string) => api.post(`/reels/${reelId}/comments/${commentId}/reply`, { content }),
  replyToReply: (reelId: string, replyId: string, content: string) => api.post(`/reels/${reelId}/replies/${replyId}/reply`, { content }),
  likeReply: (reelId: string, replyId: string) => api.post(`/reels/${reelId}/replies/${replyId}/like`),
  deleteComment: (reelId: string, commentId: string) => api.delete(`/reels/${reelId}/comments/${commentId}`),
  deleteReply: (reelId: string, replyId: string) => api.delete(`/reels/${reelId}/replies/${replyId}`),
};

export const usersAPI = {
  getProfile: (usernameOrId: string) => api.get(`/users/${usernameOrId}`),
  searchUsers: (query: string) => api.get(`/users/search?q=${encodeURIComponent(query)}`),
  followUser: (userId: string) => api.post(`/users/${userId}/follow`),
  unfollowUser: (userId: string) => api.delete(`/users/${userId}/follow`),
  getFollowers: (username: string) => api.get(`/users/${username}/followers`),
  getFollowing: (username: string) => api.get(`/users/${username}/following`),
  getSuggestions: (limit: number = 5) => api.get(`/users/suggestions?limit=${limit}`),
  updateProfile: (formData: FormData) => api.put('/users/profile', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateKeys: (data: any) => api.put('/users/keys', data),
  deleteAccount: () => api.delete('/users/account'),
};

export const blocksAPI = {
  checkBlockStatus: (userId: string) => api.get(`/blocks/check/${userId}`),
  blockUser: (userId: string, data: any) => api.post(`/blocks/${userId}`, data),
  getBlockedUsers: () => api.get('/blocks'),
  unblockUser: (userId: string) => api.delete(`/blocks/${userId}`),
};



export const bookmarkCollectionsAPI = {
  getCollections: () => api.get('/bookmark-collections'),
  createCollection: (data: { name: string; description?: string; visibility?: string; coverImage?: string | File }) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value instanceof File) {
        formData.append(key, value);
      } else if (value !== undefined) {
        formData.append(key, value as string);
      }
    });
    return api.post('/bookmark-collections', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  updateCollection: (collectionId: string, data: any) => api.put(`/bookmark-collections/${collectionId}`, data),
  deleteCollection: (collectionId: string) => api.delete(`/bookmark-collections/${collectionId}`),
  addPostToCollection: (collectionId: string, postId: string) => api.post(`/bookmark-collections/${collectionId}/posts/${postId}`),
  removePostFromCollection: (collectionId: string, postId: string) => api.delete(`/bookmark-collections/${collectionId}/posts/${postId}`),
  addReelToCollection: (collectionId: string, reelId: string) => api.post(`/bookmark-collections/${collectionId}/reels/${reelId}`),
  removeReelFromCollection: (collectionId: string, reelId: string) => api.delete(`/bookmark-collections/${collectionId}/reels/${reelId}`),
};

export const locationsAPI = {
  updateLocation: (lat: number, lng: number) => api.post('/users/location', { lat, lng }),
};

export const messagesAPI = {
  getMessages: (conversationId: string) => api.get(`/messages/conversation/${conversationId}`),
  sendMessage: (data: any) => api.post('/messages', data),
  getConversations: () => api.get('/conversations'),
  getConversation: (conversationId: string) => api.get(`/conversations/${conversationId}`),
  getConversationByUserId: (userId: string) => api.get(`/conversations/user/${userId}`),
  getConversationMessages: (conversationId: string) => api.get(`/messages/conversation/${conversationId}`),
  createGroup: (data: { name: string, participants: string[], description?: string }) => api.post('/conversations/group', data),
  deleteConversation: (conversationId: string) => api.delete(`/conversations/${conversationId}`),
  updateGroup: (conversationId: string, data: any) => api.put(`/conversations/${conversationId}`, data),
  leaveGroup: (conversationId: string) => api.post(`/conversations/${conversationId}/leave`),
  removeParticipant: (conversationId: string, userId: string) => api.post(`/conversations/${conversationId}/remove/${userId}`),
  updateParticipantRole: (conversationId: string, userId: string, role: 'admin' | 'member') => api.put(`/conversations/${conversationId}/roles/${userId}`, { role }),
  addParticipants: (conversationId: string, userIds: string[]) => api.post(`/conversations/${conversationId}/add`, { userIds }),
  editMessage: (messageId: string, content: any, iv?: string, isEncrypted?: boolean) => api.put(`/messages/${messageId}`, { content, iv, isEncrypted }),
  deleteMessage: (messageId: string) => api.delete(`/messages/${messageId}`),
  addReaction: (messageId: string, emoji: string) => api.post(`/messages/${messageId}/reactions`, { emoji }),
  removeReaction: (messageId: string, emoji: string) => api.delete(`/messages/${messageId}/reactions/${emoji}`),
  forwardMessage: (messageId: string, targetUserId: string) => api.post(`/messages/${messageId}/forward/${targetUserId}`),
  searchMessagesInConversation: (conversationId: string, query: string) => api.get(`/messages/search/${conversationId}?q=${encodeURIComponent(query)}`),
  markMessageAsRead: (messageId: string) => api.put(`/messages/${messageId}/read`),
  markAllMessagesAsRead: (conversationId: string) => api.put(`/conversations/${conversationId}/read-all`),
};

export const notificationsAPI = {
  getNotifications: (page: number = 1, limit: number = 20) => api.get(`/notifications?page=${page}&limit=${limit}`),
  markAsRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  deleteNotification: (id: string) => api.delete(`/notifications/${id}`),
  clearAllNotifications: () => api.delete('/notifications'),
  getPreferences: () => api.get('/notifications/preferences'),
  updatePreferences: (preferences: any) => api.put('/notifications/preferences', preferences),
};

export const storiesAPI = {
  getStories: () => api.get('/stories'),
  getStoriesFeed: (params: any) => api.get('/stories/feed', { params }),
  getUserStories: (username: string) => api.get(`/stories/user/${username}`),
  createStory: (data: any) => api.post('/stories', data),
  uploadStoryMedia: (formData: FormData) => api.post('/stories/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  markStoryAsViewed: (id: string) => api.post(`/stories/${id}/view`),
  getUserHighlights: (userId?: string) => userId ? api.get(`/stories/user/${userId}/highlights`) : api.get('/stories/highlights'),
  createHighlight: (data: any) => api.post('/stories/highlights', data),
  updateHighlight: (highlightId: string, data: any) => api.put(`/stories/highlights/${highlightId}`, data),
  getHighlight: (highlightId: string) => api.get(`/stories/highlights/${highlightId}`),
  addReaction: (storyId: string, reactionType: string) => api.post(`/stories/${storyId}/reaction`, { type: reactionType }),
  removeReaction: (storyId: string) => api.delete(`/stories/${storyId}/reaction`),
  addReply: (storyId: string, replyText: string) => api.post(`/stories/${storyId}/reply`, { content: replyText }),
};

