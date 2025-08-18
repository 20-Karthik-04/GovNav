# Government Notification

A full-stack application that automatically crawls government websites for notifications, summarizes them using AI, and provides a centralized dashboard for citizens.

## Features

- **Auto-Crawling**: Fetch latest notices from government websites using Playwright
- **AI Summarization**: Generate plain-language summaries using OpenAI API
- **User Authentication**: JWT-based register/login system
- **Notification Dashboard**: React UI displaying latest notices with summaries
- **Manual Updates**: On-demand scraping trigger

## Tech Stack

### Backend
- Node.js + Express.js
- MongoDB + Mongoose
- JWT Authentication (jsonwebtoken + bcryptjs)
- Playwright for web scraping
- OpenAI API for summarization

### Frontend
- React (Create React App)
- React Router for navigation
- Axios for API calls
- CSS Modules for styling

## Setup Instructions

### Backend Setup
1. Navigate to the backend directory: `cd backend`
2. Install dependencies: `npm install`
3. Create `.env` file with required environment variables
4. Start the server: `npm start`

### Frontend Setup
1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Start the development server: `npm start`

## Environment Variables

Create a `.env` file in the backend directory with:
```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
OPENAI_API_KEY=your_openai_api_key
PORT=5000
```

## Deployment

- Backend: Deploy on Heroku or Render
- Frontend: Deploy on Netlify or Vercel
- Database: MongoDB Atlas free tier
