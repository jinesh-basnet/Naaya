import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import logo from '../assets/logo.png';
import './RegisterPage.css';





const nepaliProvincesAndDistricts = {
  "Province No. 1 (Koshi Province)": [
    "Bhojpur", "Dhankuta", "Ilam", "Jhapa", "Khotang", "Morang", "Okhaldhunga",
    "Panchthar", "Sankhuwasabha", "Solukhumbu", "Sunsari", "Taplejung", "Terhathum", "Udayapur"
  ],
  "Province No. 2 (Madhesh Province)": [
    "Bara", "Dhanusha", "Mahottari", "Parsa", "Rautahat", "Saptari", "Sarlahi", "Siraha"
  ],
  "Province No. 3 (Bagmati Province)": [
    "Bhaktapur", "Chitwan", "Dhading", "Dolakha", "Kathmandu", "Kavrepalanchok",
    "Lalitpur", "Makwanpur", "Nuwakot", "Ramechhap", "Rasuwa", "Sindhuli", "Sindhupalchok"
  ],
  "Province No. 4 (Gandaki Province)": [
    "Baglung", "Gorkha", "Kaski", "Lamjung", "Manang", "Mustang", "Myagdi",
    "Nawalpur (Nawalparasi East)", "Parbat", "Syangja", "Tanahun"
  ],
  "Province No. 5 (Lumbini Province)": [
    "Arghakhanchi", "Banke", "Bardiya", "Dang", "Gulmi", "Kapilvastu", "Palpa",
    "Parasi (Nawalparasi West)", "Pyuthan", "Rolpa", "Rupandehi", "Rukum (East)"
  ],
  "Province No. 6 (Karnali Province)": [
    "Dailekh", "Dolpa", "Humla", "Jajarkot", "Jumla", "Kalikot", "Mugu",
    "Rukum (West)", "Salyan", "Surkhet"
  ],
  "Province No. 7 (Sudurpashchim Province)": [
    "Achham", "Baitadi", "Bajhang", "Bajura", "Dadeldhura", "Darchula", "Doti",
    "Kailali", "Kanchanpur"
  ]
};

type ProvinceKey = keyof typeof nepaliProvincesAndDistricts;

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
  const [passwordStrength, setPasswordStrength] = useState(0);

  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>();

  const password = watch('password');

  useEffect(() => {
    const calculatePasswordStrength = (password: string) => {
      let strength = 0;
      if (password.length >= 8) strength += 1;
      if (/[A-Z]/.test(password)) strength += 1;
      if (/[a-z]/.test(password)) strength += 1;
      if (/\d/.test(password)) strength += 1;
      if (/[@$!%*?&]/.test(password)) strength += 1;
      return strength;
    };
    setPasswordStrength(calculatePasswordStrength(password || ''));
  }, [password]);

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

  const handleInputChange = () => {
    if (error) {
      setError('');
    }
  };



  const [selectedProvince, setSelectedProvince] = useState<ProvinceKey | ''>('');  
  const availableDistricts = selectedProvince ? nepaliProvincesAndDistricts[selectedProvince as ProvinceKey] : [];

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-paper">
          <div className="register-header">
            <img src={logo} alt="Logo" className="register-logo" />
            <h1 className="register-title">Join नाया</h1>
            <p className="register-subtitle">Create your account on The Nepali Network</p>
          </div>

          {error && <div className="register-alert">{error}</div>}

          <form className="register-form" onSubmit={handleSubmit(onSubmit)}>
            <div className="register-grid">
              <div className={`register-textfield ${errors.fullName ? 'error' : ''}`}>
                <label>Full Name</label>
                <div className="input-adornment start icon-person"></div>
                <input className="register-input with-start" {...register('fullName', {
                  required: 'Full name is required',
                  minLength: { value: 2, message: 'Name must be at least 2 characters' },
                  maxLength: { value: 50, message: 'Name must be at most 50 characters' },
                  onChange: handleInputChange,
                })} />
                {errors.fullName && <div className="register-helper-text">{errors.fullName.message}</div>}
              </div>
              <div className={`register-textfield ${errors.username ? 'error' : ''}`}>
                <label>Username</label>
                <input className="register-input" {...register('username', {
                  required: 'Username is required',
                  minLength: { value: 3, message: 'Username must be at least 3 characters' },
                  maxLength: { value: 30, message: 'Username must be at most 30 characters' },
                  pattern: {
                    value: /^[a-zA-Z0-9_]+$/,
                    message: 'Username can only contain letters, numbers, and underscores',
                  },
                  onChange: handleInputChange,
                })} />
                {errors.username && <div className="register-helper-text">{errors.username.message}</div>}
              </div>
            </div>

            <div className={`register-textfield ${errors.email ? 'error' : ''}`}>
              <label>Email</label>
              <div className="input-adornment start icon-email"></div>
              <input className="register-input with-start" type="email" {...register('email', {
                required: 'Email is required',
                maxLength: { value: 100, message: 'Email must be at most 100 characters' },
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
                onChange: handleInputChange,
              })} />
              {errors.email && <div className="register-helper-text">{errors.email.message}</div>}
            </div>

            <div className={`register-textfield ${errors.phone ? 'error' : ''}`}>
              <label>Phone (Optional)</label>
              <div className="input-adornment start icon-phone"></div>
              <input className="register-input with-start" {...register('phone', {
                pattern: {
                  value: /^98\d{8}$/,
                  message: 'Phone number must start with 98 and be 10 digits long',
                },
                onChange: handleInputChange,
              })} />
              {errors.phone && <div className="register-helper-text">{errors.phone.message}</div>}
            </div>

            <div className="register-location-grid">
              <div className={`register-form-control ${errors.province ? 'error' : ''}`}>
                <label>Province</label>
                <select
                  className="register-select"
                  {...register('province', { required: 'Province is required' })}
                  onChange={(e) => {
                    setSelectedProvince(e.target.value as ProvinceKey | '');
                    handleInputChange();
                  }}
                >
                  <option value="">Select Province</option>
                  {Object.keys(nepaliProvincesAndDistricts).map((province) => (
                    <option key={province} value={province}>
                      {province}
                    </option>
                  ))}
                </select>
                {errors.province && <div className="register-helper-text">{errors.province.message}</div>}
              </div>
              <div className={`register-form-control ${errors.district ? 'error' : ''}`}>
                <label>District</label>
                <select
                  className="register-select"
                  {...register('district', { required: 'District is required' })}
                  disabled={!selectedProvince}
                  onChange={handleInputChange}
                >
                  <option value="">Select District</option>
                  {availableDistricts.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
                {errors.district && <div className="register-helper-text">{errors.district.message}</div>}
              </div>
              <div className={`register-textfield ${errors.city ? 'error' : ''}`}>
                <label>City</label>
                <input className="register-input" {...register('city', { required: 'City is required', onChange: handleInputChange })} />
                {errors.city && <div className="register-helper-text">{errors.city.message}</div>}
              </div>
            </div>

            <div className="register-form-control">
              <label>Language Preference</label>
              <select className="register-select" {...register('languagePreference')} defaultValue="both">
                <option value="nepali">नेपाली (Nepali)</option>
                <option value="english">English</option>
                <option value="both">Both</option>
              </select>
            </div>

            <div className={`register-textfield ${errors.password ? 'error' : ''}`}>
              <label>Password</label>
              <div className="input-adornment start icon-lock"></div>
              <input className="register-input with-start with-end" type={showPassword ? 'text' : 'password'} {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'Password must be at least 8 characters' },
                pattern: {
                  value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
                  message: 'Password must include at least one uppercase letter, one lowercase letter, one number, and one special character',
                },
                onChange: handleInputChange,
              })} />
              <div className="input-adornment end">
                <button className={`icon-button visibility-toggle ${showPassword ? 'icon-visibility-off' : 'icon-visibility'}`} type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {password && (
                <div className="password-strength">
                  <div className="strength-bar">
                    <div className={`strength-fill strength-${passwordStrength}`}></div>
                  </div>
                  <span className="strength-text">
                    {passwordStrength === 0 && 'Very Weak'}
                    {passwordStrength === 1 && 'Weak'}
                    {passwordStrength === 2 && 'Fair'}
                    {passwordStrength === 3 && 'Good'}
                    {passwordStrength === 4 && 'Strong'}
                    {passwordStrength === 5 && 'Very Strong'}
                  </span>
                </div>
              )}
              {errors.password && <div className="register-helper-text">{errors.password.message}</div>}
            </div>

            <div className={`register-textfield ${errors.confirmPassword ? 'error' : ''}`}>
              <label>Confirm Password</label>
              <div className="input-adornment start icon-lock"></div>
              <input className="register-input with-start with-end" type={showConfirmPassword ? 'text' : 'password'} {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (value: string) => value === password || 'Passwords do not match',
                onChange: handleInputChange,
              })} />
              <div className="input-adornment end">
                <button className={`icon-button visibility-toggle ${showConfirmPassword ? 'icon-visibility-off' : 'icon-visibility'}`} type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}>
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {errors.confirmPassword && <div className="register-helper-text">{errors.confirmPassword.message}</div>}
            </div>

            <button className="register-button" type="submit" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>

            <div className="register-links">
              <p className="register-link-text">
                Already have an account? <RouterLink className="register-link" to="/login">Sign in here</RouterLink>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
