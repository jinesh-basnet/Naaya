import React, { useState, useEffect } from 'react';
import { MdLock, MdVisibility, MdVisibilityOff, MdArrowBack, MdCheckCircle } from 'react-icons/md';
import './ResetPasswordPage.css';
import { useForm } from 'react-hook-form';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

interface ResetPasswordForm {
  newPassword: string;
  confirmPassword: string;
}

const ResetPasswordPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [searchParams] = useSearchParams();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordForm>();

  const newPassword = watch('newPassword');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('Invalid reset link. Please request a new password reset.');
      setVerifying(false);
      return;
    }

    // Verify token
    const verifyToken = async () => {
      try {
        const response = await api.post('/password-reset/verify', {
          token,
        });

        if (response.data.success) {
          setTokenValid(true);
        } else {
          setError('Invalid or expired reset link. Please request a new password reset.');
        }
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || 'Invalid or expired reset link';
        setError(errorMessage);
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [searchParams]);

  const onSubmit = async (data: ResetPasswordForm) => {
    if (data.newPassword !== data.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = searchParams.get('token');
      const response = await api.post('/password-reset/reset', {
        token,
        newPassword: data.newPassword,
      });

      if (response.data.success) {
        setSuccess(true);
        toast.success('Password reset successfully!');
      } else {
        setError(response.data.message || 'Failed to reset password');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to reset password';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="verifying-container">
        <div className="verifying-paper">
          <div className="verifying-spinner"></div>
          <h6 className="verifying-title">Verifying Reset Link...</h6>
          <p className="verifying-subtitle">Please wait while we verify your password reset link.</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="reset-container">
        <div className="form-container">
          <div className="form-paper">
            <div className="form-header">
              <MdCheckCircle className="success-icon" />
              <h1>Password Reset Successful!</h1>
              <p>Your password has been successfully reset. You can now log in with your new password.</p>
            </div>
            <RouterLink to="/login" className="btn btn-primary btn-large">
              Go to Login
            </RouterLink>
          </div>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="invalid-container">
        <div className="invalid-paper">
          <h1 className="invalid-title">Invalid Reset Link</h1>
          <div className="alert alert-error">{error}</div>
          <p>The password reset link is invalid or has expired. Please request a new password reset.</p>
          <div className="btn-group">
            <RouterLink to="/forgot-password" className="btn btn-primary btn-large">
              Request New Reset Link
            </RouterLink>
            <RouterLink to="/login" className="btn btn-secondary btn-large">
              <MdArrowBack /> Back to Login
            </RouterLink>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-container">
      <div className="form-container">
        <div className="form-paper">
          <div className="form-header">
            <h1 className="form-title">Reset Your Password</h1>
            <p className="form-subtitle">Enter your new password below. Make sure it's secure and easy for you to remember.</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="form-group">
              <div className="input-wrapper">
                <label className="input-label">New Password</label>
                <div className="input-adorn-start">
                  <MdLock />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`input-field ${errors.newPassword ? 'error' : ''}`}
                  {...register('newPassword', {
                    required: 'New password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters long',
                    },
                  })}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="input-adorn-end"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <MdVisibilityOff /> : <MdVisibility />}
                </button>
              </div>
              {errors.newPassword && <span className="input-helper">{errors.newPassword.message}</span>}
            </div>

            <div className="form-group">
              <div className="input-wrapper">
                <label className="input-label">Confirm New Password</label>
                <div className="input-adorn-start">
                  <MdLock />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className={`input-field ${errors.confirmPassword ? 'error' : ''}`}
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: (value: string) =>
                      value === newPassword || 'Passwords do not match',
                  })}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="input-adorn-end"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <MdVisibilityOff /> : <MdVisibility />}
                </button>
              </div>
              {errors.confirmPassword && <span className="input-helper">{errors.confirmPassword.message}</span>}
            </div>

            <button
              type="submit"
              className={`btn btn-primary btn-large ${loading ? 'disabled' : ''}`}
              disabled={loading}
            >
              {loading && <div className="spinner"></div>}
              Reset Password
            </button>

            <RouterLink to="/login" className="link link-small">
              <MdArrowBack /> Back to Login
            </RouterLink>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
