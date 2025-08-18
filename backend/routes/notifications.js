const express = require('express');
const Notification = require('../models/Notification');
const GovernmentScraper = require('../services/scraper');
const auth = require('../middleware/auth');

const router = express.Router();
const scraper = new GovernmentScraper();

// Get all notifications for authenticated user (only their own scraped data)
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, category } = req.query;
    const skip = (page - 1) * limit;
    
    // Only show notifications scraped by the current user
    let query = { 
      isActive: true, 
      scrapedBy: req.user._id 
    };
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    const notifications = await Notification.find(query)
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
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error fetching notifications' });
  }
});

// Get single notification by ID (only if scraped by current user)
router.get('/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      scrapedBy: req.user._id
    });
    
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
    
    // Scrape the government website
    const scrapedData = await scraper.scrapeGovernmentSite(targetUrl);
    
    if (!scrapedData || scrapedData.length === 0) {
      return res.status(404).json({ 
        message: 'No notifications found on the specified website',
        scrapedCount: 0 
      });
    }
    
    const processedNotifications = [];
    
    // Process each scraped item
    for (const item of scrapedData) {
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
      scrapedCount: scrapedData.length,
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

// Get notification statistics (only for current user's data)
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const userQuery = { isActive: true, scrapedBy: req.user._id };
    
    const totalNotifications = await Notification.countDocuments(userQuery);
    const todayNotifications = await Notification.countDocuments({
      ...userQuery,
      createdAt: { $gte: new Date().setHours(0, 0, 0, 0) }
    });
    
    const categoryStats = await Notification.aggregate([
      { $match: userQuery },
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
