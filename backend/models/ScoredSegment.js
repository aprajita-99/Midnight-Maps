const mongoose = require('mongoose');

const ScoredSegmentSchema = new mongoose.Schema({
  segment_id: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  start: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  end: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  midpoint: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number], 
      required: true,
    }
  },
  scores: {
    type: [Number],
    validate: [val => val.length === 12, 'Scores must have exactly 12 time slots (0-11)'],
    required: true,
  }
}, {
  timestamps: true,
  collection: 'scored_segments'
});

ScoredSegmentSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('ScoredSegment', ScoredSegmentSchema);
