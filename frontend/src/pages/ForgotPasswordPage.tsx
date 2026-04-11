import React, { useState } from 'react';
import { FaEnvelope, FaLock, FaArrowLeft, FaCheckCircle, FaUser } from 'react-icons/fa';
import { useForm } from 'react-hook-form';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import toast from 'react-hot-toast';

import './ForgotPasswordPage.css';

interface VerificationForm {
  email: string;
  username: string;
}

interface ResetForm {
  newPassword: string;
}

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Verify, 2: Reset, 3: Success
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // State from Step 1
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [recoveryToken, setRecoveryToken] = useState('');

  const { register: registerVerify, handleSubmit: handleVerifySubmit, formState: { errors: verifyErrors } } = useForm<VerificationForm>();
  const { register: registerReset, handleSubmit: handleResetSubmit, formState: { errors: resetErrors } } = useForm<ResetForm>();

  const onVerify = async (data: VerificationForm) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/password-reset/request', data);
      if (response.data.success && response.data.recoveryToken) {
        setVerifiedEmail(data.email);
        setRecoveryToken(response.data.recoveryToken);
        toast.success('Identity Verified Successfully');
        setStep(2);
      } else {
        setError(response.data.message || 'Verification failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Verification failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  const onReset = async (data: ResetForm) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/password-reset/reset-with-otp', {
        email: verifiedEmail,
        otp: recoveryToken,
        newPassword: data.newPassword
      });
      
      if (response.data.success) {
        toast.success('Password updated securely!');
        setStep(3);
      } else {
        setError(response.data.message || 'Failed to update password');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    in: { opacity: 1, x: 0 },
    out: { opacity: 0, x: -20 }
  };

  return (
    <div className="forgot-password-container">
      {/* Decorative Orbs for Glassmorphism background */}
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>
      <div className="orb orb-3"></div>

      <div className="forgot-password-glass-card">
        <AnimatePresence mode="wait">
          
          {step === 1 && (
            <motion.div
              key="step1"
              variants={pageVariants}
              initial="initial"
              animate="in"
              exit="out"
              transition={{ duration: 0.3 }}
            >
              <div className="forgot-password-header">
                <div className="icon-wrapper">
                  <FaLock />
                </div>
                <h1 className="forgot-password-title">Identity Verification</h1>
                <p className="forgot-password-subtitle">
                  For your security, please verify your account details to reset your password. No email required.
                </p>
              </div>

              {error && <div className="alert alert-error">{error}</div>}

              <form onSubmit={handleVerifySubmit(onVerify)} className="auth-form">
                <div className="form-group">
                  <label className="form-label" htmlFor="username">Username</label>
                  <div className="input-with-icon">
                    <FaUser className="input-icon" />
                    <input
                      id="username"
                      type="text"
                      placeholder="Enter your username"
                      className={`form-input pl-10 ${verifyErrors.username ? 'error' : ''}`}
                      {...registerVerify('username', { required: 'Username is required' })}
                      disabled={loading}
                    />
                  </div>
                  {verifyErrors.username && <span className="form-helper-error">{verifyErrors.username.message}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="email">Email Address</label>
                  <div className="input-with-icon">
                    <FaEnvelope className="input-icon" />
                    <input
                      id="email"
                      type="email"
                      placeholder="Enter your registered email"
                      className={`form-input pl-10 ${verifyErrors.email ? 'error' : ''}`}
                      {...registerVerify('email', { 
                        required: 'Email is required',
                        pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Invalid email' }
                      })}
                      disabled={loading}
                    />
                  </div>
                  {verifyErrors.email && <span className="form-helper-error">{verifyErrors.email.message}</span>}
                </div>

                <button type="submit" className="btn btn-primary btn-glow" disabled={loading}>
                  {loading ? <div className="spinner"></div> : 'Verify Identity'}
                </button>

                <RouterLink to="/login" className="back-link">
                  <FaArrowLeft /> Return to Login
                </RouterLink>
              </form>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              variants={pageVariants}
              initial="initial"
              animate="in"
              exit="out"
              transition={{ duration: 0.3 }}
            >
              <div className="forgot-password-header">
                <div className="icon-wrapper unlock-icon">
                  <FaLock />
                </div>
                <h1 className="forgot-password-title">Secure Reset</h1>
                <p className="forgot-password-subtitle">
                  Identity verified. You can now securely set a new password for your account.
                </p>
              </div>

              {error && <div className="alert alert-error">{error}</div>}

              <form onSubmit={handleResetSubmit(onReset)} className="auth-form">
                <div className="form-group">
                  <label className="form-label" htmlFor="newPassword">New Password</label>
                  <div className="input-with-icon">
                    <FaLock className="input-icon" />
                    <input
                      id="newPassword"
                      type="password"
                      placeholder="Minimum 6 characters"
                      className={`form-input pl-10 ${resetErrors.newPassword ? 'error' : ''}`}
                      {...registerReset('newPassword', { 
                        required: 'Password is required',
                        minLength: { value: 6, message: 'Must be at least 6 characters' }
                      })}
                      disabled={loading}
                    />
                  </div>
                  {resetErrors.newPassword && <span className="form-helper-error">{resetErrors.newPassword.message}</span>}
                </div>

                <button type="submit" className="btn btn-primary btn-glow" disabled={loading}>
                  {loading ? <div className="spinner"></div> : 'Save New Password'}
                </button>
                
                <button type="button" className="btn btn-text" onClick={() => setStep(1)} disabled={loading}>
                  Cancel
                </button>
              </form>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              variants={pageVariants}
              initial="initial"
              animate="in"
              transition={{ duration: 0.3 }}
              className="success-state"
            >
              <div className="forgot-password-header">
                <motion.div 
                  className="icon-wrapper success-icon-wrapper"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 10 }}
                >
                  <FaCheckCircle />
                </motion.div>
                <h1 className="forgot-password-title">All Set!</h1>
                <p className="forgot-password-subtitle">
                  Your password has been successfully updated. You can now use it to log into your account.
                </p>
              </div>

              <button onClick={() => navigate('/login')} className="btn btn-primary btn-glow mt-6">
                Go to Login
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
