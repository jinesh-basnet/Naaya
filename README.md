# नाया (Naaya) - Hyper-Local Social Network for Nepal



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


## 🙏 Acknowledgments

- Built with ❤️ for the Nepali community
- Inspired by social platforms that connect people locally
- Special thanks to contributors and the open-source community

## 📞 Support

For support, email support@naaya.com or join our Discord community.

---

**नाया - जहाँ नेपाल जोडिन्छ** 🇳🇵

*Where Nepal Connects*
