const playwright = require("playwright-core");
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

const { GoogleGenerativeAI } = require('@google/generative-ai');

class GovernmentScraper {
  constructor() {
    // --- Your existing initialization code (unchanged) ---
    if (!process.env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY not found. AI summarization will use fallback method.');
      this.genAI = null;
      this.model = null;
    } else {
      try {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        console.log('Google Generative AI initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Google Generative AI:', error);
        this.genAI = null;
        this.model = null;
      }
    }

    this.visitedUrls = new Set();
    this.urlQueue = [];
    this.maxDepth = 2;
    this.maxPages = 20;
    this.crawledPages = 0;
    this.baseUrl = null;
    this.allowedDomains = new Set();

    this.aiRequestCount = 0;
    this.aiRequestWindow = Date.now();
    this.maxAiRequestsPerMinute = 25;

    this.robotsCache = new Map();
    this.crawlStats = {
      startTime: null,
      endTime: null,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      robotsChecked: [],
      visitedDomains: new Set()
    };

    this.userAgent = 'CivicSphereBot/1.0 (Government Transparency Tool; contact: admin@civicsphere.com)';
    this.governmentDelayMs = 3000;
    this.regularDelayMs = 1000;
  }

  async crawlGovernmentSite(startUrl, options = {}) {
    const {
      maxDepth = 3,
      maxPages = 50,
      allowedDomains = [],
      delay = null
    } = options;

    this.maxDepth = maxDepth;
    this.maxPages = maxPages;
    this.baseUrl = new URL(startUrl);
    this.allowedDomains = new Set([this.baseUrl.hostname, ...allowedDomains]);

    this.crawlStats.startTime = new Date();
    this.crawlStats.totalRequests = 0;
    this.crawlStats.successfulRequests = 0;
    this.crawlStats.failedRequests = 0;
    this.crawlStats.visitedDomains.add(this.baseUrl.hostname);

    await this.checkLegalCompliance(startUrl);

    const robotsAllowed = await this.checkRobotsTxt(startUrl);
    if (!robotsAllowed) {
      throw new Error(`Crawling not allowed by robots.txt for ${this.baseUrl.hostname}`);
    }

    this.visitedUrls.clear();
    this.urlQueue = [{ url: startUrl, depth: 0 }];
    this.crawledPages = 0;

    const crawlDelay = delay || this.determineDelay(this.baseUrl.hostname);
    console.log(`⏱️ Using ${crawlDelay}ms delay for ${this.baseUrl.hostname}`);

    const allNotifications = [];
    let browser;

    try {
      // Use puppeteer with chromium for Vercel serverless compatibility
      const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
      
      if (isProduction) {
        // Production/Vercel environment
        browser = await puppeteer.launch({
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath(),
          headless: chromium.headless,
          ignoreHTTPSErrors: true,
        });
      } else {
        // Local development
        const { chromium: playwrightChromium } = require('playwright');
        browser = await playwrightChromium.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
          ]
        });
      }

      let context;
      if (isProduction) {
        // Puppeteer context for production
        context = browser;
      } else {
        // Playwright context for development
        context = await browser.newContext({
          userAgent: this.userAgent,
          extraHTTPHeaders: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
          }
        });
      }

      while (this.urlQueue.length > 0 && this.crawledPages < this.maxPages) {
        const { url, depth } = this.urlQueue.shift();

        if (this.visitedUrls.has(url) || depth > this.maxDepth) {
          continue;
        }

        console.log(`Crawling: ${url} (depth: ${depth})`);

        try {
          const pageData = await this.scrapePage(context, url, depth, isProduction);
          allNotifications.push(...pageData.notifications);

          if (depth < this.maxDepth) {
            pageData.links.forEach(link => {
              if (!this.visitedUrls.has(link) && this.isValidUrl(link)) {
                this.urlQueue.push({ url: link, depth: depth + 1 });
              }
            });
          }

          this.visitedUrls.add(url);
          this.crawledPages++;

          if (crawlDelay > 0) {
            console.log(`⏳ Waiting ${crawlDelay}ms before next request...`);
            await new Promise(resolve => setTimeout(resolve, crawlDelay));
          }

          this.crawlStats.successfulRequests++;
        } catch (error) {
          console.error(`❌ Error crawling ${url}:`, error.message);
          this.visitedUrls.add(url);
          this.crawlStats.failedRequests++;
        }

        this.crawlStats.totalRequests++;
      }

      this.crawlStats.endTime = new Date();
      const duration = this.crawlStats.endTime - this.crawlStats.startTime;

      return {
        notifications: allNotifications,
        crawlStats: {
          ...this.crawlStats,
          duration,
          totalPages: this.crawledPages,
          totalUrls: this.visitedUrls.size,
          notificationsFound: allNotifications.length,
          visitedDomains: Array.from(this.crawlStats.visitedDomains)
        }
      };
    } catch (error) {
      console.error('Crawling error:', error);
      throw new Error(`Failed to crawl government site: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  async scrapePage(context, url, depth, isProduction = false) {
    const page = isProduction ? await context.newPage() : await context.newPage();
    
    if (isProduction) {
      // Set user agent for puppeteer
      await page.setUserAgent(this.userAgent);
      await page.setExtraHTTPHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      });
    }

    try {
      console.log(`🌐 Fetching: ${url}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

      const pageData = await page.evaluate((currentDepth) => {
        const notifications = [];
        const links = [];

        // Function to check if element is meaningful content (not navigation/footer/ads)
        const isContentElement = (element) => {
          const excludeSelectors = [
            'nav', 'header', 'footer', '.nav', '.navbar', '.menu', '.sidebar',
            '.breadcrumb', '.pagination', '.advertisement', '.ad', '.banner',
            '.social', '.share', '.cookie', '.popup', '.modal', '.overlay',
            'script', 'style', 'noscript'
          ];

          return !excludeSelectors.some(selector =>
            element.closest(selector) || element.matches(selector)
          );
        };

        // Universal content extraction that works for any website
        const extractUniversalContent = () => {
          const hostname = window.location.hostname;
          const extractedItems = [];

          // Strategy 1: Site-specific optimized extraction
          if (hostname.includes('news.ycombinator.com')) {
            return extractHackerNewsContent();
          } else if (hostname.includes('books.toscrape.com')) {
            return extractBooksContent();
          }

          // Strategy 2: Generic content extraction for unknown sites
          return extractGenericContent();
        };

        // Hacker News specific extraction
        const extractHackerNewsContent = () => {
          const stories = [];
          const storyRows = document.querySelectorAll('.athing');

          storyRows.forEach((row, index) => {
            if (index >= 30) return; // Limit to 30 stories

            const titleElement = row.querySelector('.titleline > a');
            const scoreElement = row.nextElementSibling?.querySelector('.score');
            const commentsElement = row.nextElementSibling?.querySelector('a[href*="item?id="]:last-child');
            const ageElement = row.nextElementSibling?.querySelector('.age');
            const authorElement = row.nextElementSibling?.querySelector('.hnuser');

            if (titleElement) {
              const title = titleElement.textContent?.trim();
              const url = titleElement.href;
              const score = scoreElement?.textContent?.trim() || '0 points';
              const comments = commentsElement?.textContent?.trim() || '0 comments';
              const age = ageElement?.textContent?.trim() || 'unknown';
              const author = authorElement?.textContent?.trim() || 'unknown';

              if (title &&
                title.length > 5) {

                stories.push({
                  title: title,
                  content: `${score} by ${author} ${age} | ${comments}`,
                  url: url || window.location.href,
                  type: 'news',
                  metadata: { score, author, age, comments }
                });
              }
            }
          });

          return stories;
        };

        // Books.toscrape.com specific extraction
        const extractBooksContent = () => {
          const books = [];
          const bookElements = document.querySelectorAll('article.product_pod');

          bookElements.forEach((element, index) => {
            if (index >= 50) return;

            const titleElement = element.querySelector('h3 a');
            const priceElement = element.querySelector('.price_color');
            const imageElement = element.querySelector('img');
            const ratingElement = element.querySelector('[class*="star-rating"]');

            if (titleElement) {
              const title = titleElement.getAttribute('title') || titleElement.textContent?.trim();
              const price = priceElement?.textContent?.trim();
              const imageUrl = imageElement?.src;
              const rating = ratingElement?.className.match(/star-rating (\w+)/)?.[1];

              if (title &&
                title.length > 3) {

                books.push({
                  title: title,
                  content: `Price: ${price || 'N/A'}, Rating: ${rating || 'N/A'}`,
                  url: titleElement.href || window.location.href,
                  price: price,
                  imageUrl: imageUrl,
                  type: 'product'
                });
              }
            }
          });

          return books;
        };

        // Generic content extraction for unknown websites
        const extractGenericContent = () => {
          const extractedItems = [];

          // Strategy 1: Look for common article/content patterns
          const contentSelectors = [
            'article', 'main article', '.article',
            '.post', '.story', '.news-item',
            '.content-item', '.list-item',
            'main .content', '.main-content',
            '[role="article"]'
          ];

          for (const selector of contentSelectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
              elements.forEach((element, index) => {
                if (index >= 30 || !isContentElement(element)) return;

                const titleElement = element.querySelector('h1, h2, h3, h4, h5, h6, .title, .heading') ||
                  element.querySelector('a');
                const contentElement = element.querySelector('p, .content, .description, .summary, .excerpt') || element;
                const linkElement = element.querySelector('a') || element.closest('a');
                const imageElement = element.querySelector('img');

                if (titleElement) {
                  const title = titleElement.textContent?.trim();
                  const content = contentElement.textContent?.trim();
                  const href = linkElement?.href;
                  const imageUrl = imageElement?.src;

                  // Enhanced quality filters
                  if (title &&
                    title.length > 10 &&
                    title.length < 300 &&
                    content && content.length > 20 &&
                    !isMetadataText(title) &&
                    !isNavigationText(title)) {

                    extractedItems.push({
                      title: title.substring(0, 200),
                      content: content.substring(0, 1000),
                      url: href || window.location.href,
                      imageUrl: imageUrl,
                      type: 'article'
                    });
                  }
                }
              });
              if (extractedItems.length > 0) return extractedItems;
            }
          }

          // Strategy 2: Fallback to meaningful text blocks
          return extractFallbackContent();
        };

        // Helper function to detect metadata text
        const isMetadataText = (text) => {
          const metadataPatterns = [
            /^\d+\s+(points?|pts?)\s+by\s+/i,
            /^\d+\s+(comments?|hrs?|minutes?|days?)\s+ago/i,
            /^(hide|reply|flag|favorite|share)$/i,
            /^\d+\s+(votes?|likes?|shares?)$/i,
            /^(posted|submitted|by|ago|comments?)\s/i
          ];
          return metadataPatterns.some(pattern => pattern.test(text.trim()));
        };

        // Helper function to detect navigation text
        const isNavigationText = (text) => {
          const navPatterns = [
            /^(home|about|contact|login|register|search|menu|nav)$/i,
            /^(cookie|privacy|terms|subscribe|newsletter)$/i,
            /^(next|previous|more|load|show)\s/i
          ];
          return navPatterns.some(pattern => pattern.test(text.trim()));
        };

        // Fallback content extraction
        const extractFallbackContent = () => {
          const meaningfulTexts = [];
          const textElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');

          textElements.forEach((element, index) => {
            if (index >= 20 || !isContentElement(element)) return;

            const text = element.textContent?.trim();
            if (text &&
              text.length > 15 &&
              text.length < 300 &&
              !isMetadataText(text) &&
              !isNavigationText(text)) {

              const nearbyContent = element.nextElementSibling?.textContent?.trim() ||
                element.parentElement?.textContent?.trim() || text;
              const nearbyLink = element.querySelector('a') || element.closest('a');

              meaningfulTexts.push({
                title: text,
                content: nearbyContent.substring(0, 500),
                url: nearbyLink?.href || window.location.href,
                type: 'content'
              });
            }
          });

          return meaningfulTexts.slice(0, 20); // Limit fallback results
        };

        // Extract content using universal approach
        const extractedContent = extractUniversalContent();
        notifications.push(...extractedContent);

        // Extract meaningful links for crawling (avoid navigation/utility links)
        const linkElements = document.querySelectorAll('a[href]');
        const uniqueLinks = new Set();

        linkElements.forEach(link => {
          const href = link.getAttribute('href');
          const linkText = link.textContent?.trim().toLowerCase();

          // Skip non-content links
          const skipLinkPatterns = [
            'home', 'about', 'contact', 'login', 'register', 'logout',
            'privacy', 'terms', 'cookie', 'subscribe', 'newsletter',
            'facebook', 'twitter', 'instagram', 'linkedin', 'youtube',
            'share', 'print', 'email', 'download'
          ];

          if (href &&
            !href.startsWith('#') &&
            !href.startsWith('mailto:') &&
            !href.startsWith('tel:') &&
            !href.startsWith('javascript:') &&
            !skipLinkPatterns.some(pattern => linkText?.includes(pattern)) &&
            isContentElement(link)) {
            try {
              const absoluteUrl = new URL(href, window.location.origin).href;
              if (!uniqueLinks.has(absoluteUrl)) {
                uniqueLinks.add(absoluteUrl);
                links.push(absoluteUrl);
              }
            } catch (e) {
              // Invalid URL, skip
            }
          }
        });

        return { notifications, links };
      }, depth);

      return pageData;

    } finally {
      await page.close();
    }
  }

  isValidUrl(url) {
    try {
      const urlObj = new URL(url);

      // Check if domain is allowed
      if (!this.allowedDomains.has(urlObj.hostname)) {
        return false;
      }

      // Enhanced filtering for meaningful URLs
      const skipPatterns = [
        // File types
        /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|exe|jpg|jpeg|png|gif|svg|css|js)$/i,
        // System/utility pages
        /\/(login|logout|admin|api|ajax|search|cart|checkout|account)/i,
        // Query parameters that indicate non-content
        /\?.*download/i,
        /\?.*sort=/i,
        /\?.*filter=/i,
        // Fragments
        /#/,
        // Common non-content paths
        /\/(privacy|terms|cookie|about|contact|help|support)$/i
      ];

      // Site-specific URL prioritization
      if (urlObj.hostname.includes('books.toscrape.com')) {
        return url.includes('/catalogue/') || url.includes('/page_');
      }

      // For other sites, use general content URL patterns
      const contentPatterns = [
        /\/(article|post|blog|news|story|product|item)/i,
        /\/\d+/,  // URLs with numbers often contain content
        /\/[a-z-]+\//  // URLs with descriptive paths
      ];

      const hasContentPattern = contentPatterns.some(pattern => pattern.test(url));
      const hasSkipPattern = skipPatterns.some(pattern => pattern.test(url));

      return !hasSkipPattern && (hasContentPattern || url === this.baseUrl?.href);

    } catch (error) {
      return false;
    }
  }

  async summarizeContent(content, title = '') {
    // If no AI model available, use fallback immediately
    if (!this.model) {
      console.log('AI model not available, using fallback summary');
      return this.generateFallbackSummary(content, title);
    }

    try {
      // Rate limiting check
      const now = Date.now();
      if (now - this.aiRequestWindow > 60000) {
        this.aiRequestCount = 0;
        this.aiRequestWindow = now;
      }

      if (this.aiRequestCount >= this.maxAiRequestsPerMinute) {
        console.log('AI rate limit reached, using fallback summary');
        return this.generateFallbackSummary(content, title);
      }

      this.aiRequestCount++;

      const prompt = `Summarize this government notification/content in 2-3 sentences:

Title: ${title}
Content: ${content.substring(0, 2000)}

Summary should be:
- Easy to understand for general public
- Highlight key actions or deadlines
- Mention who is affected
- Keep it concise and actionable`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error('Google Gemini summarization error:', error);
      return this.generateFallbackSummary(content, title);
    }
  }

  generateFallbackSummary(content, title) {
    // Create a simple summary without AI
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const firstTwoSentences = sentences.slice(0, 2).join('. ').trim();

    if (firstTwoSentences.length > 10) {
      return firstTwoSentences + (firstTwoSentences.endsWith('.') ? '' : '.');
    }

    // Fallback to truncation
    return content.length > 200 ? content.substring(0, 200) + '...' : content;
  }

  categorizeNotification(title, content) {
    const text = `${title} ${content}`.toLowerCase();

    // Enhanced categorization with weighted keywords and scoring
    const categories = {
      health: {
        primary: ['health', 'medical', 'hospital', 'doctor', 'medicine', 'vaccine', 'covid', 'disease', 'healthcare', 'clinic', 'treatment', 'patient', 'drug', 'pharmacy', 'ayush', 'medical college', 'nursing', 'ambulance'],
        secondary: ['wellness', 'mental health', 'therapy', 'diagnosis', 'surgery', 'emergency'],
        weight: 1.0
      },
      education: {
        primary: ['education', 'school', 'college', 'university', 'student', 'exam', 'admission', 'scholarship', 'degree', 'certificate', 'academic', 'learning', 'teacher', 'faculty', 'curriculum', 'ugc', 'cbse', 'icse', 'board', 'entrance'],
        secondary: ['study', 'research', 'training', 'course', 'syllabus', 'marks', 'grade'],
        weight: 1.0
      },
      employment: {
        primary: ['job', 'employment', 'recruitment', 'vacancy', 'career', 'hiring', 'work', 'salary', 'wage', 'pension', 'retirement', 'ssc', 'upsc', 'railway', 'government job', 'application', 'interview', 'selection', 'posting'],
        secondary: ['employee', 'employer', 'staff', 'officer', 'clerk', 'manager', 'director'],
        weight: 1.0
      },
      taxation: {
        primary: ['tax', 'gst', 'income tax', 'return', 'refund', 'assessment', 'compliance', 'tds', 'advance tax', 'penalty', 'notice', 'audit', 'exemption', 'deduction', 'itr', 'pan', 'aadhaar'],
        secondary: ['financial', 'revenue', 'duty', 'customs', 'excise', 'service tax'],
        weight: 1.0
      },
      legal: {
        primary: ['legal', 'court', 'law', 'act', 'rule', 'regulation', 'policy', 'order', 'judgment', 'case', 'litigation', 'advocate', 'lawyer', 'justice', 'supreme court', 'high court', 'tribunal', 'amendment', 'bill'],
        secondary: ['rights', 'constitution', 'statute', 'ordinance', 'notification', 'circular'],
        weight: 1.0
      },
      welfare: {
        primary: ['welfare', 'scheme', 'benefit', 'subsidy', 'allowance', 'grant', 'aid', 'support', 'assistance', 'relief', 'compensation', 'pension', 'insurance', 'social security', 'disability', 'widow', 'elderly', 'child'],
        secondary: ['help', 'care', 'protection', 'safety', 'security', 'family'],
        weight: 1.0
      },
      infrastructure: {
        primary: ['infrastructure', 'road', 'bridge', 'transport', 'railway', 'airport', 'port', 'construction', 'development', 'project', 'tender', 'contract', 'electricity', 'water', 'sewage', 'metro', 'bus'],
        secondary: ['building', 'facility', 'maintenance', 'repair', 'upgrade', 'expansion'],
        weight: 1.0
      },
      agriculture: {
        primary: ['agriculture', 'farmer', 'crop', 'farming', 'irrigation', 'fertilizer', 'seed', 'harvest', 'rural', 'village', 'kisan', 'mandi', 'procurement', 'subsidy', 'loan'],
        secondary: ['weather', 'drought', 'flood', 'soil', 'organic', 'pesticide', 'cattle'],
        weight: 1.0
      },
      finance: {
        primary: ['finance', 'bank', 'banking', 'loan', 'credit', 'investment', 'budget', 'fund', 'money', 'financial', 'economic', 'economy', 'market', 'stock', 'bond'],
        secondary: ['interest', 'deposit', 'account', 'transaction', 'payment', 'currency'],
        weight: 1.0
      },
      environment: {
        primary: ['environment', 'pollution', 'climate', 'green', 'forest', 'wildlife', 'conservation', 'renewable', 'solar', 'wind', 'waste', 'recycling'],
        secondary: ['nature', 'ecology', 'sustainable', 'carbon', 'emission', 'clean'],
        weight: 1.0
      }
    };

    // Calculate weighted scores for each category
    const categoryScores = {};

    for (const [category, data] of Object.entries(categories)) {
      let score = 0;

      // Primary keywords get full weight
      const primaryMatches = data.primary.filter(keyword => text.includes(keyword)).length;
      score += primaryMatches * 3 * data.weight;

      // Secondary keywords get half weight
      const secondaryMatches = data.secondary.filter(keyword => text.includes(keyword)).length;
      score += secondaryMatches * 1.5 * data.weight;

      // Bonus for title matches (more important)
      const titleText = title.toLowerCase();
      const titlePrimaryMatches = data.primary.filter(keyword => titleText.includes(keyword)).length;
      const titleSecondaryMatches = data.secondary.filter(keyword => titleText.includes(keyword)).length;
      score += (titlePrimaryMatches * 2) + (titleSecondaryMatches * 1);

      if (score > 0) {
        categoryScores[category] = score;
      }
    }

    // Find the category with highest score
    if (Object.keys(categoryScores).length === 0) {
      return 'general';
    }

    const bestCategory = Object.entries(categoryScores)
      .sort(([, a], [, b]) => b - a)[0][0];

    // Require minimum score threshold to avoid weak categorization
    const minScore = 2;
    if (categoryScores[bestCategory] < minScore) {
      return 'general';
    }

    return bestCategory;
  }

  calculateReadingTime(content) {
    const wordsPerMinute = 200;
    const wordCount = content.split(' ').length;
    return Math.ceil(wordCount / wordsPerMinute);
  }

  // Legal compliance methods
  async checkRobotsTxt(url) {
    try {
      const baseUrl = new URL(url);
      const robotsUrl = `${baseUrl.protocol}//${baseUrl.hostname}/robots.txt`;

      // Check cache first
      if (this.robotsCache.has(baseUrl.hostname)) {
        console.log(`🤖 Using cached robots.txt for ${baseUrl.hostname}`);
        return this.robotsCache.get(baseUrl.hostname);
      }

      console.log(`🤖 Checking robots.txt: ${robotsUrl}`);

      const response = await fetch(robotsUrl, {
        headers: { 'User-Agent': this.userAgent }
      });

      if (!response.ok) {
        console.log(`⚠️ No robots.txt found for ${baseUrl.hostname}, assuming allowed`);
        this.robotsCache.set(baseUrl.hostname, true);
        return true;
      }

      const robotsText = await response.text();
      const isAllowed = this.parseRobotsTxt(robotsText, url);

      this.robotsCache.set(baseUrl.hostname, isAllowed);
      this.crawlStats.robotsChecked.push({ domain: baseUrl.hostname, allowed: isAllowed });

      console.log(`🤖 Robots.txt check for ${baseUrl.hostname}: ${isAllowed ? '✅ Allowed' : '❌ Disallowed'}`);
      return isAllowed;

    } catch (error) {
      console.log(`⚠️ Error checking robots.txt: ${error.message}, assuming allowed`);
      return true;
    }
  }

  parseRobotsTxt(robotsText, targetUrl) {
    const lines = robotsText.split('\n').map(line => line.trim());
    let currentUserAgent = '';
    let isRelevantSection = false;

    for (const line of lines) {
      if (line.startsWith('User-agent:')) {
        currentUserAgent = line.split(':')[1].trim().toLowerCase();
        isRelevantSection = currentUserAgent === '*' ||
          currentUserAgent === 'civicspherebot' ||
          currentUserAgent.includes('bot');
      } else if (isRelevantSection && line.startsWith('Disallow:')) {
        const disallowPath = line.split(':')[1].trim();
        if (disallowPath === '/' || targetUrl.includes(disallowPath)) {
          return false;
        }
      } else if (isRelevantSection && line.startsWith('Crawl-delay:')) {
        const delay = parseInt(line.split(':')[1].trim()) * 1000;
        if (delay > this.governmentDelayMs) {
          this.governmentDelayMs = delay;
          console.log(`⏰ Adjusted delay to ${delay}ms based on robots.txt`);
        }
      }
    }

    return true;
  }

  determineDelay(hostname) {
    const governmentDomains = ['.gov', '.gov.in', '.gov.uk', '.europa.eu', '.gc.ca'];
    const isGovernment = governmentDomains.some(domain => hostname.includes(domain));

    if (isGovernment) {
      console.log(`🏛️ Government domain detected: ${hostname}`);
      return this.governmentDelayMs;
    }

    return this.regularDelayMs;
  }

  async checkLegalCompliance(url) {
    const baseUrl = new URL(url);
    const domain = baseUrl.hostname;

    console.log('⚖️ Legal Compliance Check:');
    console.log(`   Target: ${domain}`);
    console.log(`   User-Agent: ${this.userAgent}`);
    console.log(`   Purpose: Government transparency and civic engagement`);

    // Check for government domains
    const governmentDomains = ['.gov', '.gov.in', '.gov.uk', '.europa.eu', '.gc.ca'];
    const isGovernment = governmentDomains.some(d => domain.includes(d));

    if (isGovernment) {
      console.log('🏛️ Government domain detected - using enhanced compliance measures');
      console.log('   - Increased delays (3+ seconds)');
      console.log('   - Respectful crawling patterns');
      console.log('   - Comprehensive logging');
    }

    // Legal warnings
    console.log('⚠️ Legal Reminders:');
    console.log('   - Ensure compliance with local cyber laws');
    console.log('   - Respect rate limits and robots.txt');
    console.log('   - Use data responsibly for civic purposes');
    console.log('   - Consider official APIs when available');

    return true;
  }
}

module.exports = GovernmentScraper;
