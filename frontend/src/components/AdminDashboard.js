import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from '../config/axios';
import './AdminDashboard.css';

const AdminDashboard = () => {
  console.log('🔧 ADMIN DASHBOARD COMPONENT IS LOADING');
  const { user, logout } = useAuth();

  console.log('AdminDashboard - Current user:', user);

  // Add visual confirmation this is admin dashboard
  if (typeof window !== 'undefined') {
    document.title = 'Admin Dashboard - GovNav';
  }

  const [url, setUrl] = useState('');
  const [maxDepth, setMaxDepth] = useState(2);
  const [maxPages, setMaxPages] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  const [scrapeResult, setScrapeResult] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchStats();
    fetchNotifications();
  }, [currentPage]);

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/admin/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`/api/admin/notifications?page=${currentPage}&limit=20`);
      setNotifications(response.data.notifications);
      setTotalPages(response.data.pagination.total);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleScrape = async (e) => {
    e.preventDefault();
    if (!url.trim()) {
      alert('Please enter a URL to scrape');
      return;
    }

    setIsLoading(true);
    setScrapeResult(null);

    try {
      const response = await axios.post('/api/admin/scrape', {
        url: url.trim(),
        maxDepth: parseInt(maxDepth),
        maxPages: parseInt(maxPages)
      });

      setScrapeResult(response.data);
      fetchStats(); // Refresh stats
      fetchNotifications(); // Refresh notifications
      setUrl(''); // Clear form
    } catch (error) {
      setScrapeResult({
        error: true,
        message: error.response?.data?.message || 'Scraping failed'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteNotification = async (id) => {
    if (!window.confirm('Are you sure you want to delete this notification?')) {
      return;
    }

    try {
      await axios.delete(`/api/admin/notifications/${id}`);
      fetchNotifications(); // Refresh list
      fetchStats(); // Refresh stats
    } catch (error) {
      alert('Error deleting notification: ' + (error.response?.data?.message || 'Unknown error'));
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div className="header-content">
          <div>
            <h1>🔧 Admin Dashboard</h1>
            <p>Welcome, {user?.firstName}! Manage web scraping and notifications</p>
            <div style={{
              background: '#e74c3c',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 'bold',
              marginTop: '10px',
              display: 'inline-block'
            }}>
              ADMIN MODE - Web Scraping Interface
            </div>
          </div>
          <button onClick={logout} className="logout-btn">
            Logout
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Notifications</h3>
            <div className="stat-number">{stats.total}</div>
          </div>
          <div className="stat-card">
            <h3>Today's Notifications</h3>
            <div className="stat-number">{stats.today}</div>
          </div>
          <div className="stat-card">
            <h3>Categories</h3>
            <div className="stat-number">{stats.categories.length}</div>
          </div>
          <div className="stat-card">
            <h3>Top Domains</h3>
            <div className="stat-number">{stats.topDomains.length}</div>
          </div>
        </div>
      )}

      {/* Scraping Form */}
      <div className="scrape-section">
        <h2>🌐 Web Scraping & Crawling</h2>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          Enter a government website URL to crawl and extract notifications automatically.
        </p>
        <form onSubmit={handleScrape} className="scrape-form">
          <div className="form-group">
            <label htmlFor="url">Government Website URL:</label>
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.gov.in or https://ministry.gov.in"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="maxDepth">Max Depth:</label>
              <input
                type="number"
                id="maxDepth"
                value={maxDepth}
                onChange={(e) => setMaxDepth(e.target.value)}
                min="1"
                max="5"
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="maxPages">Max Pages:</label>
              <input
                type="number"
                id="maxPages"
                value={maxPages}
                onChange={(e) => setMaxPages(e.target.value)}
                min="1"
                max="100"
                disabled={isLoading}
              />
            </div>
          </div>

          <button type="submit" disabled={isLoading} className="scrape-btn">
            {isLoading ? 'Scraping...' : 'Start Scraping'}
          </button>
        </form>

        {/* Scrape Results */}
        {scrapeResult && (
          <div className={`scrape-result ${scrapeResult.error ? 'error' : 'success'}`}>
            {scrapeResult.error ? (
              <div>
                <h3>Scraping Failed</h3>
                <p>{scrapeResult.message}</p>
              </div>
            ) : (
              <div>
                <h3>Scraping Completed Successfully!</h3>
                <p>Scraped {scrapeResult.scrapedCount} items, added {scrapeResult.newNotifications} new notifications</p>
                {scrapeResult.crawlStats && (
                  <div className="crawl-stats">
                    <p>Duration: {Math.round(scrapeResult.crawlStats.duration / 1000)}s</p>
                    <p>Success Rate: {Math.round((scrapeResult.crawlStats.successfulRequests / scrapeResult.crawlStats.totalRequests) * 100)}%</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notifications List */}
      <div className="notifications-section">
        <h2>All Notifications ({notifications.length})</h2>

        {notifications.length === 0 ? (
          <p className="no-notifications">No notifications found. Start by scraping a website above.</p>
        ) : (
          <>
            <div className="notifications-list">
              {notifications.map((notification) => (
                <div key={notification._id} className="notification-card admin">
                  <div className="notification-header">
                    <h3>{notification.title}</h3>
                    <div className="notification-actions">
                      <span className={`category-badge ${notification.category}`}>
                        {notification.category}
                      </span>
                      <button
                        onClick={() => deleteNotification(notification._id)}
                        className="delete-btn"
                        title="Delete notification"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  <p className="notification-summary">{notification.summary}</p>

                  <div className="notification-meta">
                    <span>Source: {notification.sourceDomain}</span>
                    <span>Scraped by: {notification.scrapedBy?.firstName} {notification.scrapedBy?.lastName}</span>
                    <span>Date: {new Date(notification.publishedDate).toLocaleDateString()}</span>
                  </div>

                  <a
                    href={notification.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="source-link"
                  >
                    View Original →
                  </a>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <span>Page {currentPage} of {totalPages}</span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
