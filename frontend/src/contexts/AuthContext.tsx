import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { api } from '../services/api';
import { pushNotificationService } from '../services/pushNotificationService';

interface User {
  _id: string;
  username: string;
  fullName: string;
  email: string;
  profilePicture: string;
  bio: string;
  location: {
    city: string;
    district: string;
    province: string;
  };
  languagePreference: 'nepali' | 'english' | 'both';
  isVerified: boolean;
  isBusiness: boolean;
  followers: string[];
  following: string[];
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  location?: {
    city: string;
    district: string;
    province: string;
  };
  languagePreference?: 'nepali' | 'english' | 'both';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const getStoredToken = React.useCallback(() => {
    return localStorage.getItem('token');
  }, []);

  const setStoredToken = React.useCallback((token: string | null) => {
    if (token && token.length > 0) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, []);

  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [loading, setLoading] = useState(true);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) {
      return;
    }

    const initAuth = async () => {
      hasInitialized.current = true;
      const storedToken = getStoredToken();

      if (storedToken) {
        try {
          const response = await api.get('/auth/me', {
            headers: {
              Authorization: `Bearer ${storedToken}`,
            },
          });
          setUser(response.data.user);
          if (storedToken) {
            try {
              await pushNotificationService.init();
              const permission = await pushNotificationService.requestPermission();
              if (permission === 'granted') {
                await pushNotificationService.subscribeToPush();
              }
            } catch (pushError) {
              console.error('Push notification initialization error:', pushError);
            }
          }
        } catch (error: any) {
          console.error('Auth initialization error:', error);
          setStoredToken(null);
          setToken(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [getStoredToken, setStoredToken]);

  const login = async (identifier: string, password: string) => {
    try {
      const response = await api.post('/auth/login', {
        identifier,
        password,
      });

      const { token: newToken, user: userData } = response.data;

      if (!newToken || newToken.length === 0) {
        console.error('Received empty or invalid token');
        throw new Error('Invalid token received from server');
      }

      setStoredToken(newToken);
      setToken(newToken);
      setUser(userData);
    } catch (error: any) {
      console.error('Login failed:', error);
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      const response = await api.post('/auth/register', userData);

      const { token: newToken, user: newUser } = response.data;

      setStoredToken(newToken);
      setToken(newToken);
      setUser(newUser);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  };

  const logout = () => {
    setStoredToken(null);
    setToken(null);
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    loading,
    isAuthenticated: !!user && !!token,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
