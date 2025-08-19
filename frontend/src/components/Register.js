import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Register.css';

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    const result = await register({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      password: formData.password
    });

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message);
    }

    setLoading(false);
  };

  return (
    <div className="register-container">
      <div className="register-hero">
        <div className="hero-content">
          <h1><i className="fas fa-landmark"></i> GovNav</h1>
        </div>
      </div>

      <div className="register-card-container">
        <div className="register-card">
          <div className="register-header">
            <div className="register-icon">
              <i className="fas fa-user-plus"></i>
            </div>
            <h2>Create Account</h2>
            <p>Join thousands of users staying informed</p>
          </div>

          {error && (
            <div className="register-error">
              <i className="fas fa-exclamation-circle"></i> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  <i className="fas fa-user"></i> First Name
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Enter your first name"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <i className="fas fa-user"></i> Last Name
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Enter your last name"
                  required
                />
              </div>
            </div>

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

            <div className="form-row">
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
                  placeholder="Create a password"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <i className="fas fa-lock"></i> Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Confirm your password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="register-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span> Creating Account...
                </>
              ) : (
                <>
                  <i className="fas fa-user-plus"></i> Create Account
                </>
              )}
            </button>
          </form>

          <div className="register-agreement">
            <p>By creating an account, you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a></p>
          </div>

          <div className="register-links">
            <p>
              Already have an account? <Link to="/login">User Login</Link>
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

      <div className="register-features">
        <div className="feature">
          <i className="fas fa-bell"></i>
          <h3>Real-time Updates</h3>
          <p>Get instant notifications from government sources</p>
        </div>
        <div className="feature">
          <i className="fas fa-bookmark"></i>
          <h3>Save Favorites</h3>
          <p>Bookmark important notifications for later</p>
        </div>
        <div className="feature">
          <i className="fas fa-cog"></i>
          <h3>Customize Preferences</h3>
          <p>Personalize your notification categories</p>
        </div>
      </div>

      <footer className="register-footer">
        <p><i className="fas fa-landmark"></i></p>
        <p>GovNav - Unified Government Notification Platform</p>
        <p>&copy; {new Date().getFullYear()} All rights reserved</p>
      </footer>
    </div>
  );
};

export default Register;