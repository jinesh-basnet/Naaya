import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';

import { CreatePostProvider } from './contexts/CreatePostContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { StoryViewProvider } from './contexts/StoryViewContext';
import OfflineIndicator from './components/OfflineIndicator';
import ErrorBoundary from './components/ErrorBoundary';
import appLogo from './assets/logo.png';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import HomePage from './pages/HomePage';
import NotificationsPage from './pages/NotificationsPage';


import StoriesPage from './pages/StoriesPage';
import ReelsPage from './pages/ReelsPage';

import ExplorePage from './pages/ExplorePage';
import SearchPage from './pages/SearchPage';
import ProfilePage from './pages/ProfilePage';
import FollowersPage from './pages/FollowersPage';
import FollowingPage from './pages/FollowingPage';
import SettingsPage from './pages/SettingsPage';

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
  const { isAuthenticated } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [createPostModalOpen, setCreatePostModalOpen] = useState(false);

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
  const hideTopHeaderOnReels = isMobile && location.pathname === '/reels';

  const mainStyle = {
    flexGrow: 1,
    padding: hideTopHeaderOnReels ? '0 0 80px' : '76px 16px 80px',
    marginLeft: showNav && isDesktop && sidebarOpen ? (isCollapsed ? 70 : 280) : 0,
  };

  const logoLeft = showNav && isDesktop && sidebarOpen ? (isCollapsed ? 70 : 280) : 0;

  const openCreatePostModal = () => {
    setCreatePostModalOpen(true);
    setDrawerOpen(false);
  };

  const closeCreatePostModal = () => {
    setCreatePostModalOpen(false);
  };

  const handlePost = (post: any) => {
    console.log('Post submitted:', post);
    closeCreatePostModal();
  };

  return (
    <div className="App" style={{ display: 'flex', minHeight: '100vh' }}>
      {showNav && !hideTopHeaderOnReels && <TopHeader isMobile={isMobile} drawerOpen={drawerOpen} setDrawerOpen={setDrawerOpen} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />}
      {showNav && isDesktop && sidebarOpen && <Navbar setSidebarOpen={setSidebarOpen} isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />}
      {showNav && isDesktop && (
        <img
          src={appLogo}
          alt="Naaya Logo"
          style={{
            position: 'fixed',
            top: 16,
            left: `${logoLeft}px`,
            width: 50,
            height: 50,
            transition: 'left 0.3s ease',
            zIndex: 1100,
            cursor: 'pointer',
          }}
          onClick={() => window.location.assign('/home')}
          role="button"
          tabIndex={0}
          aria-label="Naaya logo, go to home"
        />
      )}
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
        { /* public Routes */ }
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        { /* Protected Routes */ }

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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </main>
      {showNav && isMobile && (
        <MobileMenuDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          isMobile={isMobile}
          openCreatePostModal={openCreatePostModal}
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
