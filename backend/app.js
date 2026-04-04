const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const segmentRoutes = require('./routes/segmentRoutes');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api/segments', segmentRoutes);

// Simple Health Check
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));
app.use((req, res, next) => {
  next();
});
// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Server error' });
});

module.exports = app;
