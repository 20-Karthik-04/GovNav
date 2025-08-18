import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Header.css';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <Link to="/" className="logo">
            <h1>🏛️ Gov Notifications</h1>
          </Link>
          
          <nav className="nav">
            {user ? (
              <div className="user-menu">
                <div className="nav-links">
                  {user.role === 'admin' ? (
                    <>
                      <Link to="/admin" className="nav-link">Admin Panel</Link>
                      <Link to="/dashboard" className="nav-link">User View</Link>
                    </>
                  ) : (
                    <Link to="/dashboard" className="nav-link">Dashboard</Link>
                  )}
                </div>
                <span className="user-greeting">
                  Welcome, {user.firstName} {user.role === 'admin' && '(Admin)'}
                </span>
                <button onClick={handleLogout} className="btn btn-secondary">
                  Logout
                </button>
              </div>
            ) : (
              <div className="auth-links">
                <Link to="/login" className="btn btn-primary">
                  Login
                </Link>
                <Link to="/register" className="btn btn-secondary">
                  Register
                </Link>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
