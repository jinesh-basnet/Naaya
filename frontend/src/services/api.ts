import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Fallback in-memory storage for when localStorage is not available
const memoryStorage: { [key: string]: string | null } = {};

// Check if localStorage is available
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

// Get token from storage (localStorage or fallback)
const getStoredToken = () => {
  const localStorageAvailable = isLocalStorageAvailable();

  if (localStorageAvailable) {
    return localStorage.getItem('token');
  } else {
    return memoryStorage['token'] || null;
  }
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
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

// Posts API
export const postsAPI = {
  createPost: (postData: any) => {
    if (postData instanceof FormData) {
      return api.post('/posts', postData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
    return api.post('/posts', postData);
  },
  
  getFeed: (feedType: string = 'fyp', page: number = 1, limit: number = 10) =>
    api.get(`/posts/feed?feedType=${feedType}&page=${page}&limit=${limit}`),
  
  getPost: (postId: string) =>
    api.get(`/posts/${postId}`),
  
  likePost: (postId: string) =>
    api.post(`/posts/${postId}/like`),
  
  savePost: (postId: string) =>
    api.post(`/posts/${postId}/save`),
  
  addComment: (postId: string, content: string) =>
    api.post(`/posts/${postId}/comment`, { content }),
  
  deletePost: (postId: string) =>
    api.delete(`/posts/${postId}`),
  
  getUserPosts: (username: string, page: number = 1, limit: number = 10) =>
    api.get(`/posts/user/${username}?page=${page}&limit=${limit}`),
  
  searchPosts: (query: string, page: number = 1, limit: number = 20) =>
    api.get(`/posts/search?q=${query}&page=${page}&limit=${limit}`),
};

// Users API
export const usersAPI = {
  getProfile: (username: string) =>
    api.get(`/users/profile/${username}`),
  
  updateProfile: (userData: any) =>
    api.put('/users/profile', userData),
  
  followUser: (userId: string) =>
    api.post(`/users/follow/${userId}`),
  
  unfollowUser: (userId: string) =>
    api.post(`/users/unfollow/${userId}`),
  
  getFollowers: (userId: string, page: number = 1, limit: number = 20) =>
    api.get(`/users/followers/${userId}?page=${page}&limit=${limit}`),
  
  getFollowing: (userId: string, page: number = 1, limit: number = 20) =>
    api.get(`/users/following/${userId}?page=${page}&limit=${limit}`),
  
  getSuggestions: (limit: number = 10) =>
    api.get(`/users/suggestions?limit=${limit}`),
  
  searchUsers: (query: string, page: number = 1, limit: number = 20) =>
    api.get(`/users/search?q=${query}&page=${page}&limit=${limit}`),
  
  updatePrivacy: (privacySettings: any) =>
    api.put('/users/privacy', { privacySettings }),
};

// Stories API
export const storiesAPI = {
  uploadStoryMedia: (formData: FormData) =>
    api.post('/stories/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),

  createStory: (storyData: any) =>
    api.post('/stories', storyData),

  getStoriesFeed: () =>
    api.get('/stories'),
  
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
  
  getUserStories: (userId: string) =>
    api.get(`/stories/user/${userId}`),
  
  createPollStory: (pollData: any) =>
    api.post('/stories/poll', pollData),
  
  voteOnPoll: (storyId: string, option: number) =>
    api.post(`/stories/${storyId}/vote`, { option }),
};

// Messages API
export const messagesAPI = {
  sendMessage: (messageData: any) =>
    api.post('/messages', messageData),
  
  getConversations: (page: number = 1, limit: number = 20) =>
    api.get(`/messages/conversations?page=${page}&limit=${limit}`),
  
  getMessages: (userId: string, page: number = 1, limit: number = 50) =>
    api.get(`/messages/${userId}?page=${page}&limit=${limit}`),
  
  markAsRead: (messageId: string) =>
    api.put(`/messages/${messageId}/read`),
  
  addReaction: (messageId: string, emoji: string) =>
    api.post(`/messages/${messageId}/reaction`, { emoji }),
  
  removeReaction: (messageId: string) =>
    api.delete(`/messages/${messageId}/reaction`),
  
  editMessage: (messageId: string, content: string) =>
    api.put(`/messages/${messageId}`, { content }),
  
  deleteMessage: (messageId: string) =>
    api.delete(`/messages/${messageId}`),
  
  forwardMessage: (messageId: string, receiver: string) =>
    api.post(`/messages/${messageId}/forward`, { receiver }),
};

// Reels API
export const reelsAPI = {
  createReel: (formData: FormData) =>
    api.post('/reels', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),

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
};

// Bookmark Collections API
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

export default api;
