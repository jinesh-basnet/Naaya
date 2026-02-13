import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api` : '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

const memoryStorage: { [key: string]: string | null } = {};

const isLocalStorageAvailable = () => {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
};

const getStoredToken = () => {
  const localStorageAvailable = isLocalStorageAvailable();

  if (localStorageAvailable) {
    return localStorage.getItem('token');
  } else {
    return memoryStorage['token'] || null;
  }
};

api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (!(config.data instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json';
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
      window.location.href = '/login';
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

  refreshToken: () =>
    api.post('/auth/refresh'),

  logout: () =>
    api.post('/auth/logout'),
};

export const postsAPI = {
  createPost: (postData: any) => {
    if (postData instanceof FormData) {
      return api.post('/posts', postData);
    }
    return api.post('/posts', postData);
  },

  getFeed: (feedType: string = 'fyp', page: number = 1, limit: number = 10) =>
    api.get(`/posts/feed?feedType=${feedType}&page=${page}&limit=${limit}`),

  getCombinedFeed: (page: number = 1, limit: number = 20) =>
    api.get(`/feed/simple?page=${page}&limit=${limit}`),

  getPost: (postId: string) =>
    api.get(`/posts/${postId}`),

  getComments: (postId: string, page: number = 1, limit: number = 20) =>
    api.get(`/posts/${postId}/comments?page=${page}&limit=${limit}`),

  likePost: (postId: string) =>
    api.post(`/posts/${postId}/like`),

  savePost: (postId: string) =>
    api.post(`/posts/${postId}/save`),

  addComment: (postId: string, content: string) =>
    api.post(`/posts/${postId}/comment`, { content }),

  sharePost: (postId: string, data?: { caption?: string; tags?: string; location?: string }) =>
    api.post(`/posts/${postId}/share`, data),

  replyToComment: (postId: string, commentId: string, content: string) =>
    api.post(`/posts/${postId}/comments/${commentId}/reply`, { content }),

  replyToReply: (postId: string, replyId: string, content: string) =>
    api.post(`/posts/${postId}/replies/${replyId}/reply`, { content }),

  likeReply: (postId: string, replyId: string) =>
    api.post(`/posts/${postId}/replies/${replyId}/like`),

  updatePost: (postId: string, postData: any) => {
    if (postData instanceof FormData) {
      return api.put(`/posts/${postId}`, postData);
    }
    return api.put(`/posts/${postId}`, postData);
  },

  deletePost: (postId: string) =>
    api.delete(`/posts/${postId}`),

  getUserPosts: (username: string, page: number = 1, limit: number = 10) =>
    api.get(`/posts/user/${username}?page=${page}&limit=${limit}`),

  getUserBookmarks: (page: number = 1, limit: number = 10) =>
    api.get(`/posts/saved?page=${page}&limit=${limit}`),

  searchPosts: (query: string, page: number = 1, limit: number = 20) =>
    api.get(`/posts/search?q=${query}&page=${page}&limit=${limit}`),
};

export const usersAPI = {
  getProfile: (username: string) =>
    api.get(`/users/profile/${username}`),

  updateProfile: (userData: any) =>
    api.put('/users/profile', userData),

  followUser: (userId: string) =>
    api.post(`/users/${userId}/follow`),

  unfollowUser: (userId: string) =>
    api.post(`/users/${userId}/unfollow`),

  getFollowers: (username: string, page: number = 1, limit: number = 20) =>
    api.get(`/users/followers/${username}?page=${page}&limit=${limit}`),

  getFollowing: (username: string, page: number = 1, limit: number = 20) =>
    api.get(`/users/following/${username}?page=${page}&limit=${limit}`),

  getSuggestions: (limit: number = 10) =>
    api.get(`/users/suggestions?limit=${limit}`),

  searchUsers: (query: string, page: number = 1, limit: number = 20) =>
    api.get(`/users/search?q=${query}&page=${page}&limit=${limit}`),

  updatePrivacy: (privacySettings: any) =>
    api.put('/users/privacy', { privacySettings }),
};

export const storiesAPI = {
  uploadStoryMedia: (formData: FormData) =>
    api.post('/stories/upload', formData),

  createStory: (storyData: any) =>
    api.post('/stories', storyData),

  getStoriesFeed: (options: { sort?: string; includeViewStatus?: boolean } = {}) => {
    const params = new URLSearchParams();
    if (options.sort) params.append('sort', options.sort);
    if (options.includeViewStatus) params.append('include_view_status', 'true');
    return api.get(`/stories?${params.toString()}`);
  },

  getStory: (storyId: string) =>
    api.get(`/stories/${storyId}`),

  addReaction: (storyId: string, type: string) =>
    api.post(`/stories/${storyId}/reaction`, { type }),

  removeReaction: (storyId: string) =>
    api.delete(`/stories/${storyId}/reaction`),

  addReply: (storyId: string, content: string) =>
    api.post(`/stories/${storyId}/reply`, { content }),

  deleteStory: (storyId: string) =>
    api.delete(`/stories/${storyId}`),

  getUserStories: (username: string) =>
    api.get(`/stories/user/${username}`),

  createPollStory: (pollData: any) =>
    api.post('/stories/poll', pollData),

  voteOnPoll: (storyId: string, option: number) =>
    api.post(`/stories/${storyId}/vote`, { option }),

  getUserHighlights: () =>
    api.get('/stories/highlights'),

  createHighlight: (highlightData: any) =>
    api.post('/stories/highlights', highlightData),

  getHighlight: (highlightId: string) =>
    api.get(`/stories/highlights/${highlightId}`),

  updateHighlight: (highlightId: string, updateData: any) =>
    api.put(`/stories/highlights/${highlightId}`, updateData),

  deleteHighlight: (highlightId: string) =>
    api.delete(`/stories/highlights/${highlightId}`),

  markStoryAsViewed: (storyId: string) =>
    api.post(`/stories/${storyId}/view`),
};



export const reelsAPI = {
  createReel: (formData: FormData) =>
    api.post('/reels', formData),

  getFeed: (page: number = 1, limit: number = 8) =>
    api.get(`/reels/feed?page=${page}&limit=${limit}`),

  getReel: (reelId: string) =>
    api.get(`/reels/${reelId}`),

  likeReel: (reelId: string) =>
    api.post(`/reels/${reelId}/like`),

  commentReel: (reelId: string, content: string) =>
    api.post(`/reels/${reelId}/comment`, { content }),

  saveReel: (reelId: string) =>
    api.post(`/reels/${reelId}/save`),

  getUserReels: (userId: string, page: number = 1, limit: number = 10) =>
    api.get(`/reels/user/${userId}?page=${page}&limit=${limit}`),

  getSavedReels: (page: number = 1, limit: number = 10) =>
    api.get(`/reels/saved?page=${page}&limit=${limit}`),

  searchReels: (query: string, page: number = 1, limit: number = 20) =>
    api.get(`/reels/search?q=${query}&page=${page}&limit=${limit}`),

  getReelComments: (reelId: string, page: number = 1, limit: number = 20) =>
    api.get(`/reels/${reelId}/comments?page=${page}&limit=${limit}`),

  replyToComment: (reelId: string, commentId: string, content: string) =>
    api.post(`/reels/${reelId}/comments/${commentId}/reply`, { content }),

  likeReply: (reelId: string, replyId: string) =>
    api.post(`/reels/${reelId}/replies/${replyId}/like`),

  replyToReply: (reelId: string, replyId: string, content: string) =>
    api.post(`/reels/${reelId}/replies/${replyId}/reply`, { content }),

  deleteReel: (reelId: string) =>
    api.delete(`/reels/${reelId}`),
};

export const bookmarkCollectionsAPI = {
  getCollections: () =>
    api.get('/bookmark-collections'),

  createCollection: (name: string) =>
    api.post('/bookmark-collections', { name }),

  updateCollection: (collectionId: string, name: string) =>
    api.put(`/bookmark-collections/${collectionId}`, { name }),

  deleteCollection: (collectionId: string) =>
    api.delete(`/bookmark-collections/${collectionId}`),

  addPostToCollection: (collectionId: string, postId: string) =>
    api.post(`/bookmark-collections/${collectionId}/posts/${postId}`),

  removePostFromCollection: (collectionId: string, postId: string) =>
    api.delete(`/bookmark-collections/${collectionId}/posts/${postId}`),
};

export const notificationsAPI = {
  getPreferences: () =>
    api.get('/notifications/preferences'),

  updatePreferences: (preferences: any) =>
    api.put('/notifications/preferences', { preferences }),

  getNotifications: (page: number = 1, limit: number = 20) =>
    api.get(`/notifications?page=${page}&limit=${limit}`),

  markAsRead: (notificationId: string) =>
    api.put(`/notifications/${notificationId}/read`),

  markAllAsRead: () =>
    api.put('/notifications/read-all'),

  getUnreadCount: () =>
    api.get('/notifications/unread-count'),
};

export const messagesAPI = {
  getConversations: () =>
    api.get('/conversations'),

  getConversation: (conversationId: string) =>
    api.get(`/conversations/${conversationId}`),

  getConversationByUserId: (userId: string) =>
    api.get(`/conversations/user/${userId}`),

  getMessages: (userId: string) =>
    api.get(`/messages/${userId}`),

  getConversationMessages: (conversationId: string) =>
    api.get(`/messages/conversation/${conversationId}`),

  sendMessage: (conversationId: string, content: string, messageType: string = 'text', replyTo?: string) =>
    api.post('/messages', { conversationId, content, messageType, replyTo }),

  addReaction: (messageId: string, emoji: string) =>
    api.post(`/messages/${messageId}/reaction`, { emoji }),

  removeReaction: (messageId: string, emoji: string) =>
    api.delete(`/messages/${messageId}/reaction`),

  editMessage: (messageId: string, content: string) =>
    api.put(`/messages/${messageId}`, { content }),

  deleteMessage: (messageId: string) =>
    api.delete(`/messages/${messageId}`),

  markMessageAsRead: (messageId: string) =>
    api.put(`/messages/${messageId}/read`),

  markMessageAsSeen: (messageId: string) =>
    api.put(`/messages/${messageId}/seen`),

  forwardMessage: (messageId: string, receiverId: string) =>
    api.post(`/messages/${messageId}/forward`, { receiverId }),
};

export default api;
