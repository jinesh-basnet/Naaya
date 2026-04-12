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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [selectedProvince, setSelectedProvince] = useState<ProvinceKey | ''>('');
  const availableDistricts = selectedProvince ? nepaliProvincesAndDistricts[selectedProvince as ProvinceKey] : [];

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
      if (password?.length >= 8) strength += 1;
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { confirmPassword, ...userData } = data;
      await registerUser({
        ...userData,
        location: {
          city: data.city,
          district: data.district,
          province: data.province,
        },
      });
      toast.success('Welcome to नाया! Account created.');
      navigate('/home');
    } catch (error: any) {
      setError(error.message);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-container">
        {/* Left Sidebar (Desktop) */}
        <div className="register-sidebar">
          <div className="register-brand">
            <img src={logo} alt="Logo" className="register-logo-img" />
            <h2>Join the Community</h2>
            <p>
              Connect with friends, share your moments, and explore the beauty of Nepal and beyond on Naaya.
            </p>
          </div>
        </div>

        {/* Right Content */}
        <div className="register-content">
          <div className="register-header">
            <h1 className="register-title">Create Account</h1>
            <p className="register-subtitle">Sign up to get started.</p>
          </div>

          {error && <div className="form-error" style={{ marginBottom: '16px', fontSize: '1rem', textAlign: 'center' }}>{error}</div>}

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Personal Info */}
            <div className="form-grid-2">
              <div className="form-group">
                <label>Full Name</label>
                <input
                  className="form-input"
                  placeholder="e.g. Ram Bahadur"
                  {...register('fullName', {
                    required: 'Required',
                    minLength: { value: 2, message: 'Too short' },
                  })}
                />
                {errors.fullName && <span className="form-error">{errors.fullName.message}</span>}
              </div>
              <div className="form-group">
                <label>Username</label>
                <input
                  className="form-input"
                  placeholder="e.g. rambahadur123"
                  {...register('username', {
                    required: 'Required',
                    pattern: { value: /^[a-zA-Z0-9_]+$/, message: 'Alphanumeric only' }
                  })}
                />
                {errors.username && <span className="form-error">{errors.username.message}</span>}
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="hello@example.com"
                  {...register('email', {
                    required: 'Required',
                    pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' }
                  })}
                />
                {errors.email && <span className="form-error">{errors.email.message}</span>}
              </div>
              <div className="form-group">
                <label>Phone (Optional)</label>
                <input
                  className="form-input"
                  placeholder="98XXXXXXXX"
                  {...register('phone', {
                    pattern: { value: /^98\d{8}$/, message: 'Invalid phone format' }
                  })}
                />
                {errors.phone && <span className="form-error">{errors.phone.message}</span>}
              </div>
            </div>

            {/* Location */}
            <div className="form-group">
              <label>Province</label>
              <select
                className="form-select"
                {...register('province', { required: 'Required' })}
                onChange={(e) => {
                  setSelectedProvince(e.target.value as ProvinceKey | '');
                }}
              >
                <option value="">Select Province</option>
                {Object.keys(nepaliProvincesAndDistricts).map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              {errors.province && <span className="form-error">{errors.province.message}</span>}
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label>District</label>
                <select
                  className="form-select"
                  {...register('district', { required: 'Required' })}
                  disabled={!selectedProvince}
                >
                  <option value="">Select District</option>
                  {availableDistricts.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                {errors.district && <span className="form-error">{errors.district.message}</span>}
              </div>
              <div className="form-group">
                <label>City</label>
                <input
                  className="form-input"
                  placeholder="e.g. Kathmandu"
                  {...register('city', { required: 'Required' })}
                />
                {errors.city && <span className="form-error">{errors.city.message}</span>}
              </div>
            </div>

            {/* Language Preference */}
            <div className="form-group">
              <label>Language Preference</label>
              <select className="form-select" {...register('languagePreference')} defaultValue="both">
                <option value="nepali">Nepali (नेपाली)</option>
                <option value="english">English</option>
                <option value="both">Both</option>
              </select>
            </div>

            {/* Security */}
            <div className="form-grid-2">
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="********"
                  {...register('password', {
                    required: 'Required',
                    minLength: { value: 8, message: 'Min 8 chars' },
                    pattern: {
                      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
                      message: 'Must include Upper, Lower, Number, Special char'
                    }
                  })}
                />
                <div className="password-strength-bar">
                  <div className={`password-strength-fill strength-${passwordStrength}`}></div>
                </div>
                {errors.password && <span className="form-error">{errors.password.message}</span>}
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="********"
                  {...register('confirmPassword', {
                    validate: (value) => value === password || 'Passwords do not match'
                  })}
                />
                {errors.confirmPassword && <span className="form-error">{errors.confirmPassword.message}</span>}
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Creating...' : 'Create Account'}
            </button>

            <div className="login-redirect">
              Already have an account?
              <RouterLink to="/login" className="login-link"> Log In</RouterLink>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
