# नाया (Naaya) - Hyper-Local Social Network for Nepal

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7+-green.svg)](https://www.mongodb.com/)

नाया (Naaya) is a hyper-local social networking platform designed specifically for Nepal, connecting communities through location-based content, bilingual support (English/Nepali), and culturally relevant features.

## 🌟 Overview

Naaya aims to create meaningful connections within Nepal's diverse communities by focusing on:
- **Location-based content** - Discover posts from your city, district, or province
- **Bilingual interface** - Seamless experience in English and Nepali
- **Cultural relevance** - Features tailored for Nepali social norms and traditions
- **Community building** - Connect with people in your local area

## ✨ Features

### Core Features
- **User Authentication** - Secure registration and login with JWT tokens
- **Personalized Feed** - Algorithm-driven content discovery
- **Posts & Media** - Text, image, and video posts with rich interactions
- **Stories** - 24-hour ephemeral content with reactions
- **Reels** - Short-form video content
- **Direct Messaging** - Real-time chat with Socket.io
- **Notifications** - Push notifications and in-app alerts
- **Bookmark Collections** - Organize saved content
- **Reporting System** - Community moderation tools

### Social Features
- **Follow System** - Follow users and see their content
- **Like, Comment, Share** - Full interaction capabilities
- **Hashtags & Tags** - Content discovery through tags
- **Mentions** - Tag users in posts and comments
- **Location Tagging** - Geo-tagged posts for local discovery

### Technical Features
- **Real-time Updates** - Live notifications and messaging
- **Offline Support** - Queue requests when offline
- **Push Notifications** - Web push notifications
- **Responsive Design** - Mobile-first approach
- **Progressive Web App** - Installable on mobile devices
- **Internationalization** - Full i18n support for English/Nepali

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **File Storage**: Cloudinary
- **Real-time**: Socket.io
- **Validation**: Express-validator
- **Security**: Helmet, CORS, Rate limiting
- **Logging**: Winston
- **Email/SMS**: Nodemailer, Twilio, Telerivet

### Frontend
- **Framework**: React 18 with TypeScript
- **UI Library**: Custom CSS and Tailwind CSS (for development)
- **State Management**: React Context + React Query
- **Routing**: React Router v6
- **Forms**: React Hook Form
- **Animations**: Framer Motion
- **Internationalization**: i18next
- **Build Tool**: Create React App

### DevOps & Tools
- **Version Control**: Git
- **Package Manager**: npm
- **Development**: Nodemon, Concurrently
- **Testing**: Jest, React Testing Library
- **Linting**: ESLint
- **Code Formatting**: Prettier

## 🏗️ Architecture

### System Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   (React)       │◄──►│   (Express)     │◄──►│   (MongoDB)     │
│                 │    │                 │    │                 │
│ - Components    │    │ - Routes        │    │ - Users         │
│ - Pages         │    │ - Middleware    │    │ - Posts         │
│ - Services      │    │ - Services      │    │ - Interactions  │
│ - Contexts      │    │ - Utils         │    │ - Notifications │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   External      │
                       │   Services      │
                       │                 │
                       │ - Cloudinary    │
                       │ - Twilio        │
                       │ - Push Service  │
                       └─────────────────┘
```

### Database Schema
- **Users**: Profile information, authentication, preferences
- **Posts**: Content, media, interactions, metadata
- **Stories**: Ephemeral content with expiration
- **Reels**: Short video content
- **Messages**: Direct messaging between users
- **Notifications**: System and user notifications
- **UserInteractions**: Track user engagement patterns
- **Reports**: Content moderation system

### API Architecture
- RESTful API design
- JWT-based authentication
- Rate limiting and security middleware
- Input validation and sanitization
- Error handling and logging
- Pagination for large datasets

## 🚀 Getting Started

### Prerequisites
- Node.js 18 or higher
- MongoDB 7 or higher
- npm or yarn package manager
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/naaya.git
   cd naaya
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp env.example .env
   # Edit .env with your configuration
   npm run dev
   ```

3. **Frontend Setup** (in a new terminal)
   ```bash
   cd frontend
   npm install
   npm start
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

### Environment Configuration

Create `.env` file in the backend directory:

```env
# Environment
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=mongodb://localhost:27017/naaya

# JWT
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d

# Client
CLIENT_URL=http://localhost:3000

# Cloudinary (for file uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email Service (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# SMS Service (optional)
TWILIO_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number

# Push Notifications
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
```

## 📡 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/logout` - Logout user

### Posts Endpoints
- `POST /api/posts` - Create new post
- `GET /api/posts` - Get user's own posts
- `GET /api/posts/feed` - Get personalized feed (fyp, following, explore, trending)
- `GET /api/posts/:id` - Get specific post
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post
- `POST /api/posts/:id/like` - Like/unlike post
- `POST /api/posts/:id/comment` - Add comment
- `POST /api/posts/:id/share` - Share post

### Users Endpoints
- `GET /api/users/profile/:username` - Get user profile
- `PUT /api/users/profile` - Update profile
- `POST /api/users/follow/:id` - Follow/unfollow user
- `GET /api/users/search` - Search users

### Stories Endpoints
- `POST /api/stories` - Create story
- `GET /api/stories/feed` - Get stories feed
- `GET /api/stories/:id` - Get specific story
- `DELETE /api/stories/:id` - Delete story

### Reels Endpoints
- `POST /api/reels` - Create reel
- `GET /api/reels/feed` - Get reels feed
- `GET /api/reels/:id` - Get specific reel
- `POST /api/reels/:id/like` - Like/unlike reel

### Messages Endpoints
- `POST /api/messages` - Send message
- `GET /api/messages/conversations` - Get user conversations
- `GET /api/messages/:conversationId` - Get conversation messages
- `POST /api/messages/:conversationId/read` - Mark messages as read

### Notifications Endpoints
- `GET /api/notifications` - Get user notifications
- `POST /api/notifications/:id/read` - Mark notification as read
- `POST /api/notifications/mark-all-read` - Mark all notifications as read

### Password Reset Endpoints
- `POST /api/passwordReset/forgot` - Request password reset
- `POST /api/passwordReset/reset` - Reset password with token

### Reports Endpoints
- `POST /api/reports` - Create content report
- `GET /api/reports` (admin) - Get reports

### Admin Endpoints
- `GET /api/admin/users` - Get all users
- `GET /api/admin/posts` - Get all posts
- `DELETE /api/admin/users/:id` - Delete user
- `DELETE /api/admin/posts/:id` - Delete post

## 🎯 Feed Algorithm

The platform uses a sophisticated feed ranking algorithm that considers multiple factors:

### Scoring Components
- **Engagement Score**: Likes (1), Comments (3), Shares (5), Saves (2), Views (0.1)
- **Local Score**: City (10), District (5), Province (2)
- **Language Score**: Preferred language match
- **Relationship Score**: Following (1), Not following (0.3)

### Algorithm Implementation
```javascript
// Final Score = (0.3 × Engagement) + (0.4 × Local) + (0.2 × Language) + (0.1 × Relationship)
const finalScore = (0.3 * engagementScore) + (0.4 * localScore) + (0.2 * languageScore) + (0.1 * relationshipScore);
```

### Feed Types
- **FYP (For You Page)**: Personalized content for image posts
- **Following**: Chronological posts from followed users
- **Explore**: Algorithmic discovery content
- **Nearby**: Location-based posts
- **Trending**: High-engagement recent posts

## 🔧 Development

### Project Structure
```
naaya/
├── backend/               # Backend API
│   ├── config/           # Configuration files
│   ├── locales/          # i18n translations
│   ├── middleware/       # Express middleware
│   ├── models/           # MongoDB schemas
│   ├── routes/           # API endpoints
│   ├── services/         # Business logic
│   ├── utils/            # Utilities
│   └── server.js         # Entry point
├── frontend/             # React frontend
│   ├── public/           # Static assets
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── contexts/     # React contexts
│   │   ├── pages/        # Page components
│   │   ├── services/     # API services
│   │   └── utils/        # Utilities
│   └── package.json
├── package.json          # Root package.json
├── TODO.md               # Project tasks
└── README.md             # This file
```

### Development Scripts
```bash
# Backend
cd backend
npm run dev          # Start development server
npm start            # Start production server
npm run generate-vapid  # Generate VAPID keys for push notifications

# Frontend
cd frontend
npm start            # Start development server
npm run build        # Build for production
npm test             # Run tests
```

### Code Quality
- **Linting**: ESLint configuration
- **Formatting**: Prettier
- **TypeScript**: Strict type checking
- **Testing**: Unit and integration tests

## 🚀 Deployment

### Backend Deployment
1. Set production environment variables
2. Build and deploy to server (Heroku, AWS, DigitalOcean, etc.)
3. Set up MongoDB database
4. Configure reverse proxy (nginx)
5. Set up SSL certificate

### Frontend Deployment
1. Build production bundle: `npm run build`
2. Deploy to static hosting (Vercel, Netlify, etc.)
3. Configure environment variables
4. Set up CDN for assets

### Production Checklist
- [ ] Environment variables configured
- [ ] Database connection established
- [ ] File upload service configured
- [ ] Push notification keys generated
- [ ] SSL certificate installed
- [ ] Domain configured
- [ ] Monitoring and logging set up

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/your-feature`
3. **Make your changes** and test thoroughly
4. **Commit your changes**: `git commit -m 'Add some feature'`
5. **Push to the branch**: `git push origin feature/your-feature`
6. **Open a Pull Request**

### Contribution Guidelines
- Follow the existing code style
- Add TypeScript types for new features
- Write tests for new functionality
- Update documentation as needed
- Ensure responsive design for mobile

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with ❤️ for the Nepali community
- Inspired by social platforms that connect people locally
- Special thanks to contributors and the open-source community

## 📞 Support

For support, email support@naaya.com or join our Discord community.

---

**नाया - जहाँ नेपाल जोडिन्छ** 🇳🇵

*Where Nepal Connects*
