import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import OfflineIndicator from './components/OfflineIndicator';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import HomePage from './pages/HomePage';
import NotificationsPage from './pages/NotificationsPage';

import MessagesPage from './pages/MessagesPage';
import StoriesPage from './pages/StoriesPage';
import ReelsPage from './pages/ReelsPage';
import CivicPage from './pages/CivicPage';
import ExplorePage from './pages/ExplorePage';
import CreatePostPage from './pages/CreatePostPage';
import ProfilePage from './pages/ProfilePage';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

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
  // Removed push notification initialization from here to avoid multiple registrations

  return (
    <Router>
      <InnerApp />
    </Router>
  );
}

function InnerApp() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  return (
    <div className="App" style={{ display: 'flex', minHeight: '100vh' }}>
      {location.pathname !== '/login' && location.pathname !== '/register' && location.pathname !== '/' && isAuthenticated && <Navbar />}
      <main style={{ flexGrow: 1, padding: 16, marginLeft: (location.pathname !== '/login' && location.pathname !== '/register' && location.pathname !== '/' && isAuthenticated) ? 280 : 0 }}>
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
        <OfflineIndicator showAsAlert />
        <Routes>
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected Routes */}
        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <MessagesPage />
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
              <StoriesPage />
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
          path="/civic"
          element={
            <ProtectedRoute>
              <CivicPage />
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
          path="/create"
          element={
            <ProtectedRoute>
              <CreatePostPage />
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
          path="/change-password"
          element={
            <ProtectedRoute>
              <ChangePasswordPage />
            </ProtectedRoute>
          }
        />

        {/* Redirect to home for authenticated users */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SocketProvider>
            <AppContent />
          </SocketProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
