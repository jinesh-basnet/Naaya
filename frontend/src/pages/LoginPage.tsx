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
    if (error) {
      setError('');
    }
  };

  return (
    <div className="login-page">
      <div className="login-overlay"></div>
      <div className="login-container">
        <div className="login-paper">
          <div className="login-header">
            <img src={logo} alt="Logo" className="login-logo" />
            <h1 className="login-title">नाया</h1>
            <p className="login-subtitle">Welcome back to The Nepali Network</p>
          </div>

          {error && (
            <div className="login-alert">
              {error}
            </div>
          )}

          <form className="login-form" onSubmit={handleSubmit(onSubmit)}>
            <div className="login-input-container">
              <div className="login-input-adornment">
                <div className="icon-person"></div>
              </div>
              <input
                type="text"
                placeholder="Email, Username, or Phone"
                autoComplete="username"
                aria-label="Email, username, or phone number"
                aria-describedby={errors.identifier ? "identifier-error" : undefined}
                aria-invalid={errors.identifier ? "true" : "false"}
                className="login-input"
                {...register('identifier', {
                  required: 'Email, username, or phone is required',
                  onChange: handleInputChange,
                })}
              />
              {errors.identifier && (
                <div id="identifier-error" className="login-helper-text" role="alert">{errors.identifier.message}</div>
              )}
            </div>

            <div className="login-input-container">
              <div className="login-input-adornment">
                <div className="icon-lock"></div>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                autoComplete="current-password"
                aria-label="Password"
                aria-describedby={errors.password ? "password-error" : undefined}
                aria-invalid={errors.password ? "true" : "false"}
                className="login-input"
                {...register('password', {
                  required: 'Password is required',
                  onChange: handleInputChange,
                })}
              />
              <div className="login-input-adornment right">
                <button
                  type="button"
                  className={`icon-button visibility-toggle ${showPassword ? 'icon-visibility-off' : 'icon-visibility'}`}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={0}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {errors.password && (
                <div id="password-error" className="login-helper-text" role="alert">{errors.password.message}</div>
              )}
            </div>

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>

            <div className="login-links">
              <p className="login-link-text">
                Don't have an account?{' '}
                <RouterLink to="/register" className="login-link">
                  Sign up here
                </RouterLink>
              </p>
              <RouterLink to="/forgot-password" className="forgot-password-link">
                Forgot your password?
              </RouterLink>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
