# Naaya Backend API

Backend API for the Naaya social networking platform built with Node.js, Express, and MongoDB.

## 🚀 Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Start production server**
   ```bash
   npm start
   ```

## 📁 Project Structure

```
backend/
├── config/                 # Configuration files
│   ├── database.js        # MongoDB connection
│   └── i18n.js            # Internationalization config
├── locales/               # Localization files
│   ├── en/                # English translations
│   └── ne/                # Nepali translations
├── middleware/            # Express middleware
│   ├── auth.js           # Authentication middleware
│   └── upload.js         # File upload middleware
├── models/               # MongoDB models
│   ├── User.js
│   ├── Post.js
│   ├── DemoUser.js
│   ├── DemoPost.js
│   ├── Story.js
│   ├── Reel.js
│   ├── Message.js
│   ├── Notification.js
│   └── Report.js
├── routes/               # API routes
│   ├── auth.js
│   ├── users.js
│   ├── posts.js
│   ├── stories.js
│   ├── reels.js
│   ├── messages.js
│   ├── notifications.js
│   ├── passwordReset.js
│   ├── reports.js
│   └── admin.js
├── services/             # Business logic services
│   ├── emailService.js
│   ├── smsService.js
│   ├── notificationService.js
│   └── cleanupService.js
├── utils/                # Utility functions
│   ├── logger.js
│   ├── validation.js
│   └── feedAlgorithm.js
├── server.js             # Main server file
├── package.json
├── package-lock.json
└── env.example           # Environment variables template
```

## 🔧 Environment Variables

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/
JWT_SECRET=your_jwt_secret_key_here
CLIENT_URL=http://localhost:3000
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Posts
- `POST /api/posts` - Create post
- `GET /api/posts/feed` - Get feed
- `GET /api/posts/:id` - Get specific post
- `POST /api/posts/:id/like` - Like/unlike post

### Users
- `GET /api/users/profile/:username` - Get user profile
- `PUT /api/users/profile` - Update profile
- `POST /api/users/follow/:id` - Follow user

### Stories
- `POST /api/stories` - Create story
- `GET /api/stories/feed` - Get stories feed

### Reels
- `POST /api/reels` - Create reel
- `GET /api/reels/feed` - Get reels feed

### Messages
- `POST /api/messages` - Send message
- `GET /api/messages/conversations` - Get conversations

### Notifications
- `GET /api/notifications` - Get notifications
- `POST /api/notifications/:id/read` - Mark notification as read

### Password Reset
- `POST /api/passwordReset/forgot` - Request password reset
- `POST /api/passwordReset/reset` - Reset password

### Reports
- `POST /api/reports` - Create report

### Admin
- `GET /api/admin/users` - Get all users
- `DELETE /api/admin/users/:id` - Delete user

## 🛠️ Development

The server uses nodemon for development with automatic restarts on file changes.

```bash
npm run dev
```

## 📝 Logging

Logs are written to:
- `logs/error.log` - Error logs
- `logs/combined.log` - All logs

## 🔒 Security

- JWT authentication
- Password hashing with bcrypt
- Input validation with express-validator
- Rate limiting
- CORS configuration
- Helmet for security headers
