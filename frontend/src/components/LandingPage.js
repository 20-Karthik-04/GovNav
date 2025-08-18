import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '500px' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ color: '#2c3e50', marginBottom: '10px' }}>
            🏛️ GovNav
          </h1>
          <p style={{ color: '#7f8c8d', fontSize: '18px' }}>
            Government Notifications System
          </p>
          <p style={{ color: '#666', fontSize: '14px', marginTop: '15px' }}>
            Choose your login type to access the system
          </p>
        </div>

        <div style={{ display: 'grid', gap: '20px' }}>
          <Link 
            to="/admin-login" 
            className="btn btn-primary"
            style={{ 
              padding: '15px 20px',
              textDecoration: 'none',
              display: 'block',
              textAlign: 'center',
              fontSize: '16px'
            }}
          >
            🔐 Admin Login
            <div style={{ fontSize: '12px', marginTop: '5px', opacity: '0.8' }}>
              Manage notifications and web scraping
            </div>
          </Link>

          <Link 
            to="/login" 
            className="btn btn-success"
            style={{ 
              padding: '15px 20px',
              textDecoration: 'none',
              display: 'block',
              textAlign: 'center',
              fontSize: '16px'
            }}
          >
            👤 User Login
            <div style={{ fontSize: '12px', marginTop: '5px', opacity: '0.8' }}>
              View government notifications
            </div>
          </Link>

          <Link 
            to="/register" 
            className="btn btn-secondary"
            style={{ 
              padding: '15px 20px',
              textDecoration: 'none',
              display: 'block',
              textAlign: 'center',
              fontSize: '16px'
            }}
          >
            📝 Register as User
            <div style={{ fontSize: '12px', marginTop: '5px', opacity: '0.8' }}>
              Create a new user account
            </div>
          </Link>
        </div>

        <div style={{ 
          marginTop: '30px', 
          padding: '15px', 
          background: '#f8f9fa', 
          borderRadius: '8px',
          fontSize: '12px',
          color: '#666'
        }}>
          <strong>Default Admin Credentials:</strong><br />
          Email: admin@govnav.com<br />
          Password: admin123
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
