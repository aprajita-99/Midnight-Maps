const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const batchLearningService = require('../services/batchLearningService');
const connectDB = require('../config/db');

// Setup
dotenv.config({ path: path.join(__dirname, '../.env') });

const runFix = async () => {
  try {
    console.log("🚀 Starting manual Data Integrity check & RL Training...");
    
    // 1. Connect to DB
    await connectDB();
    console.log("📡 Connected to MongoDB.");

    // 2. Run the training (which now includes the integrity check)
    await batchLearningService.runBatchTraining();
    
    console.log("\n✅ Done. If you see 'Successfully trained AI' or 'No new feedback', the error is resolved.");
    process.exit(0);
  } catch (err) {
    console.error("\n❌ Manual fix failed:", err);
    process.exit(1);
  }
};

runFix();
