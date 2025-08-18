const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  summary: {
    type: String,
    required: true
  },
  sourceUrl: {
    type: String,
    required: true
  },
  sourceDomain: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['general', 'health', 'education', 'employment', 'taxation', 'legal'],
    default: 'general'
  },
  publishedDate: {
    type: Date,
    default: Date.now
  },
  scrapedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  scrapedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  metadata: {
    wordCount: Number,
    readingTime: Number, // in minutes
    importance: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    }
  }
}, {
  timestamps: true
});

// Index for efficient querying
notificationSchema.index({ publishedDate: -1 });
notificationSchema.index({ category: 1 });
notificationSchema.index({ sourceDomain: 1 });
notificationSchema.index({ scrapedBy: 1, publishedDate: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
