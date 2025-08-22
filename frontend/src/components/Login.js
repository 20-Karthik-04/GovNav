import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

const Login = () => {
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
    setError('');
    setLoading(true);

    const result = await login(formData.email, formData.password);

    if (result.success) {
      // Force redirect to user dashboard (non-admin users only)
      window.location.href = '/dashboard';
    } else {
      setError(result.message);
    }

    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-hero">
        <div className="hero-content">
          <h1><i className="fas fa-landmark"></i> GovNav</h1>
        </div>
      </div>

      <div className="login-card-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-icon">
              <i className="fas fa-user-circle"></i>
            </div>
            <h2>User Login</h2>
            <p>Access your dashboard to view government notifications</p>
          </div>

          {error && (
            <div className="login-error">
              <i className="fas fa-exclamation-circle"></i> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">
                <i className="fas fa-envelope"></i> Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="form-input"
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <i className="fas fa-lock"></i> Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="form-input"
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              className="login-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span> Logging in...
                </>
              ) : (
                <>
                  <i className="fas fa-sign-in-alt"></i> Login to Dashboard
                </>
              )}
            </button>
          </form>

          <div className="login-links">
            <p>
              Don't have an account? <Link to="/register">Register here</Link>
            </p>
            <p>
              <Link to="/admin-login">
                <i className="fas fa-lock"></i> Admin Login
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

      <div className="login-features">
        <div className="feature">
          <i className="fas fa-bell"></i>
          <h3>Real-time Updates</h3>
          <p>Get instant notifications from government sources</p>
        </div>
        <div className="feature">
          <i className="fas fa-search"></i>
          <h3>Powerful Search</h3>
          <p>Find relevant notifications quickly</p>
        </div>
        <div className="feature">
          <i className="fas fa-shield-alt"></i>
          <h3>Secure Access</h3>
          <p>Your data is protected with encryption</p>
        </div>
      </div>

      <footer className="login-footer">
        <p><i className="fas fa-landmark"></i></p>
        <p>GovNav - Unified Government Notification Platform</p>
        <p>&copy; {new Date().getFullYear()} All rights reserved</p>
      </footer>
    </div>
  );
};

export default Login;