import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from '../config/axios';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user, logout } = useAuth();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.title = 'Admin Dashboard - GovNav';
    }
  }, []);

  const [url, setUrl] = useState('');
  const [maxDepth, setMaxDepth] = useState(2);
  const [maxPages, setMaxPages] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  const [scrapeResult, setScrapeResult] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({ total: 0, today: 0, categories: [], topDomains: [] });
  const [statsLoading, setStatsLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('alphabetical');
  const [selectedDomain, setSelectedDomain] = useState('all');
  const [domains, setDomains] = useState([]);
  const [filteredCount, setFilteredCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      await fetchStats();
      await fetchNotifications();
      await fetchCategories();
      await fetchDomains();
    };

    fetchData();
  }, [currentPage, selectedCategory, sortBy, selectedDomain]);

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const response = await axios.get('/api/admin/stats');
      const statsData = {
        total: response.data.total || 0,
        today: response.data.today || 0,
        categories: response.data.categories || [],
        topDomains: response.data.topDomains || []
      };
      setStats(statsData);
    } catch (error) {
      console.error('AdminDashboard - Error fetching stats:', error);
      setStats({ total: 0, today: 0, categories: [], topDomains: [] });
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`/api/admin/notifications?page=${currentPage}&limit=20&category=${selectedCategory}&sort=${sortBy}&domain=${selectedDomain}`);
      setNotifications(response.data.notifications);
      setTotalPages(response.data.pagination.totalPages);
      setFilteredCount(response.data.pagination.filteredCount);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/admin/categories');
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  };

  const fetchDomains = async () => {
    try {
      const response = await axios.get('/api/admin/domains');
      setDomains(response.data);
    } catch (error) {
      console.error('Error fetching domains:', error);
    }
  };

  const deleteNotification = async (id) => {
    if (!window.confirm('Are you sure you want to delete this notification?')) {
      return;
    }

    try {
      await axios.delete(`/api/admin/notifications/${id}`);
      fetchNotifications();
      fetchStats();
    } catch (error) {
      alert('Error deleting notification: ' + (error.response?.data?.message || 'Unknown error'));
    }
  };

  const bulkDeleteNotifications = async () => {
    const filterText = selectedCategory !== 'all' || selectedDomain !== 'all'
      ? `filtered notifications (${filteredCount} items)`
      : `all notifications (${filteredCount} items)`;

    if (!window.confirm(`Are you sure you want to delete ${filterText}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await axios.delete(`/api/admin/notifications/bulk?category=${selectedCategory}&domain=${selectedDomain}`);
      alert(`Successfully deleted ${response.data.deletedCount} notifications`);
      fetchNotifications();
      fetchStats();
      fetchCategories();
    } catch (error) {
      alert('Error deleting notifications: ' + (error.response?.data?.message || 'Unknown error'));
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
      fetchStats();
      fetchNotifications();
      setUrl('');
    } catch (error) {
      setScrapeResult({
        error: true,
        message: error.response?.data?.message || 'Scraping failed'
      });
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div className="header-content">
          <div className="header-text">
            <h1><i className="fas fa-cogs"></i> Admin Dashboard</h1>
            <p>Welcome, {user?.firstName}! Manage web scraping and notifications for Unified Government Notice Platform</p>
            <div className="admin-badge">
              <i className="fas fa-shield-alt"></i>
              ADMIN MODE - Web Scraping Interface
            </div>
          </div>
          <button onClick={logout} className="logout-btn">
            <i className="fas fa-sign-out-alt"></i>
            Logout
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-bell"></i>
          </div>
          <h3>Total Notifications</h3>
          <div className="stat-number">{statsLoading ? '...' : (stats?.total || 0)}</div>
          <div className="stat-subtext">Across all categories</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-calendar-day"></i>
          </div>
          <h3>Today's Notifications</h3>
          <div className="stat-number">{statsLoading ? '...' : (stats?.today || 0)}</div>
          <div className="stat-subtext">Added in last 24 hours</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-tags"></i>
          </div>
          <h3>Categories</h3>
          <div className="stat-number">{statsLoading ? '...' : (stats?.categories?.length || 0)}</div>
          <div className="stat-subtext">Active categories</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <i className="fas fa-globe"></i>
          </div>
          <h3>Top Domains</h3>
          <div className="stat-number">{statsLoading ? '...' : (stats?.topDomains?.length || 0)}</div>
          <div className="stat-subtext">Monitored sources</div>
        </div>
      </div>

      {/* Scraping Section */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2><i className="fas fa-globe-americas"></i> Web Scraping & Crawling</h2>
        </div>
        <p className="section-description">
          Enter a government website URL to crawl and extract notifications automatically.
        </p>

        <form onSubmit={handleScrape} className="scrape-form">
          <div className="form-group">
            <label htmlFor="url"><i className="fas fa-link"></i> Government Website URL</label>
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.gov.in or https://ministry.gov.in"
              required
              disabled={isLoading}
              className="form-control"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="maxDepth"><i className="fas fa-layer-group"></i> Max Depth</label>
              <input
                type="number"
                id="maxDepth"
                value={maxDepth}
                onChange={(e) => setMaxDepth(e.target.value)}
                min="1"
                max="5"
                disabled={isLoading}
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label htmlFor="maxPages"><i className="fas fa-file"></i> Max Pages</label>
              <input
                type="number"
                id="maxPages"
                value={maxPages}
                onChange={(e) => setMaxPages(e.target.value)}
                min="1"
                max="100"
                disabled={isLoading}
                className="form-control"
              />
            </div>
          </div>

          <button type="submit" disabled={isLoading} className="scrape-btn">
            {isLoading ? (
              <>
                <span className="spinner"></span> Scraping...
              </>
            ) : (
              <>
                <i className="fas fa-spider"></i> Start Scraping
              </>
            )}
          </button>
        </form>

        {/* Scrape Results */}
        {scrapeResult && (
          <div className={`scrape-result ${scrapeResult.error ? 'error' : 'success'}`}>
            {scrapeResult.error ? (
              <div>
                <i className="fas fa-exclamation-circle"></i>
                <div>
                  <h3>Scraping Failed</h3>
                  <p>{scrapeResult.message}</p>
                </div>
              </div>
            ) : (
              <div>
                <i className="fas fa-check-circle"></i>
                <div>
                  <h3>Scraping Completed Successfully!</h3>
                  <p>Scraped {scrapeResult.scrapedCount} items, added {scrapeResult.newNotifications} new notifications</p>
                  {scrapeResult.crawlStats && (
                    <div className="crawl-stats">
                      <div className="crawl-stat">
                        <i className="fas fa-clock"></i> Duration: {Math.round(scrapeResult.crawlStats.duration / 1000)}s
                      </div>
                      <div className="crawl-stat">
                        <i className="fas fa-chart-line"></i> Success Rate: {Math.round((scrapeResult.crawlStats.successfulRequests / scrapeResult.crawlStats.totalRequests) * 100)}%
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
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
            {categories && categories.map((category) => (
              <option key={category.category} value={category.category}>{category.displayName}</option>
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
            {domains && domains.map((domain) => (
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

      {/* Notifications Section */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2><i className="fas fa-bell"></i>Notifications</h2>
          <button
            onClick={bulkDeleteNotifications}
            className="delete-btn"
            title="Delete all notifications from selected category and domain"
            disabled={filteredCount === 0}
          >
            <i className="fas fa-trash"></i><h3>Bulk Delete ({filteredCount})</h3>
          </button>

        </div>

        {notifications.length === 0 ? (
          <div className="no-notifications">
            <i className="fas fa-inbox"></i>
            <p>No notifications found. Start by scraping a website above.</p>
          </div>
        ) : (
          <>
            <div className="notifications-list">
              {notifications.map((notification) => (
                <div key={notification._id} className="notification-card">
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
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  </div>

                  <p className="notification-summary">{notification.summary}</p>

                  <div className="notification-meta">
                    <div className="meta-item">
                      <i className="fas fa-external-link-alt"></i>
                      <span>Source: {notification.sourceDomain}</span>
                    </div>
                    <div className="meta-item">
                      <i className="fas fa-user"></i>
                      <span>Scraped by: {notification.scrapedBy?.firstName} {notification.scrapedBy?.lastName}</span>
                    </div>
                    <div className="meta-item">
                      <i className="fas fa-calendar"></i>
                      <span>Date: {new Date(notification.publishedDate).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <a
                    href={notification.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="source-link"
                  >
                    View Original Notification <i className="fas fa-arrow-right"></i>
                  </a>
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

export default AdminDashboard;