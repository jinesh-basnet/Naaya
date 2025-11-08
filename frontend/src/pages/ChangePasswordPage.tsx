import React, { useState } from 'react';
import { FaLock, FaEye, FaEyeSlash, FaArrowLeft, FaCheckCircle } from 'react-icons/fa';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import './ChangePasswordPage.css';

interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const ChangePasswordPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ChangePasswordForm>();

  const newPassword = watch('newPassword');

  const onSubmit = async (data: ChangePasswordForm) => {
    if (data.newPassword !== data.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (data.currentPassword === data.newPassword) {
      setError('New password must be different from current password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/password-reset/change', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      if (response.data.success) {
        setSuccess(true);
        toast.success('Password changed successfully!');
      } else {
        setError(response.data.message || 'Failed to change password');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to change password';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="success-page">
        <div className="change-password-container">
          <div className="success-paper">
            <div style={{ marginBottom: '1.5rem' }}>
              <FaCheckCircle className="success-icon" />
              <h1 className="success-title">Password Changed Successfully!</h1>
              <p className="success-message">
                Your password has been updated successfully. You can continue using your account with the new password.
              </p>
            </div>

            <button
              className="continue-button"
              onClick={() => navigate('/home')}
            >
              Continue to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="change-password-page">
      <div className="change-password-container">
        <div className="change-password-paper">
          <div className="change-password-header">
            <h1 className="change-password-title">Change Password</h1>
            <p className="change-password-subtitle">
              Update your password to keep your account secure. Make sure to use a strong password.
            </p>
          </div>

          {error && (
            <div className="error-alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="form-group">
              <div className="input-wrapper">
                <span className="input-adornment">
                  <FaLock />
                </span>
                <input
                  className={`input-field with-start-adornment with-end-adornment ${errors.currentPassword ? 'error' : ''}`}
                  type={showCurrentPassword ? 'text' : 'password'}
                  placeholder="Current Password"
                  {...register('currentPassword', {
                    required: 'Current password is required',
                  })}
                  disabled={loading}
                />
                <span className="input-adornment end">
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </span>
              </div>
              {errors.currentPassword && (
                <div className="helper-text error">{errors.currentPassword.message}</div>
              )}
            </div>

            <div className="form-group">
              <div className="input-wrapper">
                <span className="input-adornment">
                  <FaLock />
                </span>
                <input
                  className={`input-field with-start-adornment with-end-adornment ${errors.newPassword ? 'error' : ''}`}
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="New Password"
                  {...register('newPassword', {
                    required: 'New password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters long',
                    },
                  })}
                  disabled={loading}
                />
                <span className="input-adornment end">
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </span>
              </div>
              {errors.newPassword && ( 
                <div className="helper-text error">{errors.newPassword.message}</div>
              )}
            </div>

            <div className="form-group">
              <div className="input-wrapper">
                <span className="input-adornment">
                  <FaLock />
                </span>
                <input
                  className={`input-field with-start-adornment with-end-adornment ${errors.confirmPassword ? 'error' : ''}`}
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm New Password"
                  {...register('confirmPassword', {
                    required: 'Please confirm your new password',
                    validate: (value: string) =>
                      value === newPassword || 'Passwords do not match',
                  })}
                  disabled={loading}
                />
                <span className="input-adornment end">
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </span>
              </div>
              {errors.confirmPassword && (
                <div className="helper-text error">{errors.confirmPassword.message}</div>
              )}
            </div>

            <button
              type="submit"
              className="submit-button"
              disabled={loading}
            >
              <div className="button-content">
                {loading && <div className="loading-spinner"></div>}
                Change Password
              </div>
            </button>

            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button
                type="button"
                className="back-button"
                onClick={() => navigate('/home')}
              >
                <FaArrowLeft style={{ marginRight: '0.5rem' }} />
                Back to Home
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
