const express = require('express');
const Notification = require('../models/Notification');
const GovernmentScraper = require('../services/scraper');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();
const scraper = new GovernmentScraper();

// Admin scrape endpoint - allows admin to scrape any website
router.post('/scrape', adminAuth, async (req, res) => {
  try {
    const { url, maxDepth = 2, maxPages = 20 } = req.body;
    
    if (!url) {
      return res.status(400).json({ message: 'URL is required' });
    }
    
    console.log('Admin starting scrape for:', url);
    
    // Use the advanced crawler for comprehensive scraping
    const result = await scraper.crawlGovernmentSite(url, {
      maxDepth: parseInt(maxDepth),
      maxPages: parseInt(maxPages)
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
    console.error('Admin scraping error:', error);
    res.status(500).json({ 
      message: 'Error during admin scraping process',
      error: error.message 
    });
  }
});

// Get all notifications in database (admin view)
router.get('/notifications', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50, category } = req.query;
    const skip = (page - 1) * limit;
    
    let query = { isActive: true };
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    const notifications = await Notification.find(query)
      .populate('scrapedBy', 'firstName lastName email')
      .sort({ publishedDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Notification.countDocuments(query);
    
    res.json({
      notifications,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasNext: skip + notifications.length < total,
        hasPrev: page > 1
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

module.exports = router;
