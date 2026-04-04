const express = require('express');
const router = express.Router();
const RoadSegment = require('../models/RoadSegment');
const FeedbackLog = require('../models/FeedbackLog');
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
router.get('/nearby', getNearbySegments);

router.get('/test', async (req, res) => {
  console.log("TEST ROUTE HIT");
  const data = await RoadSegment.find().limit(2);
  res.json(data);
});

router.get('/:id', getSegmentById);
router.put('/:id/features', updateSegmentFeatures);

router.post('/rate', async (req, res) => {
  try {
    const { type, data, rating, timeSlot } = req.body;
    if (!type || !data || !rating || timeSlot === undefined) {
      return res.status(400).json({ success: false, message: 'Missing required fields for feedback.' });
    }
    await FeedbackLog.create({
      target_type: type,
      target_id: data,  
      rating: rating, 
      time_slot: timeSlot,
      is_processed: false 
    });

    res.status(200).json({ 
      success: true, 
      message: "Thank you! Your anonymous feedback has been queued to train the AI." 
    });

  } catch (error) {
    console.error('Feedback Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
