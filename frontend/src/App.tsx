import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster, toast } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { postsAPI, reelsAPI } from './services/api';
import { useQueryClient } from '@tanstack/react-query';

import { CreatePostProvider, useCreatePost } from './contexts/CreatePostContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { StoryViewProvider } from './contexts/StoryViewContext';
import OfflineIndicator from './components/OfflineIndicator';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import HomePage from './pages/HomePage';
import NotificationsPage from './pages/NotificationsPage';
import MessagesPage from './pages/MessagesPage';
import ChatPage from './pages/ChatPage';

import StoriesPage from './pages/StoriesPage';
import ReelsPage from './pages/ReelsPage';

import ExplorePage from './pages/ExplorePage';
import SearchPage from './pages/SearchPage';
import ProfilePage from './pages/ProfilePage';
import FollowersPage from './pages/FollowersPage';
import FollowingPage from './pages/FollowingPage';
import SettingsPage from './pages/SettingsPage';
import BlockedUsersPage from './pages/BlockedUsersPage';
import PrivacySettingsPage from './pages/PrivacySettingsPage';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import TopHeader from './components/TopHeader';
import BottomNavigation from './components/BottomNavigation';
import MobileMenuDrawer from './components/MobileMenuDrawer';
import CreatePostModal from './components/CreatePostModal';

// Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppContent() {

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <CreatePostProvider>
        <InnerApp />
      </CreatePostProvider>
    </Router>
  );
}

function InnerApp() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const { isModalOpen: createPostModalOpen, closeModal: closeCreatePostModal } = useCreatePost();
  const { user, isAuthenticated } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsDesktop(width > 1024);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const isPublicPath = ['/', '/login', '/register', '/forgot-password', '/reset-password'].includes(location.pathname);

  const showNav = isAuthenticated && !isPublicPath;
  const hideTopHeader = (isMobile && location.pathname === '/reels') || location.pathname.startsWith('/messages');

  const mainStyle = {
    flexGrow: 1,
    minWidth: 0,
    width: '100%',
    transition: 'all 0.4s ease',
    marginLeft: showNav && isDesktop && sidebarOpen ? (isCollapsed ? 110 : 320) : 0,
  };

  const handlePost = async (post: any) => {
    try {
      if (post.editMode && post.editPost) {
        const formData = new FormData();
        formData.append('content', post.caption);
        if (post.media) formData.append('media', post.media);
        formData.append('tags', JSON.stringify(post.tags));
        if (post.location.trim()) {
          formData.append('location', JSON.stringify({ name: post.location }));
        }
        await postsAPI.updatePost(post.editPost._id, formData);
        toast.success('Post updated!');
        if (user?.username) queryClient.invalidateQueries({ queryKey: ['userPosts', user.username] });
        if (user?.username) queryClient.invalidateQueries({ queryKey: ['profile', user.username] });
        queryClient.invalidateQueries({ queryKey: ['feed'] });
      } else {
        const formData = new FormData();
        const language = user?.languagePreference === 'both' ? 'mixed' : (user?.languagePreference || 'english');
        formData.append('language', language);

        if (post.postType === 'reel') {
          formData.append('content', post.caption);
          if (post.media) formData.append('video', post.media);
          formData.append('hashtags', JSON.stringify(post.tags));
          if (post.location.trim()) {
            formData.append('location', JSON.stringify({ name: post.location }));
          }
          await reelsAPI.createReel(formData);
          queryClient.invalidateQueries({ queryKey: ['reels'] });
          queryClient.invalidateQueries({ queryKey: ['userReels'] });
          if (user?.username) queryClient.invalidateQueries({ queryKey: ['profile', user.username] });
        } else {
          formData.append('postType', post.postType);
          formData.append('content', post.caption);
          if (post.media) formData.append('media', post.media);
          formData.append('tags', JSON.stringify(post.tags));
          if (post.location.trim()) {
            formData.append('location', JSON.stringify({ name: post.location }));
          }
          await postsAPI.createPost(formData);
          if (user?.username) queryClient.invalidateQueries({ queryKey: ['userPosts', user.username] });
          if (user?.username) queryClient.invalidateQueries({ queryKey: ['profile', user.username] });
          queryClient.invalidateQueries({ queryKey: ['feed'] });
        }
        toast.success(`${post.postType === 'reel' ? 'Reel' : 'Post'} shared!`);
      }
      closeCreatePostModal();
    } catch (error: any) {
      console.error('Error sharing post:', error);
      toast.error(`Failed to ${post.editMode ? 'update' : 'share'} ${post.postType}`);
    }
  };

  return (
    <div className="App" style={{ display: 'flex', minHeight: '100vh' }}>
      {showNav && !hideTopHeader && <TopHeader isMobile={isMobile} drawerOpen={drawerOpen} setDrawerOpen={setDrawerOpen} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />}
      {showNav && isDesktop && sidebarOpen && <Navbar setSidebarOpen={setSidebarOpen} isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />}
      {showNav && isMobile && <BottomNavigation isMobile={isMobile} drawerOpen={drawerOpen} setDrawerOpen={setDrawerOpen} />}
      <main style={mainStyle}>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#333',
              color: '#fff',
            },
          }}
        />
        <OfflineIndicator />
        <Routes>
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          { /* public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          { /* Protected Routes */}

          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <MessagesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages/:userId"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages/group/:groupId"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stories"
            element={
              <ProtectedRoute>
                <StoriesPage isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reels"
            element={
              <ProtectedRoute>
                <ReelsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/explore"
            element={
              <ProtectedRoute>
                <ExplorePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/search"
            element={
              <ProtectedRoute>
                <SearchPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/:username"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/:username/followers"
            element={
              <ProtectedRoute>
                <FollowersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/:username/following"
            element={
              <ProtectedRoute>
                <FollowingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/change-password"
            element={
              <ProtectedRoute>
                <ChangePasswordPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/blocked-users"
            element={
              <ProtectedRoute>
                <BlockedUsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/privacy-settings"
            element={
              <ProtectedRoute>
                <PrivacySettingsPage />
              </ProtectedRoute>
            }
          />


          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {showNav && isMobile && (
        <MobileMenuDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          isMobile={isMobile}
        />
      )}
      <CreatePostModal
        open={createPostModalOpen}
        onClose={closeCreatePostModal}
        onPost={handlePost}
      />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SocketProvider>
            <StoryViewProvider>
              <ThemeProvider>
                <AppContent />
              </ThemeProvider>
            </StoryViewProvider>
          </SocketProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
