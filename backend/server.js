const dotenv = require('dotenv');
dotenv.config();
const connectDB = require('./config/db');
const app = require('./app');
const cron = require('node-cron');
const batchLearningService = require('./services/batchLearningService');

connectDB();

const PORT = process.env.PORT || 5000;


// Scheduled to run at the start of every hour (e.g., 1:00, 2:00, etc.)
cron.schedule('0 * * * *', async () => {
  try {
    await batchLearningService.runBatchTraining();
  } catch (error) {
    console.error("[CRON] ❌ Error during batch training:", error);
  }
});

const server = app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`);
    server.close(() => process.exit(1));
});

module.exports = server;
