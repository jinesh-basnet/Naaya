import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './LandingPage.css';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const HomeIcon: React.FC = () => (
    <svg className="icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" fill="currentColor" />
    </svg>
  );

  const LanguageIcon: React.FC = () => (
    <svg className="icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z" fill="currentColor" />
    </svg>
  );

  const CameraAltIcon: React.FC = () => (
    <svg className="icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="3.2" fill="currentColor" />
      <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" fill="currentColor" />
    </svg>
  );

  const ChatIcon: React.FC = () => (
    <svg className="icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="currentColor" />
    </svg>
  );

  const LocationOnIcon: React.FC = () => (
    <svg className="icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor" />
    </svg>
  );

  const features = [
    {
      icon: <HomeIcon />,
      title: 'Local Focus',
      description: 'Connect with people in your city and discover local content that matters to you.',
    },
    {
      icon: <LanguageIcon />,
      title: 'Bilingual Support',
      description: 'Switch between Nepali and English seamlessly. Our platform speaks your language.',
    },
    {
      icon: <CameraAltIcon />,
      title: 'Stories & Reels',
      description: 'Share your moments with Jhyaal (Stories) and Taal (Reels) with Nepali filters.',
    },
    {
      icon: <ChatIcon />,
      title: 'Real-time Chat',
      description: 'Connect instantly with friends and family through secure messaging.',
    },
    {
      icon: <LocationOnIcon />,
      title: 'Location-based',
      description: 'Find content and people from your area with our smart location algorithm.',
    },
  ];

  return (
    <div className="landing-page">
      <nav className="navbar">
        <div className="navbar-toolbar">
          <h1 className="navbar-brand">नाया</h1>
          <div className="navbar-buttons">
            <button
              className="navbar-button"
              onClick={() => navigate('/login')}
            >
              Login
            </button>
            <button
              className="navbar-button primary"
              onClick={() => navigate('/register')}
            >
              Sign up
            </button>
          </div>
        </div>
      </nav>

      <section className="hero-section">
        <div className="hero-container">
          <h1 className="hero-title">Welcome to नाया</h1>
          <h2 className="hero-subtitle">The Nepali Network - Where Nepal Connects</h2>
          <p className="hero-description">
            Join the first social media platform built specifically for Nepal.
            Connect with your community and share your story.
          </p>
          <div className="hero-buttons">
            <button
              className="hero-button"
              onClick={() => navigate('/register')}
            >
              Sign up
            </button>
            <button
              className="hero-button secondary"
              onClick={() => navigate('/login')}
            >
              Login
            </button>
          </div>
        </div>
      </section>

      <section className="features-section">
        <div className="features-container">
          <h2 className="features-title">Why Choose नाया?</h2>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      <section className="cta-section">
        <div className="cta-container">
          <h2 className="cta-title">Ready to Join the Nepali Network?</h2>
          <p className="cta-description">
            Be part of the community that's building the future of social media in Nepal.
          </p>
          <button
            className="cta-button"
            onClick={() => navigate('/register')}
          >
            Create Your Account
          </button>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-container">
          <h3 className="footer-title">नाया - The Nepali Network</h3>
          <p className="footer-text">© 2024 Naaya. Connecting Nepal, one story at a time.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
