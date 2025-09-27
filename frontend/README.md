# नाया (Naaya) Frontend

Frontend client for the Naaya social networking platform, a hyper-local social media app designed for Nepal. Built with React 18, TypeScript, and Material-UI.

## 🌟 Features

- **User Authentication**: Secure login and registration with JWT
- **Posts & Feed**: Create, like, and comment on posts with media support
- **Stories**: 24-hour ephemeral content with reactions
- **Reels**: Short video content feed
- **Direct Messaging**: Real-time chat with Socket.io
- **Bilingual Support**: English and Nepali language support
- **Responsive Design**: Mobile-first UI with Material-UI

## 🛠️ Technology Stack

- **React 18** with TypeScript
- **Material-UI (MUI)** for components
- **React Router** for navigation
- **React Query** for data fetching
- **React Hook Form** for form handling
- **Socket.io Client** for real-time features
- **Framer Motion** for animations
- **i18next** for internationalization

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start development server**
   ```bash
   npm start
   ```

3. **Access the application**
   - Frontend: http://localhost:3000

### Available Scripts

- `npm start` - Runs the app in development mode
- `npm test` - Launches the test runner
- `npm run build` - Builds the app for production
- `npm run eject` - Ejects from Create React App (irreversible)

## 📁 Project Structure

```
client/
├── public/                 # Static assets
├── src/
│   ├── components/         # Reusable UI components
│   ├── contexts/           # React contexts (Auth, Socket)
│   ├── pages/              # Page components
│   ├── services/           # API service functions
│   ├── i18n.ts             # Internationalization config
│   ├── App.tsx             # Main app component
│   ├── index.tsx           # App entry point
│   └── react-app-env.d.ts  # TypeScript declarations
├── package.json
├── tsconfig.json
└── README.md
```

## 🎯 Key Features

- **Responsive Design**: Optimized for mobile and desktop
- **Real-time Updates**: Live notifications and messaging
- **Bilingual UI**: Seamless language switching
- **Accessibility**: WCAG compliant components

## 🤝 Contributing

1. Follow the existing code style
2. Add TypeScript types for new features
3. Test components thoroughly
4. Submit a pull request

---

**नाया - Where Nepal Connects** 🇳🇵
