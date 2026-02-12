const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const userRoutes = require('./routes/users');
const restaurantRoutes = require('./routes/restaurants');
const commentRoutes = require('./routes/comments');
const searchRoutes = require('./routes/search');
const locationRoutes = require('./routes/locations');
const challengeRoutes = require('./routes/challenges');
const uploadRoutes = require('./routes/upload');

const app = express();

app.use(helmet());
app.use(cors()); 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/posts', postRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/restaurants', restaurantRoutes);
app.use('/api/v1/comments', commentRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/locations', locationRoutes);
app.use('/api/v1/challenges', challengeRoutes);
app.use('/api/v1/upload', uploadRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

module.exports = app;
