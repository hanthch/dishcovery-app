require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Routes
const healthRoutes     = require('./routes/health');
const authRoutes       = require('./routes/auth');
const restaurantRoutes = require('./routes/restaurants');
const postRoutes       = require('./routes/posts');
const userRoutes       = require('./routes/users');
const searchRoutes     = require('./routes/search');
const placesRoutes     = require('./routes/places');
const commentsRoutes   = require('./routes/comments');
const uploadRoutes     = require('./routes/upload');

// Middleware
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// ============================================================
// APP SETUP
// ============================================================
const app = express();
const API_PREFIX = '/api/v1';

// ============================================================
// GLOBAL MIDDLEWARE
// ============================================================

app.use(helmet());
app.use(compression());

// CORS — allow React Native / Expo dev clients
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['*'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ============================================================
// RATE LIMITING
// ============================================================

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  skip: () => process.env.NODE_ENV === 'development',
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts, please try again later.' },
  skip: () => process.env.NODE_ENV === 'development',
});

app.use(API_PREFIX, apiLimiter);
app.use(`${API_PREFIX}/auth`, authLimiter);

// ============================================================
// ROUTES
// ⚠️  ORDER MATTERS: specific routes before parameterized ones
// ============================================================

app.use(`${API_PREFIX}/health`,      healthRoutes);
app.use(`${API_PREFIX}/auth`,        authRoutes);
app.use(`${API_PREFIX}/restaurants`, restaurantRoutes);
app.use(`${API_PREFIX}/posts`,       postRoutes);
app.use(`${API_PREFIX}/users`,       userRoutes);
app.use(`${API_PREFIX}/search`,      searchRoutes);
app.use(`${API_PREFIX}/places`,      placesRoutes);
app.use(`${API_PREFIX}/comments`,    commentsRoutes);
app.use(`${API_PREFIX}/upload`,      uploadRoutes);

// Root redirect
app.get('/', (req, res) => {
  res.json({
    name: 'Dishcovery API',
    version: '1.0.0',
    status: 'running',
    docs: `${API_PREFIX}/health`,
  });
});

// ============================================================
// ERROR HANDLING (must be last)
// ============================================================
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;