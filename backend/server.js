const dotenv = require('dotenv');
dotenv.config();
const connectDB = require('./config/db');
const app = require('./app');
const cron = require('node-cron');
const batchLearningService = require('./services/batchLearningService');

connectDB();

const PORT = process.env.PORT || 5000;

cron.schedule('0 * * * *', async () => {
  try {
    await batchLearningService.runBatchTraining();
  } catch (error) {
    console.error("[CRON] Error during batch training:", error);
  }
}, {
  scheduled: true,
  timezone: "Asia/Kolkata"
});

const server = app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

process.on('unhandledRejection', (err, promise) => {
    console.error(`⚠️ Unhandled Promise Rejection: ${err.message}`);
});

module.exports = server;
