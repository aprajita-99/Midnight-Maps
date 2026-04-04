const Joi = require('joi');
const RoadSegment = require('../models/RoadSegment');
const generateSegmentId = require('../utils/generateSegmentId');

// Joi schema for validation
const featureSchema = Joi.number().min(0).max(1);

const segmentSchema = Joi.object({
  start: Joi.object({
    lat: Joi.number().required(),
    lng: Joi.number().required(),
  }).required(),
  end: Joi.object({
    lat: Joi.number().required(),
    lng: Joi.number().required(),
  }).required(),
  features: Joi.object({
    lighting: featureSchema,
    activity: featureSchema,
    crime: featureSchema,
    environment: featureSchema,
  }).optional(),
});

const validateSegment = (data) => {
  return segmentSchema.validate(data);
};

const createOrUpdateSegment = async (data) => {
  const { error } = validateSegment(data);
  if (error) throw new Error(error.details[0].message);

  const segment_id = generateSegmentId(data.start, data.end);
  const midpoint = {
    lat: (data.start.lat + data.end.lat) / 2,
    lng: (data.start.lng + data.end.lng) / 2,
  };

  // ADD THIS: Construct the GeoJSON object for the new insert
  const location = {
    type: 'Point',
    coordinates: [midpoint.lng, midpoint.lat] // Note: [Longitude, Latitude]
  };

  const segmentData = {
    ...data,
    segment_id,
    midpoint,
    location, // Include the location object in the final data
  };

  // Upsert logic
  return await RoadSegment.findOneAndUpdate(
    { segment_id },
    segmentData,
    { new: true, upsert: true, runValidators: true }
  );
};

// In segmentService.js -> bulkInsert()
const bulkInsert = async (segments) => {
  const operations = segments.map((s) => {
    const segment_id = generateSegmentId(s.start, s.end);
    const midpoint = {
      lat: (s.start.lat + s.end.lat) / 2,
      lng: (s.start.lng + s.end.lng) / 2,
    };
    
    const location = {
      type: 'Point',
      coordinates: [midpoint.lng, midpoint.lat]
    };
    
    return {
      updateOne: {
        filter: { segment_id },
        // ADD location to the $set update
        update: { $set: { ...s, segment_id, midpoint, location } }, 
        upsert: true,
      }
    };
  });

  return await RoadSegment.bulkWrite(operations);
};

module.exports = {
  validateSegment,
  createOrUpdateSegment,
  bulkInsert,
};
