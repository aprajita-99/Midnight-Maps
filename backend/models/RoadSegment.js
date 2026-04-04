const mongoose = require('mongoose');

const RoadSegmentSchema = new mongoose.Schema({
  segment_id: {
    type: String,
    required: [true, 'Please add a segment_id'],
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
  features: {
    activity: { 
      type: [Number], 
      default: [0.5] * 12 
    },
    activity_score: { type: Number },
    lighting: { 
      type: [Number], 
      default: [0.0] * 12
    },
    camera: { 
      type: Number, 
      min: 0, 
      max: 1,
      default: 0 
    },
    environment: { 
      type: Number, 
      min: 0, 
      max: 1,
      default: 0.5 
    },
  },
}, {
  timestamps: true,
  collection: 'road_segments'
});

RoadSegmentSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('road_segments', RoadSegmentSchema);
