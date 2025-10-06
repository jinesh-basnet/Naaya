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

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>();

  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const onSubmit = async (data: ForgotPasswordForm) => {
    setLoading(true);
    setError('');
    setOtpSent(false);
    setEmail(data.email);

    try {
      const response = await api.post('/password-reset/request', { email: data.email });

      if (response.data.success) {
        setOtpSent(true);
        toast.success('OTP sent to your email!');
      } else {
        setError(response.data.message || 'Failed to send OTP');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to send OTP';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (otpSent) {
    return (
      <div className="forgot-password-container">
        <div className="forgot-password-paper">
          <div className="forgot-password-header">
            <FaEnvelope className="success-icon" />
            <h1 className="success-title">Enter OTP and New Password</h1>
            <p className="success-text">
              An OTP has been sent to your email address: <strong>{email}</strong>.
              Please enter the OTP and your new password below.
            </p>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!otp || !newPassword || !confirmPassword) {
                setError('Please fill in all fields');
                return;
              }
              if (newPassword !== confirmPassword) {
                setError('Passwords do not match');
                return;
              }
              setLoading(true);
              setError('');
              try {
                const resetResponse = await api.post('/password-reset/reset-with-otp', {
                  email,
                  otp,
                  newPassword
                });
                if (resetResponse.data.success) {
                  toast.success('Password reset successfully!');
                } else {
                  setError(resetResponse.data.message || 'Failed to reset password');
                  toast.error(resetResponse.data.message || 'Failed to reset password');
                }
              } catch (err: any) {
                const errorMessage = err.response?.data?.message || 'Failed to reset password';
                setError(errorMessage);
                toast.error(errorMessage);
              } finally {
                setLoading(false);
              }
            }}
          >
            <div className="form-group">
              <label className="form-label" htmlFor="otp">OTP</label>
              <input
                id="otp"
                type="text"
                className={`form-input ${error ? 'error' : ''}`}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="newPassword">New Password</label>
              <input
                id="newPassword"
                type="password"
                className={`form-input ${error ? 'error' : ''}`}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">Confirm New Password</label>
              <input
                id="confirmPassword"
                type="password"
                className={`form-input ${error ? 'error' : ''}`}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            {error && (
              <div className="alert alert-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-contained"
              disabled={loading}
            >
              {loading ? (
                <div className="spinner"></div>
              ) : (
                'Reset Password'
              )}
            </button>

            <button
              type="button"
              className="btn btn-text"
              onClick={() => {
                setOtpSent(false);
                setOtp('');
                setNewPassword('');
                setConfirmPassword('');
                setError('');
              }}
            >
              Resend OTP
            </button>

            <RouterLink to="/login" className="back-link">
              <FaArrowLeft />
              Back to Login
            </RouterLink>
          </form>
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
