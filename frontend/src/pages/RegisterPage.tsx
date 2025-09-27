import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';



const Visibility: React.FC<{ color?: string }> = ({ color }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill={color || '#666'} />
  </svg>
);

const VisibilityOff: React.FC<{ color?: string }> = ({ color }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92 1.11-1.11c-1.73-4.39-6-7.5-11-7.5-1.55 0-3.04.3-4.38.84l1.47 1.47C9.94 7.47 10.94 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42 2.93 2.93 1.41-1.41L3.51 2.86 2.1 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" fill={color || '#666'} />
  </svg>
);

const Email: React.FC<{ color?: string }> = ({ color }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill={color || '#666'} />
  </svg>
);

const Lock: React.FC<{ color?: string }> = ({ color }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm3 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" fill={color || '#666'} />
  </svg>
);

const Person: React.FC<{ color?: string }> = ({ color }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill={color || '#666'} />
  </svg>
);

const Phone: React.FC<{ color?: string }> = ({ color }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" fill={color || '#666'} />
  </svg>
);

interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  phone?: string;
  city: string;
  district: string;
  province: string;
  languagePreference: 'nepali' | 'english' | 'both';
}

const RegisterPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>();

  const password = watch('password');

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true);
    setError('');
    
    try {
      const { confirmPassword, ...userData } = data;
      await registerUser({
        ...userData,
        location: {
          city: data.city,
          district: data.district,
          province: data.province,
        },
      });
      toast.success('Welcome to नाया! Your account has been created.');
      navigate('/home');
    } catch (error: any) {
      setError(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const nepaliProvinces = [
    'Province 1', 'Madhesh Province', 'Bagmati Province', 'Gandaki Province',
    'Lumbini Province', 'Karnali Province', 'Sudurpashchim Province'
  ];

  const districts = [
    'Kathmandu', 'Lalitpur', 'Bhaktapur', 'Pokhara', 'Chitwan', 'Bharatpur',
    'Biratnagar', 'Birgunj', 'Janakpur', 'Hetauda', 'Butwal', 'Nepalgunj'
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1rem', position: 'relative', boxSizing: 'border-box', overflowY: 'auto' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255, 255, 255, 0.02)', backdropFilter: 'blur(2px)', zIndex: 1 }}></div>
      <div style={{ position: 'relative', zIndex: 2, maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
        <div style={{ padding: '3rem 2.5rem', borderRadius: '20px', background: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(30px) saturate(1.4)', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)', border: '1px solid rgba(255, 255, 255, 0.15)', maxWidth: '600px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#1a1a1a', marginBottom: '0.5rem', margin: '0', textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }}>Join नाया</h1>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1a1a1a', margin: '0', textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)' }}>Create your account on The Nepali Network</p>
          </div>

          {error && <div style={{ padding: '1rem', borderRadius: '8px', backgroundColor: '#ffebee', color: '#c62828', marginBottom: '1.5rem', border: '1px solid #ffcdd2' }}>{error}</div>}

          <form style={{ display: 'flex', flexDirection: 'column' }} onSubmit={handleSubmit(onSubmit)}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <div style={{ marginBottom: '1rem', position: 'relative' }}>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '1rem', fontWeight: 700, color: '#1a1a1a' }}>Full Name</label>
                  <div style={{ position: 'absolute', top: '50%', left: '0.75rem', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '2rem', height: '2rem', color: '#666' }}><Person /></div>
                  <input style={{ width: '100%', padding: '1.125rem 3rem 1.125rem 3rem', border: '2px solid rgba(255, 255, 255, 0.2)', borderRadius: '12px', fontSize: '1rem', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxSizing: 'border-box', background: 'rgba(255, 255, 255, 0.05)', color: '#333', position: 'relative', minHeight: '44px' }} {...register('fullName', {
                    required: 'Full name is required',
                    minLength: { value: 2, message: 'Name must be at least 2 characters' },
                  })} />
                  {errors.fullName && <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1a1a1a', marginTop: '0.25rem' }}>{errors.fullName.message}</div>}
                </div>
              </div>
              <div>
                <div style={{ marginBottom: '1rem', position: 'relative' }}>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '1rem', fontWeight: 700, color: '#1a1a1a' }}>Username</label>
                  <input style={{ width: '100%', padding: '1.125rem 3rem 1.125rem 3rem', border: '2px solid rgba(255, 255, 255, 0.2)', borderRadius: '12px', fontSize: '1rem', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxSizing: 'border-box', background: 'rgba(255, 255, 255, 0.05)', color: '#333', position: 'relative', minHeight: '44px' }} {...register('username', {
                    required: 'Username is required',
                    minLength: { value: 3, message: 'Username must be at least 3 characters' },
                    pattern: {
                      value: /^[a-zA-Z0-9_]+$/,
                      message: 'Username can only contain letters, numbers, and underscores',
                    },
                  })} />
                  {errors.username && <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1a1a1a', marginTop: '0.25rem' }}>{errors.username.message}</div>}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '1rem', position: 'relative' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '1rem', fontWeight: 700, color: '#1a1a1a' }}>Email</label>
              <div style={{ position: 'absolute', top: '50%', left: '0.75rem', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '2rem', height: '2rem', color: '#666' }}><Email /></div>
              <input style={{ width: '100%', padding: '1.125rem 3rem 1.125rem 3rem', border: '2px solid rgba(255, 255, 255, 0.2)', borderRadius: '12px', fontSize: '1rem', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxSizing: 'border-box', background: 'rgba(255, 255, 255, 0.05)', color: '#333', position: 'relative', minHeight: '44px' }} type="email" {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              })} />
              {errors.email && <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1a1a1a', marginTop: '0.25rem' }}>{errors.email.message}</div>}
            </div>

            <div style={{ marginBottom: '1rem', position: 'relative' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '1rem', fontWeight: 700, color: '#1a1a1a' }}>Phone (Optional)</label>
              <div style={{ position: 'absolute', top: '50%', left: '0.75rem', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '2rem', height: '2rem', color: '#666' }}><Phone /></div>
              <input style={{ width: '100%', padding: '1.125rem 3rem 1.125rem 3rem', border: '2px solid rgba(255, 255, 255, 0.2)', borderRadius: '12px', fontSize: '1rem', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxSizing: 'border-box', background: 'rgba(255, 255, 255, 0.05)', color: '#333', position: 'relative', minHeight: '44px' }} {...register('phone')} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginTop: '1rem', marginBottom: '1rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '1rem', fontWeight: 700, color: '#1a1a1a' }}>Province</label>
                <select style={{ width: '100%', padding: '0.75rem', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem', backgroundColor: 'white', transition: 'border-color 0.3s ease' }} {...register('province', { required: 'Province is required' })}>
                  {nepaliProvinces.map((province) => (
                    <option key={province} value={province}>
                      {province}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '1rem', fontWeight: 700, color: '#1a1a1a' }}>District</label>
                <select style={{ width: '100%', padding: '0.75rem', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem', backgroundColor: 'white', transition: 'border-color 0.3s ease' }} {...register('district', { required: 'District is required' })}>
                  {districts.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '1rem', position: 'relative' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '1rem', fontWeight: 700, color: '#1a1a1a' }}>City</label>
                <input style={{ width: '100%', padding: '1.125rem 3rem 1.125rem 3rem', border: '2px solid rgba(255, 255, 255, 0.2)', borderRadius: '12px', fontSize: '1rem', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxSizing: 'border-box', background: 'rgba(255, 255, 255, 0.05)', color: '#333', position: 'relative', minHeight: '44px' }} {...register('city', { required: 'City is required' })} />
                {errors.city && <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1a1a1a', marginTop: '0.25rem' }}>{errors.city.message}</div>}
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '1rem', fontWeight: 700, color: '#1a1a1a' }}>Language Preference</label>
              <select style={{ width: '100%', padding: '0.75rem', border: '1px solid #ccc', borderRadius: '8px', fontSize: '1rem', backgroundColor: 'white', transition: 'border-color 0.3s ease' }} {...register('languagePreference')} defaultValue="both">
                <option value="nepali">नेपाली (Nepali)</option>
                <option value="english">English</option>
                <option value="both">Both</option>
              </select>
            </div>

            <div style={{ marginBottom: '1rem', position: 'relative' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '1rem', fontWeight: 700, color: '#1a1a1a' }}>Password</label>
              <div style={{ position: 'absolute', top: '50%', left: '0.75rem', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '2rem', height: '2rem', color: '#666' }}><Lock /></div>
              <input style={{ width: '100%', padding: '1.125rem 3rem 1.125rem 3rem', border: '2px solid rgba(255, 255, 255, 0.2)', borderRadius: '12px', fontSize: '1rem', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxSizing: 'border-box', background: 'rgba(255, 255, 255, 0.05)', color: '#333', position: 'relative', minHeight: '44px' }} type={showPassword ? 'text' : 'password'} {...register('password', {
                required: 'Password is required',
                minLength: { value: 6, message: 'Password must be at least 6 characters' },
              })} />
              <div style={{ position: 'absolute', top: '50%', right: '0.75rem', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '2rem', height: '2rem', color: '#666' }}>
                <button className="icon-button" type="button" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </button>
              </div>
              {errors.password && <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1a1a1a', marginTop: '0.25rem' }}>{errors.password.message}</div>}
            </div>

            <div style={{ marginBottom: '1rem', position: 'relative' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '1rem', fontWeight: 700, color: '#1a1a1a' }}>Confirm Password</label>
              <div style={{ position: 'absolute', top: '50%', left: '0.75rem', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '2rem', height: '2rem', color: '#666' }}><Lock /></div>
              <input style={{ width: '100%', padding: '1.125rem 3rem 1.125rem 3rem', border: '2px solid rgba(255, 255, 255, 0.2)', borderRadius: '12px', fontSize: '1rem', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', boxSizing: 'border-box', background: 'rgba(255, 255, 255, 0.05)', color: '#333', position: 'relative', minHeight: '44px' }} type={showConfirmPassword ? 'text' : 'password'} {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (value: string) => value === password || 'Passwords do not match',
              })} />
              <div style={{ position: 'absolute', top: '50%', right: '0.75rem', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '2rem', height: '2rem', color: '#666' }}>
                <button className="icon-button" type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                </button>
              </div>
              {errors.confirmPassword && <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1a1a1a', marginTop: '0.25rem' }}>{errors.confirmPassword.message}</div>}
            </div>

            <button className="register-button" type="submit" disabled={loading} style={{ padding: '1rem 2rem', border: 'none', borderRadius: '12px', background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%)', color: 'white', fontSize: '1.125rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.3s ease', marginTop: '2rem', marginBottom: '1rem', boxShadow: '0 4px 15px rgba(255, 107, 53, 0.3)', position: 'relative', overflow: 'hidden', width: '100%' }}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <p style={{ margin: '0.5rem 0', fontSize: '0.875rem', color: '#666' }}>
                Already have an account?{' '}
                <RouterLink className="register-link" to="/login" style={{ color: '#845340', textDecoration: 'none', fontWeight: 'bold', transition: 'color 0.3s ease' }}>
                  Sign in here
                </RouterLink>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
