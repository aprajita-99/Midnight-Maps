// @ts-nocheck
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, AlertTriangle, CheckCircle, Send, X, MapPin } from 'lucide-react';
import './RouteQualityModal.css';

interface RouteQualityModalProps {
  route: any;
  routeSafety: {
    mean: number;
    segments: any[];
    dangerousSegments: any[];
  };
  travelTime: number;
  onSubmit?: () => void;
  onClose: () => void;
}

export default function RouteQualityModal({
  route,
  routeSafety,
  travelTime,
  onSubmit,
  onClose
}: RouteQualityModalProps) {
  const [overallRating, setOverallRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [confidence, setConfidence] = useState<number>(0.85);
  const [comment, setComment] = useState<string>('');
  const [dangerousSegments, setDangerousSegments] = useState<Set<string>>(new Set());
  const [safeSegments, setSafeSegments] = useState<Set<string>>(new Set());
  const [conditions, setConditions] = useState<string>('normal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const routeScoreStatus = useCallback((score: number) => {
    if (score < 0.3) return { label: 'Very Unsafe', color: 'rgb(239, 68, 68)' };
    if (score < 0.5) return { label: 'Unsafe', color: 'rgb(249, 115, 22)' };
    if (score < 0.7) return { label: 'Moderate', color: 'rgb(245, 158, 11)' };
    if (score < 0.85) return { label: 'Safe', color: 'rgb(34, 197, 94)' };
    return { label: 'Very Safe', color: 'rgb(16, 185, 129)' };
  }, []);

  const routeScoreStatus2 = routeScoreStatus(routeSafety.mean);
  const dangerousCount = routeSafety.dangerousSegments?.length || 0;

  const handleDangerousSegmentToggle = (segmentId: string) => {
    const newSet = new Set(dangerousSegments);
    if (newSet.has(segmentId)) {
      newSet.delete(segmentId);
    } else {
      newSet.add(segmentId);
    }
    setDangerousSegments(newSet);
  };

  const handleSafeSegmentToggle = (segmentId: string) => {
    const newSet = new Set(safeSegments);
    if (newSet.has(segmentId)) {
      newSet.delete(segmentId);
    } else {
      newSet.add(segmentId);
    }
    setSafeSegments(newSet);
  };

  const handleSubmit = async () => {
    if (overallRating === 0) {
      alert('Please select an overall rating');
      return;
    }

    setIsSubmitting(true);
    try {
      const baseURL = import.meta.env.VITE_API_BASE_URL
      const response = await fetch(`${baseURL}/api/segments/rate-route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          route_segments: route.map((seg: any) => seg.segment_id || seg._id || seg),
          overall_rating: overallRating,
          dangerous_segments: Array.from(dangerousSegments),
          safe_segments: Array.from(safeSegments),
          travel_time: travelTime,
          conditions,
          confidence,
          comment
        })
      });

      if (response.ok) {
        setSubmitted(true);
        setTimeout(() => {
          onSubmit?.();
          onClose();
        }, 1500);
      } else {
        alert('Failed to submit route feedback');
      }
    } catch (error) {
      console.error('Error submitting route feedback:', error);
      alert('Error submitting route feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      className="route-quality-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="route-quality-modal"
        initial={{ scale: 0.9, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 40 }}
        onClick={(e) => e.stopPropagation()}
      >
        {!submitted ? (
          <>
            {/* Header */}
            <div className="rqm-header">
              <div className="rqm-header-content">
                <h2 className="rqm-title">How was your route?</h2>
                <p className="rqm-subtitle">Your feedback helps us improve</p>
              </div>
              <button
                className="rqm-close-btn"
                onClick={onClose}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Route Summary Card */}
            <div className="rqm-route-summary">
              <div className="rqm-summary-stat">
                <span className="rqm-stat-label">Route Safety</span>
                <div className="rqm-stat-value-row">
                  <span className="rqm-stat-value">{(routeSafety.mean * 100).toFixed(0)}%</span>
                  <span
                    className="rqm-stat-badge"
                    style={{ backgroundColor: routeScoreStatus2.color }}
                  >
                    {routeScoreStatus2.label}
                  </span>
                </div>
              </div>

              <div className="rqm-summary-divider" />

              <div className="rqm-summary-stat">
                <span className="rqm-stat-label">Travel Time</span>
                <span className="rqm-stat-value">{Math.round(travelTime)} min</span>
              </div>

              {dangerousCount > 0 && (
                <>
                  <div className="rqm-summary-divider" />
                  <div className="rqm-summary-stat">
                    <span className="rqm-stat-label">Risky Areas</span>
                    <span className="rqm-stat-value rqm-stat-warning">{dangerousCount}</span>
                  </div>
                </>
              )}
            </div>

            {/* Overall Rating */}
            <div className="rqm-section">
              <label className="rqm-label">Rate your safety on this route</label>
              <div className="rqm-stars-large">
                {[1, 2, 3, 4, 5].map((star) => (
                  <motion.button
                    key={star}
                    className={`rqm-star-large ${star <= (hoveredRating || overallRating) ? 'active' : ''}`}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    onClick={() => setOverallRating(star)}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Star
                      size={40}
                      fill={star <= (hoveredRating || overallRating) ? 'currentColor' : 'none'}
                    />
                  </motion.button>
                ))}
              </div>
              <div className="rqm-rating-labels-large">
                <span>Very Unsafe</span>
                <span>Very Safe</span>
              </div>
            </div>

            {/* Conditions */}
            <div className="rqm-section">
              <label className="rqm-label">What were the conditions?</label>
              <select
                className="rqm-conditions-select"
                value={conditions}
                onChange={(e) => setConditions(e.target.value)}
              >
                <option value="normal">Normal conditions</option>
                <option value="dark">Very dark</option>
                <option value="rain">Rainy</option>
                <option value="crowded">Crowded</option>
                <option value="empty">Empty/deserted</option>
                <option value="police">Police/security present</option>
              </select>
            </div>

            {/* Dangerous Segments */}
            <AnimatePresence>
              {routeSafety.dangerousSegments && routeSafety.dangerousSegments.length > 0 && (
                <motion.div
                  className="rqm-section"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className="rqm-label">
                    <AlertTriangle size={16} />
                    Mark dangerous segments (optional)
                  </label>
                  <div className="rqm-segment-list">
                    {routeSafety.dangerousSegments.map((seg: any, idx: number) => (
                      <motion.button
                        key={seg.segment_id || idx}
                        className={`rqm-segment-item dangerous ${
                          dangerousSegments.has(seg.segment_id) ? 'selected' : ''
                        }`}
                        onClick={() =>
                          handleDangerousSegmentToggle(seg.segment_id)
                        }
                        whileHover={{ x: 4 }}
                      >
                        <AlertTriangle size={16} />
                        <div className="rqm-segment-info">
                          <span className="rqm-segment-name">
                            Segment {idx + 1}
                          </span>
                          <span className="rqm-segment-score">
                            {(seg.currentScore * 100).toFixed(0)}% safe
                          </span>
                        </div>
                        <div className="rqm-segment-checkbox">
                          {dangerousSegments.has(seg.segment_id) && '✓'}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Confidence */}
            <div className="rqm-section">
              <label className="rqm-label">
                How confident in this rating? ({Math.round(confidence * 100)}%)
              </label>
              <input
                type="range"
                className="rqm-confidence-slider"
                min="0"
                max="1"
                step="0.1"
                value={confidence}
                onChange={(e) => setConfidence(Number(e.target.value))}
              />
              <div className="rqm-confidence-labels">
                <span>Not sure</span>
                <span>Very sure</span>
              </div>
            </div>

            {/* Comment */}
            <div className="rqm-section">
              <label className="rqm-label">Additional comments (optional)</label>
              <textarea
                className="rqm-comment-textarea"
                placeholder="Share what made you feel safe or unsafe on this route..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={300}
              />
              <span className="rqm-char-count">{comment.length}/300</span>
            </div>

            {/* Submit Button */}
            <motion.button
              className="rqm-submit-btn"
              onClick={handleSubmit}
              disabled={isSubmitting || overallRating === 0}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isSubmitting ? (
                <>
                  <motion.div
                    className="rqm-spinner"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                  Submitting...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Submit Route Feedback
                </>
              )}
            </motion.button>
          </>
        ) : (
          /* Success State */
          <motion.div
            className="rqm-success-state"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <motion.div
              className="rqm-success-icon"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, repeat: 1 }}
            >
              <CheckCircle size={56} />
            </motion.div>
            <h3 className="rqm-success-title">Thank you!</h3>
            <p className="rqm-success-text">
              Your feedback helps make our community safer for everyone
            </p>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
