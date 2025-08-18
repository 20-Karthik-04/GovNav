import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import AdminLogin from './components/AdminLogin';
import UserDashboard from './components/UserDashboard';
import AdminDashboard from './components/AdminDashboard';
import LandingPage from './components/LandingPage';

const ProtectedRoute = ({ children, adminOnly = false, userOnly = false }) => {
  const { user, loading } = useAuth();

  console.log('ProtectedRoute - User:', user, 'AdminOnly:', adminOnly, 'UserOnly:', userOnly);
  console.log('Current path:', window.location.pathname);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Force admin users to admin route if they're on dashboard
  if (user.isAdmin && window.location.pathname === '/dashboard') {
    console.log('Admin user detected on dashboard, redirecting to /admin');
    return <Navigate to="/admin" replace />;
  }

  // Admin trying to access user-only route
  if (userOnly && user.isAdmin) {
    console.log('Redirecting admin to /admin');
    return <Navigate to="/admin" replace />;
  }

  // Non-admin trying to access admin-only route
  if (adminOnly && !user.isAdmin) {
    console.log('Redirecting non-admin to /dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  console.log('Rendering protected content for:', adminOnly ? 'ADMIN' : 'USER');
  console.log('Component to render:', adminOnly ? 'AdminDashboard' : 'UserDashboard');
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute userOnly={true}>
                  <UserDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute adminOnly={true}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
