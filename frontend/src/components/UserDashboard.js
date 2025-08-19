import React, { useState, useEffect } from 'react';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState('all');
  const [domains, setDomains] = useState([]);
  const [sortBy, setSortBy] = useState('alphabetical');

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
    fetchDomains();
  }, [currentPage, searchTerm, selectedCategory, selectedDomain, sortBy]);

  const fetchAllNotifications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      });

      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (selectedDomain !== 'all') params.append('domain', selectedDomain);
      if (sortBy) params.append('sort', sortBy);

      const response = await axios.get(`/api/notifications?${params}`);
      console.log('UserDashboard - Notifications response:', response.data);
      setNotifications(response.data.notifications);
      setTotalPages(response.data.pagination.totalPages);
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


  const fetchDomains = async () => {
    try {
      const response = await axios.get('/api/notifications/domains');
      setDomains(response.data || []);
    } catch (error) {
      console.error('Error fetching domains:', error);
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

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="user-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-text">
            <h1><i className="fas fa-user-circle"></i> Welcome, {user?.firstName}!</h1>
            <p>Stay updated with the latest government notifications</p>
            <div className="user-badge">
              <i className="fas fa-bell"></i> Government Notice Platform
            </div>
          </div>
          <button
            onClick={checkForUpdates}
            className="update-btn"
            disabled={updating}
          >
            {updating ? (
              <>
                <span className="spinner"></span> Checking...
              </>
            ) : (
              <>
                <i className="fas fa-sync-alt"></i> Check for Updates
              </>
            )}
          </button>
          <button onClick={handleLogout} className="logout-btn">
            <i className="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      </div>


      {/* Search Row */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2><i className="fas fa-search"></i> Search Notifications</h2>
        </div>

        <div className="search-row">
          <form onSubmit={(e) => e.preventDefault()} className="search-form">
            <div className="form-group">
              <label htmlFor="search"><i className="fas fa-search"></i> Search</label>
              <input
                type="text"
                id="search"
                placeholder="Search notifications..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="form-control"
              />
            </div>
          </form>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2><i className="fas fa-tags"></i> Category Breakdown</h2>
        </div>

        <div className="notifications-filters">
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="form-control"
          >
            <option value="all">All Categories</option>
            {categories.map((categoryData) => (
              <option key={categoryData.category} value={categoryData.category}>
                {categoryData.displayName} ({categoryData.count})
              </option>
            ))}
          </select>

          <select
            value={selectedDomain}
            onChange={(e) => {
              setSelectedDomain(e.target.value);
              setCurrentPage(1);
            }}
            className="form-control"
          >
            <option value="all">All Domains</option>
            {domains.map((domain) => (
              <option key={domain} value={domain}>{domain}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="form-control"
          >
            <option value="alphabetical">Alphabetical</option>
            <option value="date">Date</option>
          </select>
        </div>
      </div>

      {/* Notifications by Categories */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2><i className="fas fa-file-alt"></i> All Government Notifications</h2>
          <div className="section-info">
            <span>Showing {notifications.length} notifications</span>
          </div>
        </div>

        {loading ? (
          <div className="loading">
            <i className="fas fa-spinner fa-spin"></i>
            <p>Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="no-notifications">
            <i className="fas fa-inbox"></i>
            <p>No notifications found matching your criteria.</p>
          </div>
        ) : (
          <>
            <div className="notifications-list">
              {notifications.map((notification) => (
                <div key={notification._id} className="notification-card">
                  <div className="notification-header">
                    <h4>{notification.title}</h4>
                    <span className={`category-badge ${notification.category}`}>
                      {notification.category ? notification.category.charAt(0).toUpperCase() + notification.category.slice(1) : 'General'}
                    </span>
                  </div>

                  <p className="notification-summary">{notification.summary}</p>

                  <div className="notification-meta">
                    <div className="meta-item">
                      <i className="fas fa-external-link-alt"></i>
                      <span>{notification.sourceDomain}</span>
                    </div>
                    <div className="meta-item">
                      <i className="fas fa-calendar"></i>
                      <span>{new Date(notification.publishedDate).toLocaleDateString()}</span>
                    </div>
                    <div className="meta-item">
                      <i className="fas fa-clock"></i>
                      <span>{new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  <div className="notification-actions">
                    <a
                      href={notification.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="source-link"
                    >
                      View Original <i className="fas fa-arrow-right"></i>
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="pagination-btn"
                >
                  <i className="fas fa-chevron-left"></i> Previous
                </button>

                <div className="pagination-info">
                  <span>Page {currentPage} of {totalPages}</span>
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="pagination-btn"
                >
                  Next <i className="fas fa-chevron-right"></i>
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