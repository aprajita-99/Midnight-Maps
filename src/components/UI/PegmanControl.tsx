import { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

interface PegmanControlProps {
  mapRef: React.RefObject<google.maps.Map | null>;
  onDropCoords: (lat: number, lng: number) => void;
}

/**
 * Google Maps-style Pegman using POINTER events (not HTML5 drag API).
 *
 * Why pointer events?
 *   The HTML5 drag API clips the drag image to a static snapshot and
 *   cannot animate anything following the cursor. Pointer capture lets us
 *   move a cloned element in real time — exactly how Google Maps works.
 *
 * Flow:
 *   pointerdown  → capture pointer, clone Pegman, show floating clone
 *   pointermove  → translate clone to cursor position
 *   pointerup    → compute lat/lng from drop position, call onDropCoords
 */
export default function PegmanControl({ mapRef, onDropCoords }: PegmanControlProps) {
  const [isDragging, setIsDragging]   = useState(false);
  const [cursorPos, setCursorPos]     = useState({ x: 0, y: 0 });
  const [isOverMap, setIsOverMap]     = useState(false);
  const pegmanRef                     = useRef<HTMLDivElement>(null);
  const mapRectRef                    = useRef<DOMRect | null>(null);

  // ─── Pointer capture handlers ──────────────────────────────────────────────

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);

    const mapDiv = mapRef.current?.getDiv();
    if (mapDiv) mapRectRef.current = mapDiv.getBoundingClientRect();

    setCursorPos({ x: e.clientX, y: e.clientY });
    setIsDragging(true);
    setIsOverMap(false);

    // Prevent map pan while dragging
    document.body.style.userSelect = 'none';
  }, [mapRef]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    setCursorPos({ x: e.clientX, y: e.clientY });

    // Check if cursor is inside the map div
    const rect = mapRectRef.current;
    if (rect) {
      const inside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      setIsOverMap(inside);
    }
  }, [isDragging]);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    document.body.style.userSelect = '';
    setIsDragging(false);
    setIsOverMap(false);

    const map  = mapRef.current;
    const rect = mapRectRef.current;
    if (!map || !rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Only fire if dropped inside the map
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;

    const coords = pixelToLatLng(map, x, y, rect);
    if (coords) onDropCoords(coords.lat, coords.lng);
  }, [isDragging, mapRef, onDropCoords]);

  // Cancel on Escape
  useEffect(() => {
    if (!isDragging) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        document.body.style.userSelect = '';
        setIsDragging(false);
        setIsOverMap(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isDragging]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* Hint tooltip — shown while dragging */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            key="hint"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="absolute bottom-44 right-24 z-30 px-3 py-2 rounded-xl bg-dark-800/90 backdrop-blur-xl border border-white/10 text-xs text-gray-300 whitespace-nowrap shadow-xl pointer-events-none select-none"
          >
            {isOverMap ? '📍 Release to open Street View' : 'Drag onto the map'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resting Pegman button */}
      <motion.div
        ref={pegmanRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        animate={isDragging ? { opacity: 0.35, scale: 0.9 } : { opacity: 1, scale: 1 }}
        whileHover={isDragging ? {} : { scale: 1.1 }}
        title="Drag onto map to open Street View"
        className={[
          'absolute bottom-44 right-6 z-20',
          'w-14 h-14 rounded-full flex items-center justify-center select-none',
          'bg-dark-800/80 backdrop-blur-xl border border-white/10 shadow-2xl',
          'hover:border-[#4285F4]/40 hover:shadow-[0_0_20px_rgba(66,133,244,0.2)]',
          'transition-colors',
          isDragging ? 'cursor-grabbing' : 'cursor-grab',
        ].join(' ')}
      >
        <PegmanSVG />
      </motion.div>

      {/* Floating clone that follows the cursor — rendered via portal so it's above everything */}
      {isDragging &&
        createPortal(
          <div
            className="fixed pointer-events-none z-[99999]"
            style={{
              left: cursorPos.x - 28,
              top:  cursorPos.y - 28,
              transition: 'none',
            }}
          >
          {/* Simple dark circle — no color change while dragging */}
            <div className="w-14 h-14 rounded-full flex items-center justify-center bg-dark-800/90 border border-white/20 shadow-2xl">
              <PegmanSVG />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

// ─── Reusable Pegman SVG ──────────────────────────────────────────────────────

function PegmanSVG({ color = 'currentColor' }: { color?: string }) {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ color }}
      className="text-gray-300"
    >
      {/* Head */}
      <circle cx="12" cy="4.5" r="2.5" fill="currentColor" />
      {/* Body */}
      <path d="M9 8.5h6l1 5.5h-2.2l-.8 5h-2L10 14H8l1-5.5z" fill="currentColor" />
      {/* Arms */}
      <path
        d="M7.5 10.5l1.8 1.8M16.5 10.5l-1.8 1.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── lat/lng math ─────────────────────────────────────────────────────────────

function pixelToLatLng(
  map: google.maps.Map,
  x: number,
  y: number,
  rect: DOMRect
): { lat: number; lng: number } | null {
  const bounds = map.getBounds();
  if (!bounds) return null;

  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();

  const lng = sw.lng() + (x / rect.width)  * (ne.lng() - sw.lng());
  const lat = ne.lat() - (y / rect.height) * (ne.lat() - sw.lat());

  return { lat, lng };
}
