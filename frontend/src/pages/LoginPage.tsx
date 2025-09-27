import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

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

  // Custom icon components
  const PersonIcon: React.FC = () => (
    <svg className="icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="currentColor"/>
    </svg>
  );

  const LockIcon: React.FC = () => (
    <svg className="icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm3 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" fill="currentColor"/>
    </svg>
  );

  const VisibilityIcon: React.FC = () => (
    <svg className="icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/>
    </svg>
  );

  const VisibilityOffIcon: React.FC = () => (
    <svg className="icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92 1.11-1.11c1.73-4.39 6-7.5 11-7.5-1.55 0-2.91.43-4.13 1.17l.87.87C20.21 8.13 19.36 8 18.5 8c-2.76 0-5 2.24-5 5 0 .69.14 1.34.39 1.93l2.68 2.68C15.07 17.95 13.63 18 12 18c-2.76 0-5-2.24-5-5 0-.69.14-1.34.39-1.93L6.71 8.39C6.93 7.87 7.07 7.26 7.07 6.5c0-.65-.13-1.26-.36-1.83L4.79 2.76C3.06 4.11 1.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42c-1.51.54-3.16.92-4.8.92-5 0-9.27-3.11-11-7.5 1.73-4.39 6-7.5 11-7.5z" fill="currentColor"/>
      <path d="M2.1 2.1L.69 3.51l2.92 2.92C2.93 7.26 2.8 7.87 2.8 8.5c0 2.76 2.24 5 5 5 .69 0 1.34-.14 1.93-.39l2.68 2.68c-.59.25-1.24.39-1.93.39-2.76 0-5-2.24-5-5 0-.69.14-1.34.39-1.93L3.51.69 2.1 2.1zM12 7c2.76 0 5 2.24 5 5 0 .69-.14 1.34-.39 1.93l2.68 2.68c.25-.59.39-1.24.39-1.93 0-2.76-2.24-5-5-5-.69 0-1.34.14-1.93.39L12 7z" fill="currentColor"/>
    </svg>
  );

  return (
    <div style={{ height: '100vh', maxHeight: '100vh', overflow: 'hidden', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', position: 'relative', boxSizing: 'border-box' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.25)', zIndex: 1 }}></div>
      <div style={{ position: 'relative', zIndex: 2, maxWidth: '600px', margin: '0 auto', padding: '0 1rem' }}>
        <div style={{ padding: '3rem 2.5rem', borderRadius: '20px', background: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(25px) saturate(1.2)', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.3)', maxWidth: '450px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#1a1a1a', marginBottom: '0.75rem', margin: '0', letterSpacing: '-0.025em', textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }}>नाया</h1>
            <p style={{ fontSize: '1.125rem', color: '#1a1a1a', margin: '0', fontWeight: 700, lineHeight: '1.5', textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)' }}>Welcome back to The Nepali Network</p>
          </div>

          {error && (
            <div style={{ padding: '1rem', borderRadius: '8px', backgroundColor: 'rgba(255, 235, 238, 0.9)', color: '#c62828', marginBottom: '1.5rem', border: '1px solid rgba(255, 205, 210, 0.8)' }}>
              {error}
            </div>
          )}

          <form style={{ display: 'flex', flexDirection: 'column' }} onSubmit={handleSubmit(onSubmit)}>
            <div style={{ marginBottom: '1rem', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '50%', left: '0.75rem', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '2rem', height: '2rem', color: '#666', zIndex: 3, pointerEvents: 'none' }}>
                <PersonIcon />
              </div>
              <input
                type="text"
                placeholder="Email, Username, or Phone"
                autoComplete="username"
                aria-label="Email, username, or phone number"
                aria-describedby={errors.identifier ? "identifier-error" : undefined}
                aria-invalid={errors.identifier ? "true" : "false"}
                style={{ width: '100%', padding: '1.125rem 4rem 1.125rem 3rem', border: '2px solid rgba(255, 255, 255, 0.2)', borderRadius: '12px', fontSize: '1rem', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxSizing: 'border-box', background: 'rgba(255, 255, 255, 0.05)', color: '#333', position: 'relative', minHeight: '44px' }}
                {...register('identifier', {
                  required: 'Email, username, or phone is required',
                })}
              />
              {errors.identifier && (
                <div id="identifier-error" style={{ fontSize: '1rem', fontWeight: 700, color: '#1a1a1a', marginTop: '0.25rem', marginLeft: '0.75rem' }} role="alert">{errors.identifier.message}</div>
              )}
            </div>

            <div style={{ marginBottom: '1rem', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '50%', left: '0.75rem', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '2rem', height: '2rem', color: '#666', zIndex: 3, pointerEvents: 'none' }}>
                <LockIcon />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                autoComplete="current-password"
                aria-label="Password"
                aria-describedby={errors.password ? "password-error" : undefined}
                aria-invalid={errors.password ? "true" : "false"}
                style={{ width: '100%', padding: '1.125rem 4rem 1.125rem 3rem', border: '2px solid rgba(255, 255, 255, 0.2)', borderRadius: '12px', fontSize: '1rem', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxSizing: 'border-box', background: 'rgba(255, 255, 255, 0.05)', color: '#333', position: 'relative', minHeight: '44px' }}
                {...register('password', {
                  required: 'Password is required',
                })}
              />
              <div style={{ position: 'absolute', top: '50%', right: '0.75rem', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '2rem', height: '2rem', color: '#666', zIndex: 3, pointerEvents: 'none' }}>
                <button
                  type="button"
                  className="icon-button visibility-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={0}
                >
                  {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </button>
              </div>
              {errors.password && (
                <div id="password-error" style={{ fontSize: '1rem', fontWeight: 700, color: '#1a1a1a', marginTop: '0.25rem', marginLeft: '0.75rem' }} role="alert">{errors.password.message}</div>
              )}
            </div>

            <button
              type="submit"
              className="login-button"
              disabled={loading}
              style={{ padding: '1rem 2rem', border: 'none', borderRadius: '12px', background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%)', color: 'white', fontSize: '1.125rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.3s ease', marginTop: '2rem', marginBottom: '1rem', boxShadow: '0 4px 15px rgba(255, 107, 53, 0.3)', position: 'relative', overflow: 'hidden' }}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <p style={{ margin: '0.5rem 0', fontSize: '0.875rem', color: '#1a1a1a' }}>
                Don't have an account?{' '}
                <RouterLink to="/register" className="login-link" style={{ color: '#845340', textDecoration: 'none', fontWeight: 'bold', transition: 'color 0.3s ease' }}>
                  Sign up here
                </RouterLink>
              </p>
              <RouterLink to="/forgot-password" className="forgot-password-link" style={{ fontSize: '0.9rem', color: '#1a1a1a', textDecoration: 'none', transition: 'color 0.3s ease' }}>
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
