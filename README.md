# GovNav - Government Notifications System

A comprehensive full-stack application with **Admin** and **User** roles for managing government notifications through web scraping and centralized dashboard access.

## 🚀 Features

### Admin Features
- **Admin Login**: Secure admin authentication with role-based access
- **Web Scraping Interface**: Input any website URL to crawl and extract notifications
- **Advanced Scraping Options**: Configure crawl depth and page limits
- **Notification Management**: View, manage, and delete all notifications in the database
- **Real-time Statistics**: Monitor scraping activity and notification counts

### User Features
- **User Dashboard**: View ALL notifications from the database (not just own data)
- **Real-time Updates**: Check for new notifications with visual indicators
- **Update Button**: Shows count of new notifications since last check
- **Category Filtering**: Filter notifications by category (health, education, etc.)
- **Responsive Design**: Mobile-friendly interface

### System Features
- **AI Summarization**: Generate plain-language summaries using Google Gemini AI
- **Smart Categorization**: Automatic categorization of notifications
- **Legal Compliance**: Respects robots.txt and implements crawl delays
- **Comprehensive Logging**: Detailed crawl statistics and error handling

## 🛠 Tech Stack

### Backend
- **Node.js + Express.js**: RESTful API server
- **MongoDB + Mongoose**: Database and ODM
- **JWT Authentication**: Secure token-based auth with role support
- **Playwright**: Advanced web scraping with browser automation
- **Google Gemini AI**: Content summarization
- **bcryptjs**: Password hashing

### Frontend
- **React 18**: Modern UI with hooks
- **React Router**: Client-side routing with protected routes
- **Axios**: HTTP client with interceptors
- **CSS3**: Custom responsive styling

## 📋 Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- Google Gemini API key

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run create-admin  # Creates admin user
npm run dev           # Start development server
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with backend URL
npm start            # Start React development server
```

## 🔧 Environment Variables

### Backend (.env)
```env
MONGODB_URI=mongodb://localhost:27017/gov-notifications
JWT_SECRET=your-super-secret-jwt-key-here
GEMINI_API_KEY=your-gemini-api-key-here
PORT=4000
```

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:4000
```

## 👤 Default Admin Account

After running `npm run create-admin`:
- **Email**: admin@govnav.com
- **Password**: admin123
- **Role**: Admin

## 🎯 How It Works

### Admin Workflow
1. **Login** as admin using admin credentials
2. **Navigate** to Admin Panel via header navigation
3. **Enter Website URL** in the scraping form
4. **Configure** crawl depth and page limits
5. **Start Scraping** - system crawls website and extracts content
6. **View Results** - new notifications appear in the database
7. **Manage** notifications (view, delete) from admin interface

### User Workflow
1. **Register/Login** as regular user
2. **View Dashboard** - see ALL notifications in database
3. **Check Updates** - click update button to see new notifications
4. **Filter Content** - use category filters to find relevant notifications
5. **Read Details** - click links to view original sources

### System Architecture
- **Role-based Access**: Admin can scrape, users can only view
- **Shared Database**: All users see the same notification pool
- **Real-time Updates**: Users get notified of new content
- **Smart Scraping**: Respects website policies and rate limits

## 🚀 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User/Admin login
- `GET /api/auth/me` - Get current user

### Notifications (User)
- `GET /api/notifications` - Get all notifications
- `GET /api/notifications/updates` - Check for new notifications
- `POST /api/notifications/mark-checked` - Update last check timestamp

### Admin
- `POST /api/admin/scrape` - Scrape website (admin only)
- `GET /api/admin/notifications` - Get all notifications with admin view
- `DELETE /api/admin/notifications/:id` - Delete notification
- `GET /api/admin/stats` - Get admin statistics

## 🔒 Security Features

- **JWT Authentication** with role-based access control
- **Password Hashing** using bcryptjs
- **Protected Routes** on both frontend and backend
- **Input Validation** and sanitization
- **Rate Limiting** for scraping operations
- **Legal Compliance** with robots.txt checking

## 📱 Responsive Design

- Mobile-first CSS design
- Flexible grid layouts
- Touch-friendly interfaces
- Optimized for all screen sizes

## 🎨 UI Features

- **Visual Update Indicators**: Pulsing button when new notifications available
- **Category Badges**: Color-coded notification categories
- **Loading States**: Spinners and disabled states during operations
- **Error Handling**: User-friendly error messages
- **Success Feedback**: Confirmation messages for actions

## 🚀 Deployment

### Backend (Render/Heroku)
```bash
# Set environment variables in hosting platform
# Deploy from GitHub repository
```

### Frontend (Netlify/Vercel)
```bash
# Build command: npm run build
# Publish directory: build
# Set REACT_APP_API_URL to production backend URL
```

### Database (MongoDB Atlas)
- Create free cluster
- Whitelist IP addresses
- Update MONGODB_URI in backend

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

MIT License - see LICENSE file for details
