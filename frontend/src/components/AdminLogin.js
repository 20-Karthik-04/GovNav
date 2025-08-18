import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AdminLogin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

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
    <div className="auth-container">
      <div className="auth-card">
        <div className="admin-header">
          <h2 className="auth-title">🔐 Admin Login</h2>
          <p style={{ textAlign: 'center', color: '#666', marginBottom: '20px' }}>
            Access the admin panel to manage notifications and scraping
          </p>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Admin Email:</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="admin@govnav.com"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Admin Password:</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter admin password"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', marginBottom: '20px' }}
          >
            {loading ? 'Signing In...' : 'Sign In as Admin'}
          </button>
        </form>

        <div className="auth-divider">
          <hr style={{ margin: '20px 0', borderColor: '#eee' }} />
          <p style={{ textAlign: 'center', color: '#666', fontSize: '14px' }}>
            Default Admin Credentials:
          </p>
          <div style={{
            background: '#f8f9fa',
            padding: '10px',
            borderRadius: '4px',
            fontSize: '12px',
            textAlign: 'center',
            marginBottom: '20px'
          }}>
            <strong>Email:</strong> admin@govnav.com<br />
            <strong>Password:</strong> admin123
          </div>
        </div>

        <div className="auth-link">
          <Link to="/login">👤 User Login</Link> | <Link to="/register">📝 Register as User</Link>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
