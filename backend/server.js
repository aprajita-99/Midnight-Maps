const dotenv = require('dotenv');
const connectDB = require('./config/db');
const app = require('./app');
const cron = require('node-cron');
const batchLearningService = require('./services/batchLearningService');

dotenv.config();
connectDB();

const PORT = process.env.PORT || 5000;


// For a Hackathon demo, "*/2 * * * *" runs it every 2 minutes. 
// (In a real startup, you'd change this to "0 * * * *" to run once an hour).
cron.schedule('*/2 * * * *', async () => {
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
