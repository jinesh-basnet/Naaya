import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import logo from '../assets/logo.png';
import './LoginPage.css';

interface LoginFormData {
  identifier: string;
  password: string;
}

const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setError('');

    try {
      await login(data.identifier, data.password);
      toast.success('Welcome back to नाया!');
      navigate('/home');
    } catch (error: any) {
      setError(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = () => {
    if (error) setError('');
  };

  return (
    <div className="login-page">
      {/* Left Visual Side (Desktop) */}
      <div className="login-visual-side">
        <div className="visual-content">
          <h1 className="visual-title">Connect. Share. Engage.</h1>
          <p className="visual-subtitle">
            Join the vibrant community of The Nepali Network. Discover stories, friends, and moments that matter.
          </p>
        </div>
      </div>

      {/* Right Form Side */}
      <div className="login-form-side">
        <div className="login-form-container">
          <div className="login-header">
            <img src={logo} alt="Naaya Logo" className="brand-logo" />
            <h1 className="app-name">नाया</h1>
            <p className="login-welcome">Log in to see photos and videos from your friends.</p>
          </div>

          {error && <div className="error-message">{error}</div>}

          <form className="login-form" onSubmit={handleSubmit(onSubmit)}>
            <div className="input-group">
              <input
                type="text"
                className="login-input"
                placeholder="Phone number, username, or email"
                autoComplete="username"
                {...register('identifier', {
                  required: 'This field is required',
                  onChange: handleInputChange,
                })}
              />
            </div>

            <div className="input-group">
              <input
                type={showPassword ? 'text' : 'password'}
                className="login-input"
                placeholder="Password"
                autoComplete="current-password"
                {...register('password', {
                  required: 'Password is required',
                  onChange: handleInputChange,
                })}
              />
              <button
                type="button"
                className="input-icon-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? 'Logging In...' : 'Log In'}
            </button>

            <div className="divider">OR</div>

            <RouterLink to="/forgot-password" className="forgot-password-link">
              Forgot password?
            </RouterLink>
          </form>

          <div className="signup-box">
            Don't have an account?
            <RouterLink to="/register" className="signup-link">Sign up</RouterLink>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
