import React, { useState } from 'react';
import { FaEnvelope, FaArrowLeft } from 'react-icons/fa';
import { useForm } from 'react-hook-form';
import { Link as RouterLink } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import './ForgotPasswordPage.css';

interface ForgotPasswordForm {
  email: string;
}

const ForgotPasswordPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>();

  const onSubmit = async (data: ForgotPasswordForm) => {
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await api.post('/password-reset/request', { email: data.email });

      if (response.data.success) {
        setSuccess(true);
        toast.success('Password reset link sent to your email!');
      } else {
        setError(response.data.message || 'Failed to send reset link');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to send reset link';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="forgot-password-container">
        <div className="forgot-password-paper">
          <div className="forgot-password-header">
            <FaEnvelope className="success-icon" />
            <h1 className="success-title">Check Your Email</h1>
            <p className="success-text">
              We've sent a password reset link to your email address.
              Please check your inbox and follow the instructions to reset your password.
            </p>
            <div className="alert alert-info">
              <strong>Note:</strong> The reset link will expire in 10 minutes for security reasons.
            </div>
          </div>

          <div className="success-actions">
            <RouterLink to="/login" className="btn btn-outlined">
              <FaArrowLeft />
              Back to Login
            </RouterLink>
            <button
              type="button"
              className="btn btn-text"
              onClick={() => setSuccess(false)}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-paper">
        <div className="forgot-password-header">
          <h1 className="forgot-password-title">Forgot Password?</h1>
          <p className="forgot-password-subtitle">
            Don't worry! Enter your email address and we'll send you a reset link.
          </p>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className={`form-input ${errors.email ? 'error' : ''}`}
              {...register('email', {
                required: 'Email address is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Please enter a valid email address',
                },
              })}
              disabled={loading}
            />
            {errors.email && (
              <div className="form-helper-text error">
                {errors.email.message}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-contained"
            disabled={loading}
          >
            {loading ? (
              <div className="spinner"></div>
            ) : (
              'Send Reset Link'
            )}
          </button>

          <RouterLink to="/login" className="back-link">
            <FaArrowLeft />
            Back to Login
          </RouterLink>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
