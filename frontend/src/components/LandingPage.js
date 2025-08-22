import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
  const [currentFeature, setCurrentFeature] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);

    const featureInterval = setInterval(() => {
      setCurrentFeature(prev => (prev + 1) % 3);
    }, 4000);

    return () => clearInterval(featureInterval);
  }, []);

  const features = [
    {
      icon: 'fas fa-bolt',
      title: 'Real-time Updates',
      description: 'Get instant notifications from multiple government sources'
    },
    {
      icon: 'fas fa-search',
      title: 'Powerful Search',
      description: 'Find relevant notifications quickly with advanced filters'
    },
    {
      icon: 'fas fa-folder',
      title: 'Organized Categories',
      description: 'Notifications sorted by topic for easy navigation'
    }
  ];

  return (
    <div className="landing-page">
      <div className="hero-section">
        <div className="hero-content">
          <div className={`hero-text ${isVisible ? 'fade-in' : ''}`}>
            <h1><i className="fas fa-landmark"></i> GovNav</h1>
            <h2>Unified Government Notification Platform</h2>
            <p>Centralized platform for accessing government notifications from multiple departments in one place</p>
          </div>
          <div className={`hero-illustration ${isVisible ? 'slide-in' : ''}`}>
            <div className="floating-card card-1">
              <i className="fas fa-file-contract"></i>
              <span>Legal Updates</span>
            </div>
            <div className="floating-card card-2">
              <i className="fas fa-graduation-cap"></i>
              <span>Education</span>
            </div>
            <div className="floating-card card-3">
              <i className="fas fa-heartbeat"></i>
              <span>Health</span>
            </div>
            <div className="floating-card card-4">
              <i className="fas fa-briefcase"></i>
              <span>Employment</span>
            </div>
            <div className="dashboard-preview">
              <div className="dashboard-header">
                <div className="header-dot"></div>
                <div className="header-dot"></div>
                <div className="header-dot"></div>
              </div>
              <div className="dashboard-content">
                <div className="content-row"></div>
                <div className="content-row"></div>
                <div className="content-row"></div>
                <div className="content-row"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="scroll-indicator">
          <span>Scroll to explore</span>
          <div className="chevron"></div>
        </div>
      </div>

      <div className="access-section">
        <div className="access-container">
          <div className="access-header">
            <h2>Access the System</h2>
            <p>Choose your entry point to get started with GovNav</p>
          </div>

          <div className="access-cards">
            <Link to="/admin-login" className="access-card admin-card">
              <div className="card-badge">Admin</div>
              <div className="card-icon">
                <i className="fas fa-shield-alt"></i>
              </div>
              <div className="card-content">
                <h3>Admin Portal</h3>
                <p>Manage notifications, configure scraping, and oversee system operations</p>
                <ul className="card-features">
                  <li><i className="fas fa-check"></i> Web scraping management</li>
                  <li><i className="fas fa-check"></i> Notification moderation</li>
                </ul>
              </div>
              <div className="card-footer">
                <span>Access Admin Dashboard</span>
                <i className="fas fa-arrow-right"></i>
              </div>
            </Link>

            <Link to="/login" className="access-card user-card">
              <div className="card-badge">User</div>
              <div className="card-icon">
                <i className="fas fa-user"></i>
              </div>
              <div className="card-content">
                <h3>User Portal</h3>
                <p>Browse, search, and stay updated with government notifications</p>
                <ul className="card-features">
                  <li><i className="fas fa-check"></i> Advanced search filters</li>
                  <li><i className="fas fa-check"></i> Category-based organization</li>
                </ul>
              </div>
              <div className="card-footer">
                <span>Access User Dashboard</span>
                <i className="fas fa-arrow-right"></i>
              </div>
            </Link>

            <Link to="/register" className="access-card register-card">
              <div className="card-badge">New</div>
              <div className="card-icon">
                <i className="fas fa-user-plus"></i>
              </div>
              <div className="card-content">
                <h3>New Account</h3>
                <p>Create a new user account to access government notifications</p>
                <ul className="card-features">
                  <li><i className="fas fa-check"></i> Quick registration</li>
                  <li><i className="fas fa-check"></i> Immediate access</li>
                </ul>
              </div>
              <div className="card-footer">
                <span>Create Account</span>
                <i className="fas fa-arrow-right"></i>
              </div>
            </Link>
          </div>
        </div>
      </div>

      <div className="features-section">
        <div className="features-container">
          <h2>Why Choose GovNav?</h2>
          <p className="features-subtitle">Experience the next generation of government notification systems</p>

          <div className="features-display">
            <div className="feature-visual">
              <div className="visual-container">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className={`feature-visual-item ${index === currentFeature ? 'active' : ''}`}
                  >
                    <i className={feature.icon}></i>
                  </div>
                ))}
              </div>
            </div>

            <div className="features-content">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className={`feature-item ${index === currentFeature ? 'active' : ''}`}
                >
                  <div className="feature-icon">
                    <i className={feature.icon}></i>
                  </div>
                  <div className="feature-text">
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <footer className="admin-login-footer">
        <p><i className="fas fa-landmark"></i></p>
        <p>GovNav - Unified Government Notification Platform</p>
        <p>&copy; {new Date().getFullYear()} All rights reserved</p>
      </footer>
    </div>
  );
};

export default LandingPage;