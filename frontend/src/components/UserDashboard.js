import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from '../config/axios';
import './UserDashboard.css';

const UserDashboard = () => {
  const { user, logout } = useAuth();

  console.log('UserDashboard - Current user:', user);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [newCount, setNewCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
      setCurrentPage(1); // Reset to first page when searching
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    fetchAllNotifications();
    fetchCategories();
  }, [currentPage, searchTerm, selectedCategory]);

  const fetchAllNotifications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      });

      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory !== 'all') params.append('category', selectedCategory);

      const response = await axios.get(`/api/notifications?${params}`);
      setNotifications(response.data.notifications);
      setTotalPages(response.data.pagination.totalPages);
      setTotalCount(response.data.pagination.total);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/notifications/stats/summary');
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const checkForUpdates = async () => {
    try {
      setUpdating(true);
      const response = await axios.get('/api/notifications/updates');

      if (response.data.count > 0) {
        setNewCount(response.data.count);
        // Refresh the main list to include new notifications
        setCurrentPage(1); // Reset to first page to see new items
        await fetchAllNotifications();

        // Mark notifications as checked
        await axios.post('/api/notifications/mark-checked');

        alert(`🎉 ${response.data.count} new notifications found and added to your feed!`);
      } else {
        alert('✅ No new notifications found. You\'re up to date!');
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
      alert('❌ Error checking for updates. Please try again.');
    } finally {
      setUpdating(false);
      // Clear new count after a few seconds
      setTimeout(() => setNewCount(0), 3000);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchInput(e.target.value);
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="user-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="user-info">
            <h1>Welcome, {user?.firstName}!</h1>
            <p>Stay updated with the latest government notifications</p>
          </div>
          <div className="header-actions">
            <button
              onClick={checkForUpdates}
              className="update-btn"
              disabled={updating}
            >
              {updating ? 'Checking...' : '🔄 Check for Updates'}
            </button>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-label">Total Notifications:</span>
          <span className="stat-value">{totalCount}</span>
        </div>
        {lastUpdated && (
          <div className="stat-item">
            <span className="stat-label">Last Updated:</span>
            <span className="stat-value">{lastUpdated.toLocaleTimeString()}</span>
          </div>
        )}
        {newCount > 0 && (
          <div className="stat-item new-count">
            <span className="stat-label">New:</span>
            <span className="stat-value">+{newCount}</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="filters-section">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search notifications..."
            value={searchInput}
            onChange={handleSearch}
            className="search-input"
          />
          <button type="submit" className="search-btn">Search</button>
        </form>

        <div className="category-filter">
          <label htmlFor="category">Filter by category:</label>
          <select
            id="category"
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat._id} ({cat.count})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Notifications by Categories */}
      <div className="notifications-section">
        <h2>📋 All Government Notifications</h2>
        {loading ? (
          <div className="loading">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="no-notifications">
            <p>No notifications found matching your criteria.</p>
          </div>
        ) : (
          <>
            {/* Group notifications by category */}
            {categories.map((category) => {
              const categoryNotifications = notifications.filter(n => n.category === category._id);
              if (categoryNotifications.length === 0) return null;

              return (
                <div key={category._id} className="category-section">
                  <h3 className="category-title">
                    <span className={`category-badge ${category._id}`}>
                      {category._id.toUpperCase()}
                    </span>
                    <span className="category-count">({categoryNotifications.length})</span>
                  </h3>

                  <div className="notifications-list">
                    {categoryNotifications.map((notification) => (
                      <div key={notification._id} className="notification-card user">
                        <div className="notification-header">
                          <h4>{notification.title}</h4>
                        </div>

                        <p className="notification-summary">{notification.summary}</p>

                        <div className="notification-meta">
                          <span className="source">📍 {notification.sourceDomain}</span>
                          <span className="date">📅 {new Date(notification.publishedDate).toLocaleDateString()}</span>
                          <span className="time">🕒 {new Date(notification.createdAt).toLocaleTimeString()}</span>
                        </div>

                        <div className="notification-actions">
                          <a
                            href={notification.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="view-original-btn"
                          >
                            View Original →
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Show uncategorized notifications */}
            {(() => {
              const uncategorized = notifications.filter(n => !categories.find(c => c._id === n.category));
              if (uncategorized.length === 0) return null;

              return (
                <div className="category-section">
                  <h3 className="category-title">
                    <span className="category-badge general">UNCATEGORIZED</span>
                    <span className="category-count">({uncategorized.length})</span>
                  </h3>

                  <div className="notifications-list">
                    {uncategorized.map((notification) => (
                      <div key={notification._id} className="notification-card user">
                        <div className="notification-header">
                          <h4>{notification.title}</h4>
                        </div>

                        <p className="notification-summary">{notification.summary}</p>

                        <div className="notification-meta">
                          <span className="source">📍 {notification.sourceDomain}</span>
                          <span className="date">📅 {new Date(notification.publishedDate).toLocaleDateString()}</span>
                          <span className="time">🕒 {new Date(notification.createdAt).toLocaleTimeString()}</span>
                        </div>

                        <div className="notification-actions">
                          <a
                            href={notification.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="view-original-btn"
                          >
                            View Original →
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pagination-controls">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="pagination-btn"
                >
                  ← Previous
                </button>

                <div className="pagination-info">
                  <span>Page {currentPage} of {totalPages}</span>
                  <span className="pagination-total">({totalCount} total notifications)</span>
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="pagination-btn"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
