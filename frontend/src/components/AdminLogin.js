import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './AdminLogin.css';

const AdminLogin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(formData.email, formData.password);

    if (result.success) {
      // Force admin to go to admin route
      console.log('Admin login successful, navigating to /admin');
      setTimeout(() => {
        window.location.replace('/admin');
      }, 100);
    } else {
      setError(result.message);
    }

    setLoading(false);
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-hero">
        <div className="hero-content">
          <h1><i className="fas fa-landmark"></i> GovNav</h1>
        </div>
      </div>

      <div className="admin-login-card-container">
        <div className="admin-login-card">
          <div className="admin-login-header">
            <div className="admin-login-icon">
              <i className="fas fa-shield-alt"></i>
            </div>
            <h2>Admin Portal</h2>
            <p>Access the admin panel to manage notifications and scraping</p>
          </div>

          {error && (
            <div className="admin-login-error">
              <i className="fas fa-exclamation-circle"></i> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">
                <i className="fas fa-envelope"></i> Admin Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="form-input"
                placeholder="example@123.com"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <i className="fas fa-lock"></i> Admin Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="form-input"
                placeholder="Enter admin password"
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="admin-login-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span> Signing In...
                </>
              ) : (
                <>
                  <i className="fas fa-sign-in-alt"></i> Access Admin Portal
                </>
              )}
            </button>
          </form>

          <div className="admin-login-links">
            <p>
              <Link to="/login">
                <i className="fas fa-user"></i> User Login
              </Link>
            </p>
            <p>
              <Link to="/register">
                <i className="fas fa-user-plus"></i> User Registration
              </Link>
            </p>
            <p>
              <Link to="/">
                <i className="fas fa-arrow-left"></i> Back to Home
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className="admin-login-features">
        <div className="feature">
          <i className="fas fa-cogs"></i>
          <h3>Web Scraping</h3>
          <p>Manage automated scraping of government websites</p>
        </div>
        <div className="feature">
          <i className="fas fa-bell"></i>
          <h3>Notifications</h3>
          <p>Review and manage all government notifications</p>
        </div>
        <div className="feature">
          <i className="fas fa-chart-line"></i>
          <h3>Analytics</h3>
          <p>View platform usage statistics and metrics</p>
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

export default AdminLogin;