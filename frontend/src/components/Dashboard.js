import React, { useState, useEffect } from 'react';
import axios from '../config/axios';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newNotificationsCount, setNewNotificationsCount] = useState(0);
  const [pagination, setPagination] = useState({
    current: 1,
    total: 1,
    hasNext: false,
    hasPrev: false
  });
  const [filters, setFilters] = useState({
    category: 'all',
    page: 1
  });

  useEffect(() => {
    fetchNotifications();
    fetchStats();
    checkForUpdates();
    
    // Check for updates every 30 seconds
    const interval = setInterval(checkForUpdates, 30000);
    return () => clearInterval(interval);
  }, [filters]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/notifications', {
        params: {
          category: filters.category,
          page: filters.page,
          limit: 10
        }
      });
      setNotifications(response.data.notifications);
      setPagination(response.data.pagination || {
        current: 1,
        total: 1,
        hasNext: false,
        hasPrev: false
      });
      setError('');
    } catch (error) {
      setError('Failed to fetch notifications');
      console.error('Fetch notifications error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/notifications/stats/summary');
      setStats(response.data);
    } catch (error) {
      console.error('Fetch stats error:', error);
    }
  };

  const checkForUpdates = async () => {
    try {
      const response = await axios.get('/api/notifications/updates');
      setNewNotificationsCount(response.data.count);
    } catch (error) {
      console.error('Error checking for updates:', error);
    }
  };

  const handleUpdate = async () => {
    setScraping(true);
    setError('');
    setSuccess('');
    
    try {
      // Mark notifications as checked
      await axios.post('/api/notifications/mark-checked');
      
      // Refresh notifications list
      await fetchNotifications();
      await fetchStats();
      
      setNewNotificationsCount(0);
      setSuccess('Notifications updated successfully!');
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update notifications');
    } finally {
      setScraping(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key === 'category' ? 1 : value
    }));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container">
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <h1 className="dashboard-title">Government Notifications Dashboard</h1>
        <p className="dashboard-subtitle">
          Stay updated with the latest government notices and announcements
        </p>
        
        <div className="dashboard-actions">
          <button 
            onClick={handleUpdate} 
            className={`btn btn-success ${newNotificationsCount > 0 ? 'has-updates' : ''}`}
            disabled={scraping}
          >
            {scraping ? 'Updating...' : `🔄 Update ${newNotificationsCount > 0 ? `(${newNotificationsCount} new)` : ''}`}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}
      
      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      {/* Statistics */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{stats.total || 0}</div>
          <div className="stat-label">Total Notifications</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.today || 0}</div>
          <div className="stat-label">Today's Updates</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.categories?.length || 0}</div>
          <div className="stat-label">Categories</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters">
        <div className="filter-group">
          <label>Filter by Category:</label>
          <select 
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            className="filter-select"
          >
            <option value="all">All Categories</option>
            <option value="general">General</option>
            <option value="health">Health</option>
            <option value="education">Education</option>
            <option value="employment">Employment</option>
            <option value="taxation">Taxation</option>
            <option value="legal">Legal</option>
          </select>
        </div>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
              <h3>Welcome to Your Dashboard</h3>
              <p>No notifications available yet. The admin will add new notifications by scraping government websites.</p>
              <p style={{ fontSize: '14px', color: '#666', marginTop: '20px' }}>
                📌 All notifications from the database are displayed here. Click "Update" to check for new notifications.
              </p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div key={notification._id} className="notification-card">
                <div className="notification-header">
                  <div>
                    <h3 className="notification-title">{notification.title}</h3>
                    <div className="notification-meta">
                      <span className="category-badge">{notification.category}</span>
                      <span>📅 {formatDate(notification.publishedDate)}</span>
                      <span>⏱️ {notification.metadata?.readingTime || 1} min read</span>
                      <span>🔗 {notification.sourceDomain}</span>
                      {notification.scrapedBy && (
                        <span>👤 Added by: {notification.scrapedBy.firstName} {notification.scrapedBy.lastName}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="notification-summary">
                  {notification.summary}
                </div>
                
                <div className="notification-actions">
                  <a 
                    href={notification.sourceUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn-link"
                  >
                    Read Full Notice
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      {notifications.length > 0 && pagination.total > 1 && (
        <div className="pagination">
          <button 
            onClick={() => handleFilterChange('page', Math.max(1, filters.page - 1))}
            disabled={!pagination.hasPrev}
            className={!pagination.hasPrev ? 'disabled' : ''}
          >
            Previous
          </button>
          <span>Page {pagination.current} of {pagination.total}</span>
          <button 
            onClick={() => handleFilterChange('page', filters.page + 1)}
            disabled={!pagination.hasNext}
            className={!pagination.hasNext ? 'disabled' : ''}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
