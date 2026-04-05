// @ts-nocheck
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, AlertCircle, Send, X, TrendingDown, Volume2 } from 'lucide-react';
import './SegmentRatingPanel.css';

interface SegmentRatingPanelProps {
  segment: any;
  currentScore: number;
  timeSlot: number;
  onSubmit?: () => void;
  onClose: () => void;
}

const TIME_SLOT_LABELS = [
  '🌙 Midnight',
  '🌙 2 AM',
  '🌙 4 AM',
  '🌙 6 AM',
  '☀️ 8 AM',
  '☀️ 10 AM',
  '☀️ Noon',
  '☀️ 2 PM',
  '☀️ 4 PM',
  '🌅 6 PM',
  '🌆 8 PM',
  '🌙 10 PM'
];

export default function SegmentRatingPanel({
  segment,
  currentScore,
  timeSlot,
  onSubmit,
  onClose
}: SegmentRatingPanelProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [confidence, setConfidence] = useState<number>(0.7);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<number>(timeSlot);
  const [selectedConditions, setSelectedConditions] = useState<Set<string>>(new Set());

  const scoreStatus = useCallback((score: number) => {
    if (score < 0.3) return { label: 'Very Unsafe', color: 'rgb(239, 68, 68)', icon: '⚠️' };
    if (score < 0.5) return { label: 'Unsafe', color: 'rgb(249, 115, 22)', icon: '⚠️' };
    if (score < 0.7) return { label: 'Moderate', color: 'rgb(245, 158, 11)', icon: '⚡' };
    if (score < 0.85) return { label: 'Safe', color: 'rgb(34, 197, 94)', icon: '✓' };
    return { label: 'Very Safe', color: 'rgb(16, 185, 129)', icon: '✓' };
  }, []);

  const handleConditionToggle = (condition: string) => {
    const newConditions = new Set(selectedConditions);
    if (newConditions.has(condition)) {
      newConditions.delete(condition);
    } else {
      newConditions.add(condition);
    }
    setSelectedConditions(newConditions);
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      alert('Please select a rating');
      return;
    }

    setIsSubmitting(true);
    try {
      const baseURL = import.meta.env.VITE_API_BASE_URL || "https://midnight-maps.onrender.com";
      const response = await fetch(`${baseURL}/api/segments/rate-segment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segment_id: segment.segment_id || segment._id,
          rating,
          time_slot: selectedTimeSlot,
          confidence,
          comment,
          conditions: Array.from(selectedConditions),
          location: {
            lat: segment.midpoint?.lat || segment.midpoint?.lat,
            lng: segment.midpoint?.lng || segment.midpoint?.lng
          }
        })
      });

      if (response.ok) {
        setSubmitted(true);
        setTimeout(() => {
          onSubmit?.();
          onClose();
        }, 1500);
      } else {
        alert('Failed to submit rating');
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert('Error submitting rating');
    } finally {
      setIsSubmitting(false);
    }
  };

  const scoreInfo = scoreStatus(currentScore);
  const discrepancy = rating === 0 ? 0 : Math.abs((rating - 1) / 4 - currentScore);
  const showsDiscrepancy = discrepancy > 0.25;

  return (
    <motion.div
      className="segment-rating-panel-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="segment-rating-panel"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        {!submitted ? (
          <>
            <div className="srp-header">
              <div className="srp-title-section">
                <h2 className="srp-title">Rate this street</h2>
                <p className="srp-subtitle">Your feedback improves safety for everyone</p>
              </div>
              <button
                className="srp-close-btn"
                onClick={onClose}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Current AI Score */}
            <div className="srp-current-score" style={{ borderLeft: `4px solid ${scoreInfo.color}` }}>
              <div className="srp-score-info">
                <span className="srp-score-value">{(currentScore * 100).toFixed(0)}%</span>
                <span className="srp-score-label">{scoreInfo.label}</span>
              </div>
              <span className="srp-score-icon">{scoreInfo.icon}</span>
            </div>

            {/* Star Rating */}
            <div className="srp-rating-section">
              <label className="srp-label">How safe do you feel here?</label>
              <div className="srp-stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <motion.button
                    key={star}
                    className={`srp-star ${star <= (hoveredRating || rating) ? 'active' : ''}`}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    onClick={() => setRating(star)}
                    whileHover={{ scale: 1.2, rotate: 10 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Star
                      size={32}
                      fill={star <= (hoveredRating || rating) ? 'currentColor' : 'none'}
                    />
                  </motion.button>
                ))}
              </div>
              <div className="srp-rating-labels">
                <span>Very Unsafe</span>
                <span>Very Safe</span>
              </div>
            </div>

            {/* Discrepancy Warning */}
            <AnimatePresence>
              {showsDiscrepancy && (
                <motion.div
                  className="srp-discrepancy-warning"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <TrendingDown size={16} />
                  <span>
                    Your rating differs from our system. This feedback helps us improve!
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Time Slot Selector */}
            <div className="srp-time-slot-section">
              <label className="srp-label">When did you experience this?</label>
              <select
                className="srp-time-slot-select"
                value={selectedTimeSlot}
                onChange={(e) => setSelectedTimeSlot(Number(e.target.value))}
              >
                {TIME_SLOT_LABELS.map((label, i) => (
                  <option key={i} value={i}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Conditions */}
            <div className="srp-conditions-section">
              <label className="srp-label">Conditions (optional)</label>
              <div className="srp-conditions-grid">
                {['Dark', 'Well-lit', 'Crowded', 'Empty', 'Quiet', 'Noisy'].map((cond) => (
                  <motion.button
                    key={cond}
                    className={`srp-condition-tag ${selectedConditions.has(cond) ? 'active' : ''}`}
                    onClick={() => handleConditionToggle(cond)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {cond}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Confidence Slider */}
            <div className="srp-confidence-section">
              <label className="srp-label">
                How confident are you? ({Math.round(confidence * 100)}%)
              </label>
              <div className="srp-confidence-slider-container">
                <span className="srp-confidence-label">Not sure</span>
                <input
                  type="range"
                  className="srp-confidence-slider"
                  min="0"
                  max="1"
                  step="0.1"
                  value={confidence}
                  onChange={(e) => setConfidence(Number(e.target.value))}
                />
                <span className="srp-confidence-label">Very sure</span>
              </div>
            </div>

            {/* Comment */}
            <div className="srp-comment-section">
              <label className="srp-label">Add a comment (optional)</label>
              <textarea
                className="srp-comment-textarea"
                placeholder="E.g., Street lights are broken, or there's lots of police presence..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={200}
              />
              <span className="srp-char-count">{comment.length}/200</span>
            </div>

            {/* Submit Button */}
            <motion.button
              className="srp-submit-btn"
              onClick={handleSubmit}
              disabled={isSubmitting || rating === 0}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isSubmitting ? (
                <>
                  <motion.div
                    className="srp-spinner"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                  Submitting...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Submit Rating
                </>
              )}
            </motion.button>
          </>
        ) : (
          /* Success State */
          <motion.div
            className="srp-success-state"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <motion.div
              className="srp-success-icon"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, repeat: 1 }}
            >
              ✓
            </motion.div>
            <h3 className="srp-success-title">Thank you!</h3>
            <p className="srp-success-text">
              Your rating helps us keep the community safer
            </p>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
