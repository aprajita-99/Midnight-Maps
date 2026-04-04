import React, { useState, useCallback } from 'react';
import { Marker, OverlayView, useGoogleMap } from '@react-google-maps/api';
import { Shield, Activity, Lightbulb, Video, TreePine, Loader2, X, Star, MapPin } from 'lucide-react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigationStore } from '../../store/useNavigationStore';
import clsx from 'clsx';

export default function SafetyInspector() {
    const map = useGoogleMap();
    const [isActive, setIsActive] = useState(false);
    const [position, setPosition] = useState<{ lat: number, lng: number } | null>(null);
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    // AI Feedback State
    const { feedbackStatus, submitFeedback } = useNavigationStore();
    const [hoveredStar, setHoveredStar] = useState(0);
    const [submittedRating, setSubmittedRating] = useState(0);

    const toggleInspector = () => {
        if (!isActive && map) {
            const center = map.getCenter();
            if (center) {
                const lat = center.lat();
                const lng = center.lng();
                setPosition({ lat, lng });
                fetchData(lat, lng);
            }
        }
        setIsActive(!isActive);
    };

    const fetchData = async (lat: number, lng: number) => {
        setIsLoading(true);
        // Reset stars when fetching a new street
        setSubmittedRating(0); 
        try {
            const res = await fetch(`/api/segments/nearest?lat=${lat}&lng=${lng}`);
            const json = await res.json();
            if (json.success) setData(json.data);
            else setData(null);
        } catch (e) {
            setData(null);
        }
        setIsLoading(false);
    };

    const handleDragEnd = useCallback((e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        setPosition({ lat, lng });
        fetchData(lat, lng);
    }, []);

    // Helper to safely parse raw database features into a 0-100% format
    const parseScore = (val: any, max: number = 1) => {
        let num = 0;
        if (Array.isArray(val)) {
            const currentHour = new Date().getHours();
            const slotIndex = Math.floor(currentHour / 2);
            num = val.length > 0 ? val[slotIndex] : 0.5;
        } else {
            num = Number(val);
            if (isNaN(num)) num = 0.5;
        }
        return Math.min(num / max, 1.0); 
    };

    const renderFeature = (icon: any, label: string, val: number, max: number = 1) => {
        const rawScore = parseScore(val, max);
        const pct = Math.round(rawScore * 100);

        let color = "text-red-400";
        if (pct > 40) color = "text-yellow-400";
        if (pct > 70) color = "text-green-400";

        return (
            <div className="flex flex-col gap-1 p-2.5 bg-white/5 rounded-xl border border-white/5">
                <div className="flex items-center gap-1.5 text-gray-400">
                    {icon}
                    <span className="text-[9px] uppercase font-bold tracking-wider">{label}</span>
                </div>
                <span className={clsx("text-lg font-black leading-none", color)}>{pct}%</span>
            </div>
        );
    };

    return (
        <>
            {/* 1. Floating Toggle Button */}
            {createPortal(
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={toggleInspector}
                    className={clsx(
                        "fixed bottom-60 right-6 z-[8000] p-4 rounded-full shadow-2xl flex items-center justify-center transition-colors border",
                        isActive
                            ? "bg-primary-green text-dark-900 border-primary-green shadow-[0_0_30px_rgba(34,197,94,0.4)]"
                            : "bg-dark-800 text-white border-white/10 hover:bg-dark-700"
                    )}
                    title="Safety Inspector"
                >
                    {isActive ? <X size={24} /> : <Shield size={24} />}
                </motion.button>,
                document.body
            )}

            {/* 2. The Draggable Marker */}
            {isActive && position && (
                <Marker
                    position={position}
                    draggable={true}
                    onDragEnd={handleDragEnd}
                    zIndex={1000}
                    icon={{
                        path: window.google.maps.SymbolPath.CIRCLE,
                        scale: 12,
                        fillColor: '#22C55E',
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 3,
                    }}
                />
            )}

            {/* 3. The Custom Data Overlay */}
            {isActive && position && (
                <OverlayView
                    position={position}
                    mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                >
                    <div className="relative -translate-x-1/2 -translate-y-[calc(100%+25px)] z-[9999] pointer-events-none">
                        <AnimatePresence mode="wait">
                            {isLoading ? (
                                <motion.div
                                    key="loading"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="bg-dark-900/90 backdrop-blur-xl border border-white/10 p-5 rounded-2xl flex flex-col items-center justify-center gap-3 shadow-2xl min-w-[200px]"
                                >
                                    <Loader2 className="w-6 h-6 text-primary-green animate-spin" />
                                    <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">Scanning Street...</span>
                                </motion.div>
                            ) : data ? (
                                
                                <motion.div
                                    key="data"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    // Make sure this specific card allows pointer events so we can click the stars!
                                    className="bg-dark-900/95 backdrop-blur-xl border border-white/10 p-3 rounded-2xl shadow-2xl min-w-[260px] pointer-events-auto"
                                >
                                    <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-2 px-1">
                                        <Shield size={14} className="text-primary-green" />
                                        <span className="text-[10px] text-white font-black uppercase tracking-widest">Street Metrics</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {renderFeature(<Lightbulb size={12} />, "Lighting", data.features?.lighting)}
                                        {renderFeature(<Activity size={12} />, "Activity", data.features?.activity)}
                                        {renderFeature(<Video size={12} />, "Cameras", data.features?.camera, 5)}
                                        {renderFeature(<TreePine size={12} />, "Context", data.features?.environment)}
                                    </div>

                                    {/* 🌟 AI Reinforcement Learning Segment Tool */}
                                    <div className="mt-4 pt-3 border-t border-white/10 flex flex-col items-center gap-1.5">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                            {feedbackStatus ? "Segment Learned!" : "Rate this street"}
                                        </p>
                                        
                                        {feedbackStatus ? (
                                            <p className="text-[10px] text-primary-green font-bold bg-primary-green/10 border border-primary-green/20 px-3 py-1 rounded-full animate-pulse">
                                                Feedback sent to AI Agent
                                            </p>
                                        ) : (
                                            <div className="flex gap-1">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <button
                                                        key={star}
                                                        onMouseEnter={() => setHoveredStar(star)}
                                                        onMouseLeave={() => setHoveredStar(0)}
                                                        onClick={() => {
                                                            setSubmittedRating(star);
                                                            // Send the specific segment_id they clicked to the AI
                                                            submitFeedback('segment', data.segment_id, star); 
                                                        }}
                                                        className="transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                                                    >
                                                        <Star 
                                                            size={20} 
                                                            className={clsx(
                                                                "transition-colors duration-200",
                                                                (hoveredStar || submittedRating) >= star 
                                                                    ? "fill-yellow-400 text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.5)]" 
                                                                    : "text-gray-600"
                                                            )} 
                                                        />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="error"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="bg-dark-900/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl whitespace-nowrap min-w-[140px] flex items-center justify-center"
                                >
                                    <span className="text-xs text-red-400 font-bold uppercase tracking-widest">No Data Found</span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        {/* Pointer arrow connecting bubble to the marker */}
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-dark-900/95 rotate-45 border-r border-b border-white/10" />
                    </div>
                </OverlayView>
            )}
        </>
    );
}