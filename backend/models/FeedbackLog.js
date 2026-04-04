const mongoose = require('mongoose');

const feedbackLogSchema = new mongoose.Schema({
  rating: { type: Number, required: true, min: 1, max: 5 },
  target_type: { type: String, enum: ['segment', 'route'], required: true },
  target_id: { type: mongoose.Schema.Types.Mixed, required: true },
  time_slot: { type: Number, required: true },
  is_processed: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('FeedbackLog', feedbackLogSchema);