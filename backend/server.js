const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const connectDB = require('./config/database');
const path = require('path');

const app = express();

app.set('trust proxy', 'loopback');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: process.env.NODE_ENV === 'production'
        ? ["'self'", "data:", "https:"]
        : ["'self'", "data:", "https:", "http://localhost:5000"],
      mediaSrc: process.env.NODE_ENV === 'production'
        ? ["'self'", "https:"]
        : ["'self'", "https:", "http://localhost:5000"],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(compression());

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : ['http://localhost:3000', 'http://192.168.101.2:3000'];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

app.use(cookieParser());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: {
    message: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl;
  const ip = req.ip || req.connection.remoteAddress;

  console.log(`[${timestamp}] ${method} ${url} - IP: ${ip}`);

  if (['POST', 'PUT', 'PATCH'].includes(method) && req.body) {
    const logBody = { ...req.body };
    if (logBody.password) logBody.password = '[HIDDEN]';
    if (logBody.token) logBody.token = '[HIDDEN]';
    console.log(`Request Body:`, JSON.stringify(logBody));
  }

  next();
});

app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({ error: 'Invalid JSON format' });
      return;
    }
  }
}));

app.use(express.urlencoded({
  extended: true,
  limit: '10mb'
}));

const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:3000';

app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'public, max-age=31536000');

    if (filePath.endsWith('.mp4')) {
      res.setHeader('Content-Type', 'video/mp4');
    }
  }
}));

app.use(express.static(path.join(__dirname, 'public')));

const connectWithRetry = async (retries = 5, delay = 2000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await connectDB();
      console.log('✅ Database connected successfully');
      break;
    } catch (error) {
      console.error(`❌ Database connection attempt ${i + 1} failed:`, error.message);
      if (i < retries - 1) {
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('💥 Failed to connect to database after all retries');
        process.exit(1);
      }
    }
  }
};

const validateEnvironment = () => {
  const requiredEnvVars = ['JWT_SECRET', 'MONGODB_URI'];
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.error('💡 Please check your .env file or environment configuration');
    process.exit(1);
  }

  console.log('✅ Environment validation passed');
};

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

const gracefulShutdown = (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

  server.close((err) => {
    if (err) {
      console.error('❌ Error during server shutdown:', err);
      process.exit(1);
    }

    console.log('✅ Server closed successfully');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('💥 Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts/index'));
app.use('/api/feed', require('./routes/feed'));
app.use('/api/stories', require('./routes/stories'));
app.use('/api/reels', require('./routes/reels'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/password-reset', require('./routes/passwordReset'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/bookmark-collections', require('./routes/bookmarkCollections'));
app.use('/api/welcome', require('./routes/welcome'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Naaya API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

app.use((err, req, res, next) => {
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation Error',
      errors: err.errors,
      code: 'VALIDATION_ERROR'
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      message: 'Invalid ID format',
      code: 'INVALID_ID'
    });
  }

  if (err.code === 'CORS_ERROR') {
    return res.status(403).json({
      message: 'CORS policy violation',
      code: 'CORS_ERROR'
    });
  }

  res.status(err.status || 500).json({
    message: err.message || 'Something went wrong!',
    error: process.env.NODE_ENV === 'production' ? {} : err.stack,
    code: err.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Route not found',
    code: 'ROUTE_NOT_FOUND',
    availableRoutes: [
      '/api/health',
      '/api/welcome',
      '/api/auth',
      '/api/users',
      '/api/posts',
      '/api/stories',
      '/api/reels',
      '/api/messages',
      '/api/password-reset',
      '/api/notifications',
      '/api/reports',
      '/api/admin',
      '/api/bookmark-collections'
    ]
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    validateEnvironment();

    await connectWithRetry();

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check available at: http://localhost:${PORT}/api/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    const io = require('socket.io')(server, {
      cors: {
        origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : ['http://localhost:3000', 'http://192.168.101.2:3000'],
        methods: ["GET", "POST"],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      if (!token) {
        console.warn('⚠️ Socket connection attempt without token');
        return next(new Error('Authentication error: No token provided'));
      }

      jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
          console.warn('⚠️ Socket authentication failed:', err.message);
          return next(new Error('Authentication error: Invalid token'));
        }
        socket.userId = decoded.userId;
        socket.userEmail = decoded.email;
        next();
      });
    });

    io.on('connection', (socket) => {
      console.log(`📱 Socket connected: ${socket.id} (User: ${socket.userId})`);

      socket.join(`user:${socket.userId}`);

      socket.on('join_room', (room) => {
        socket.join(room);
        console.log(`📱 Socket ${socket.id} joined room: ${room}`);
      });

      socket.on('send_message', (data) => {
        socket.to(data.room).emit('receive_message', data);
      });

      socket.on('typing_start', (data) => {
        socket.to(data.room).emit('user_typing', { userId: data.userId, isTyping: true });
      });

      socket.on('typing_stop', (data) => {
        socket.to(data.room).emit('user_typing', { userId: data.userId, isTyping: false });
      });

      socket.on('disconnect', (reason) => {
        console.log(`📱 Socket disconnected: ${socket.id} (Reason: ${reason})`);
      });

      socket.on('connect_error', (error) => {
        console.error('📱 Socket connection error:', error);
      });
    });

    global.io = io;

    try {
      const NotificationService = require('./services/notificationService');
      const notificationService = new NotificationService(io);
      global.notificationService = notificationService;
      console.log('✅ Notification service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize notification service:', error.message);
    }

    module.exports = { app, server, io };

  } catch (error) {
    console.error('💥 Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
