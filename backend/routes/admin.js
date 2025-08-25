const express = require('express');
const Notification = require('../models/Notification');
const GovernmentScraper = require('../services/scraper');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();
const scraper = new GovernmentScraper();

// Debug middleware for admin routes
router.use((req, res, next) => {
  console.log(`Admin route hit: ${req.method} ${req.path}`);
  console.log('User authenticated:', !!req.user);
  next();
});

// Admin scrape endpoint - allows admin to scrape any website
router.post('/scrape', adminAuth, async (req, res) => {
  console.log('Admin scrape endpoint hit - POST /api/admin/scrape');
  console.log('User:', req.user?.email, 'isAdmin:', req.user?.isAdmin, 'role:', req.user?.role);
  
  try {
    const { url, maxDepth = 2, maxPages = 20 } = req.body;

    if (!url) {
      return res.status(400).json({ message: 'URL is required' });
    }

    console.log('Admin starting scrape for:', url);
    console.log('Environment check - VERCEL:', process.env.VERCEL);
    console.log('Environment check - NODE_ENV:', process.env.NODE_ENV);

    // Use the advanced crawler for comprehensive scraping
    const result = await scraper.crawlGovernmentSite(url, {
      maxDepth: parseInt(maxDepth),
      maxPages: parseInt(maxPages)
    });

    console.log('Scraping completed. Result:', {
      notificationCount: result.notifications?.length || 0,
      crawlStats: result.crawlStats
    });

    if (!result.notifications || result.notifications.length === 0) {
      return res.status(404).json({
        message: 'No notifications found on the specified website',
        crawlStats: result.crawlStats
      });
    }

    const processedNotifications = [];

    // Process each scraped item
    for (const item of result.notifications) {
      try {
        // Check if notification already exists (avoid duplicates)
        const existingNotification = await Notification.findOne({
          title: item.title,
          sourceUrl: item.url || url
        });

        if (existingNotification) {
          console.log('Notification already exists:', item.title);
          continue;
        }

        // Generate summary
        const summary = await scraper.summarizeContent(item.content, item.title);

        // Categorize the notification
        const category = scraper.categorizeNotification(item.title, item.content);

        // Calculate metadata
        const wordCount = item.content.split(' ').length;
        const readingTime = scraper.calculateReadingTime(item.content);

        // Create new notification (scraped by admin)
        const notification = new Notification({
          title: item.title,
          content: item.content,
          summary: summary,
          sourceUrl: item.url || url,
          sourceDomain: new URL(item.url || url).hostname,
          category: category,
          scrapedBy: req.user._id, // Admin user ID
          metadata: {
            wordCount: wordCount,
            readingTime: readingTime,
            importance: wordCount > 500 ? 'high' : wordCount > 200 ? 'medium' : 'low'
          }
        });

        await notification.save();
        processedNotifications.push(notification);

      } catch (itemError) {
        console.error('Error processing item:', item.title, itemError);
        continue;
      }
    }

    res.json({
      message: 'Admin scraping completed successfully',
      scrapedCount: result.notifications.length,
      newNotifications: processedNotifications.length,
      notifications: processedNotifications,
      crawlStats: result.crawlStats
    });

  } catch (error) {
    console.error('Admin scrape error:', error);
    console.error('Error stack:', error.stack);
    
    // More detailed error response for debugging
    const errorResponse = {
      message: 'Error occurred during scraping',
      error: error.message,
      url: req.body.url,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        hasGeminiKey: !!process.env.GEMINI_API_KEY
      }
    };
    
    // Don't expose sensitive info in production
    if (process.env.NODE_ENV !== 'production') {
      errorResponse.stack = error.stack;
    }
    
    res.status(500).json(errorResponse);
  }
});

// Get all notifications in database (admin view)
router.get('/notifications', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50, category, sortBy = 'alphabetical', domain } = req.query;
    const skip = (page - 1) * limit;

    let query = { isActive: true };

    if (category && category !== 'all') {
      query.category = category;
    }

    if (domain && domain !== 'all') {
      query.sourceDomain = domain;
    }

    // Determine sort order
    let sortOptions = {};
    switch (sortBy) {
      case 'alphabetical':
        sortOptions = { title: 1 }; // Ascending alphabetical order
        break;
      case 'date':
        sortOptions = { publishedDate: -1 }; // Most recent first
        break;
      case 'category':
        sortOptions = { category: 1, title: 1 }; // Category first, then alphabetical
        break;
      default:
        sortOptions = { title: 1 }; // Default to alphabetical
    }

    const notifications = await Notification.find(query)
      .populate('scrapedBy', 'firstName lastName email')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(query);
    const filteredCount = await Notification.countDocuments(query);

    res.json({
      notifications,
      pagination: {
        current: parseInt(page),
        totalPages: Math.ceil(total / limit),
        hasNext: skip + notifications.length < total,
        hasPrev: page > 1,
        filteredCount: filteredCount
      }
    });
  } catch (error) {
    console.error('Admin get notifications error:', error);
    res.status(500).json({ message: 'Server error fetching notifications' });
  }
});

// Delete notification (admin only)
router.delete('/notifications/:id', adminAuth, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Admin delete notification error:', error);
    res.status(500).json({ message: 'Server error deleting notification' });
  }
});

// Bulk delete notifications by filters
router.delete('/notifications/bulk', adminAuth, async (req, res) => {
  try {
    const { category, domain } = req.query;

    let query = { isActive: true };

    if (category && category !== 'all') {
      query.category = category;
    }

    if (domain && domain !== 'all') {
      query.sourceDomain = domain;
    }

    // Soft delete all notifications matching the filters
    const result = await Notification.updateMany(
      query,
      { isActive: false }
    );

    let filterDescription = 'all notifications';
    if (category !== 'all' && domain !== 'all') {
      filterDescription = `notifications from category: ${category} and domain: ${domain}`;
    } else if (category !== 'all') {
      filterDescription = `notifications from category: ${category}`;
    } else if (domain !== 'all') {
      filterDescription = `notifications from domain: ${domain}`;
    }

    res.json({
      message: `Successfully deleted ${result.modifiedCount} ${filterDescription}`,
      deletedCount: result.modifiedCount,
      category: category,
      domain: domain
    });
  } catch (error) {
    console.error('Admin bulk delete notifications error:', error);
    res.status(500).json({ message: 'Server error deleting notifications' });
  }
});

// Get admin dashboard stats
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const totalNotifications = await Notification.countDocuments({ isActive: true });
    const todayNotifications = await Notification.countDocuments({
      isActive: true,
      createdAt: { $gte: new Date().setHours(0, 0, 0, 0) }
    });

    const categoryStats = await Notification.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const domainStats = await Notification.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$sourceDomain', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      total: totalNotifications,
      today: todayNotifications,
      categories: categoryStats,
      topDomains: domainStats
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ message: 'Server error fetching admin statistics' });
  }
});

// Get category statistics with proper counts
router.get('/categories', adminAuth, async (req, res) => {
  try {
    const categoryStats = await Notification.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { _id: 1 } } // Alphabetical order by category name
    ]);

    // Get total count
    const totalNotifications = await Notification.countDocuments({ isActive: true });

    // Format response with proper category names and ensure all categories are included
    const allCategories = [
      'agriculture', 'education', 'employment', 'environment', 'finance',
      'general', 'health', 'infrastructure', 'legal', 'taxation', 'welfare'
    ];

    const formattedStats = allCategories.map(category => {
      const stat = categoryStats.find(s => s._id === category);
      return {
        category: category,
        displayName: category.charAt(0).toUpperCase() + category.slice(1),
        count: stat ? stat.count : 0
      };
    }).sort((a, b) => a.displayName.localeCompare(b.displayName));

    res.json({
      categories: formattedStats,
      total: totalNotifications
    });
  } catch (error) {
    console.error('Admin categories error:', error);
    res.status(500).json({ message: 'Server error fetching category statistics' });
  }
});

// Get all domains with notification counts
router.get('/domains', adminAuth, async (req, res) => {
  try {
    const domainStats = await Notification.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$sourceDomain', count: { $sum: 1 } } },
      { $sort: { _id: 1 } } // Alphabetical order by domain name
    ]);

    const domains = domainStats.map(stat => stat._id).filter(domain => domain);

    res.json(domains);
  } catch (error) {
    console.error('Admin domains error:', error);
    res.status(500).json({ message: 'Server error fetching domains' });
  }
});

// Bulk delete notifications by domain
router.delete('/domains/:domain', adminAuth, async (req, res) => {
  try {
    const domain = decodeURIComponent(req.params.domain);

    if (!domain) {
      return res.status(400).json({ message: 'Domain is required' });
    }

    // Soft delete all notifications from this domain
    const result = await Notification.updateMany(
      { sourceDomain: domain, isActive: true },
      { isActive: false }
    );

    res.json({
      message: `Successfully deleted ${result.modifiedCount} notifications from domain: ${domain}`,
      deletedCount: result.modifiedCount,
      domain: domain
    });
  } catch (error) {
    console.error('Admin delete domain error:', error);
    res.status(500).json({ message: 'Server error deleting domain notifications' });
  }
});

module.exports = router;
