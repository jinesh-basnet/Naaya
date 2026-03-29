import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster, toast } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { postsAPI } from './services/api';
import { useQueryClient } from '@tanstack/react-query';

import { CreatePostProvider, useCreatePost } from './contexts/CreatePostContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { StoryViewProvider } from './contexts/StoryViewContext';
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
    <Router>
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
  const { isAuthenticated } = useAuth();
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
      const formData = new FormData();
      if (post.caption) formData.append('content', post.caption);
      if (post.media) formData.append('media', post.media);
      if (post.location) formData.append('location', post.location);
      if (post.tags && post.tags.length > 0) formData.append('tags', JSON.stringify(post.tags));
      if (post.hashtags && post.hashtags.length > 0) formData.append('hashtags', JSON.stringify(post.hashtags));
      if (post.mentions && post.mentions.length > 0) formData.append('mentions', JSON.stringify(post.mentions));
      if (post.language) formData.append('language', post.language);
      if (post.visibility) formData.append('visibility', post.visibility);
      if (post.postType) formData.append('postType', post.postType);
      
      await postsAPI.createPost(formData);
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      toast.success('Post shared!');
      closeCreatePostModal();
    } catch (err) {
      console.error(err);
      toast.error('Failed to post');
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
            path="/messages/conversation/:conversationId"
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
