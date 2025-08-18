const express = require('express');
const Notification = require('../models/Notification');
const GovernmentScraper = require('../services/scraper');
const auth = require('../middleware/auth');

const router = express.Router();
const scraper = new GovernmentScraper();

// Get all notifications for authenticated user (ALL database notifications)
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, category, search } = req.query;
    const skip = (page - 1) * limit;

    // Show ALL notifications in database (not just user's own)
    let query = { isActive: true };

    if (category && category !== 'all') {
      query.category = category;
    }

    // Add search functionality
    if (search && search.trim()) {
      query.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { summary: { $regex: search.trim(), $options: 'i' } },
        { content: { $regex: search.trim(), $options: 'i' } }
      ];
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
        totalPages: Math.ceil(total / limit),
        total: total,
        hasNext: skip + notifications.length < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error fetching notifications' });
  }
});

// Get new notifications since user's last check
router.get('/updates', auth, async (req, res) => {
  try {
    const user = req.user;
    const lastCheck = user.lastNotificationCheck || new Date(0);

    const newNotifications = await Notification.find({
      isActive: true,
      createdAt: { $gt: lastCheck }
    })
      .populate('scrapedBy', 'firstName lastName email')
      .sort({ publishedDate: -1 })
      .limit(50);

    res.json({
      newNotifications,
      count: newNotifications.length,
      lastCheck: lastCheck
    });
  } catch (error) {
    console.error('Get updates error:', error);
    res.status(500).json({ message: 'Server error fetching updates' });
  }
});

// Update user's last notification check timestamp
router.post('/mark-checked', auth, async (req, res) => {
  try {
    const User = require('../models/User');
    await User.findByIdAndUpdate(req.user._id, {
      lastNotificationCheck: new Date()
    });

    res.json({ message: 'Notification check timestamp updated' });
  } catch (error) {
    console.error('Mark checked error:', error);
    res.status(500).json({ message: 'Server error updating check timestamp' });
  }
});

// Get single notification by ID (any notification in database)
router.get('/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      isActive: true
    }).populate('scrapedBy', 'firstName lastName email');

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json(notification);
  } catch (error) {
    console.error('Get notification error:', error);
    res.status(500).json({ message: 'Server error fetching notification' });
  }
});

// Manual scrape trigger
router.post('/scrape', auth, async (req, res) => {
  try {
    const { url } = req.body;
    const targetUrl = url;

    console.log('Starting manual scrape for:', targetUrl);

    // Scrape the government website using the new crawler method
    const scrapedData = await scraper.crawlGovernmentSite(targetUrl, { maxDepth: 1, maxPages: 1 });

    if (!scrapedData || !scrapedData.notifications || scrapedData.notifications.length === 0) {
      return res.status(404).json({
        message: 'No notifications found on the specified website',
        scrapedCount: 0
      });
    }

    const processedNotifications = [];

    // Process each scraped item
    for (const item of scrapedData.notifications) {
      try {
        // Check if notification already exists for this user
        const existingNotification = await Notification.findOne({
          title: item.title,
          sourceUrl: item.url,
          scrapedBy: req.user._id
        });

        if (existingNotification) {
          console.log('Notification already exists:', item.title);
          continue;
        }

        // Generate summary using OpenAI
        const summary = await scraper.summarizeContent(item.content, item.title);

        // Categorize the notification
        const category = scraper.categorizeNotification(item.title, item.content);

        // Calculate metadata
        const wordCount = item.content.split(' ').length;
        const readingTime = scraper.calculateReadingTime(item.content);

        // Create new notification linked to current user
        const notification = new Notification({
          title: item.title,
          content: item.content,
          summary: summary,
          sourceUrl: item.url,
          sourceDomain: new URL(item.url).hostname,
          category: category,
          scrapedBy: req.user._id,
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
      message: 'Scraping completed successfully',
      scrapedCount: scrapedData.notifications.length,
      newNotifications: processedNotifications.length,
      notifications: processedNotifications
    });

  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({
      message: 'Error during scraping process',
      error: error.message
    });
  }
});

// Get notification statistics (all database data)
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const query = { isActive: true };

    const totalNotifications = await Notification.countDocuments(query);
    const todayNotifications = await Notification.countDocuments({
      ...query,
      createdAt: { $gte: new Date().setHours(0, 0, 0, 0) }
    });

    const categoryStats = await Notification.aggregate([
      { $match: query },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      total: totalNotifications,
      today: todayNotifications,
      categories: categoryStats
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Server error fetching statistics' });
  }
});

module.exports = router;
