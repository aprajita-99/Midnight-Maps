const express = require('express');
const router = express.Router();
const RoadSegment = require('../models/RoadSegment');
const {
  createSegment,
  bulkInsertSegments,
  syncScores,
  getScoredSegments,
  analyzeRoutes,
  getSegmentById,
  updateSegmentFeatures,
  getSegmentsNearLocation,
  getNearbySegments,
  getNearestSegment
} = require('../controllers/segmentController');

router.post('/', createSegment);
router.post('/bulk', bulkInsertSegments);
router.post('/sync-scores', syncScores);
router.post('/analyze-routes', analyzeRoutes);
router.get('/scores', getScoredSegments);
router.get('/near', getSegmentsNearLocation);
router.get('/nearest', getNearestSegment);
router.get('/nearby', (req, res, next) => {
  console.log("HIT NEAREEEEEEEEEEEEE");
  next();
}, getNearbySegments);

router.get('/test', async (req, res) => {
  console.log("TEST ROUTE HIT");
  const data = await RoadSegment.find().limit(2);
  res.json(data);
});

router.get('/:id', getSegmentById);
router.put('/:id/features', updateSegmentFeatures);

module.exports = router;
