const mongoose = require('mongoose');

const geoPointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (coords) =>
          Array.isArray(coords) &&
          coords.length === 2 &&
          coords.every((value) => Number.isFinite(value)),
        message: 'Location coordinates must be a valid [lng, lat] pair.'
      }
    }
  },
  { _id: false }
);

const feedbackLogSchema = new mongoose.Schema({
  // What type of feedback and what was it about
  segment_ids: [String],
  ratings: [{
    segment_id: String,
    rating: Number,                 // 1-5 stars
    target_score: Number,           // Normalized 0-1 (rating-1)/4
  }],
  
  feedback_type: {
    type: String,
    enum: ['segment', 'route', 'segment_fine_grained'],
    required: true
  },
  
  // Temporal context
  time_slot: { 
    type: Number, 
    required: true,
    min: 0,
    max: 11,
    description: 'Which of the 12 2-hour time slots (0=midnight, 11=10pm)'
  },
  time_slot_confidence: {
    type: Number,
    default: 0.5,
    min: 0,
    max: 1,
    description: 'How confident we are about the time slot (1.0 if user specified, 0.5 if auto-detected)'
  },
  
  // User context and metadata
  user_context: {
    location: {
      type: geoPointSchema,
      default: undefined
    },
    weather: String,
    lighting_conditions: String,       // e.g., "dark", "well-lit", "streetlights on"
    companion_count: Number,           // Alone vs with group
    gender: String,
    time_of_feedback: { type: Date, default: Date.now }
  },
  
  // Feedback quality metrics
  confidence: { 
    type: Number,
    default: 0.7,
    min: 0,
    max: 1,
    description: 'How certain the user was about their rating (0-1)'
  },
  comment: String,
  
  // Processing state
  is_processed: { 
    type: Boolean, 
    default: false 
  },
  processed_at: Date,
  
  // Batch learning tracking
  processing_batch: String,           // ID of batch this was processed in
  learning_weight: {
    type: Number,
    default: 1.0,
    description: 'Weight used in learning (adjusted for spam detection)'
  },
  
  created_at: { 
    type: Date, 
    default: Date.now,
    index: true
  }
});

// Index for efficient queries
feedbackLogSchema.index({ is_processed: 1, created_at: -1 });
feedbackLogSchema.index({ segment_ids: 1 });
feedbackLogSchema.index({ 'user_context.location': '2dsphere' }, { sparse: true });

module.exports = mongoose.model('FeedbackLog', feedbackLogSchema);
