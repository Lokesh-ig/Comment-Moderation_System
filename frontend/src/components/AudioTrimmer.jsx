import React, { useState, useRef, useEffect } from 'react';
import { FiPlay, FiPause, FiCheck, FiX, FiMusic } from 'react-icons/fi';

const AudioTrimmer = ({ track, initialStartTime = 0, initialDuration = 15, onConfirm, onCancel }) => {
    const [startTime, setStartTime] = useState(initialStartTime);
    const [duration, setDuration] = useState(initialDuration);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [virtualCurrentTime, setVirtualCurrentTime] = useState(initialStartTime);
    const audioRef = useRef(null);
    const requestRef = useRef();
    const waveformRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isScrubbing, setIsScrubbing] = useState(false);
    const startTimeRef = useRef(startTime);

    const [availableDuration, setAvailableDuration] = useState(30);
    // FULL SONG SCALE: The visual timeline represents the entire track (e.g. 4 minutes).
    const maxDuration = track.trackTimeMillis ? Math.floor(track.trackTimeMillis / 1000) : 30;

    useEffect(() => {
        // When track changes, we reset selection to start of the song
        setStartTime(0);
        startTimeRef.current = 0;
        setVirtualCurrentTime(0);
    }, [track.previewUrl]);

    useEffect(() => {
        startTimeRef.current = startTime;
    }, [startTime]);

    // Structured Waveform Generator
    const [waveform] = useState(() => {
        const data = [];
        for (let i = 0; i < 100; i++) {
            // Create a structural "song" pattern (intro, builds, drops)
            const structural = Math.abs(Math.sin((i / 100) * Math.PI * 4)) * 0.4;
            const noise = Math.random() * 0.3;
            data.push(Math.max(0.15, structural + noise));
        }
        return data;
    });

    // Format time helper (e.g., 65 -> 1:05)
    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const getActualTime = (vTime, actualDur) => {
        if (!actualDur || !Number.isFinite(actualDur)) return 0;
        // 1-to-1 ABSOLUTE MAPPING: 
        // 1s on the slider = 1s of audio. We use modulo to "tile" the 30s preview 
        // across the full 4-minute timeline. This is professional and predictable.
        return vTime % actualDur;
    };

    const lastSeekTimeRef = useRef(0);
    const isInternalSeekingRef = useRef(false);

    const syncAudio = (seekTime, forcePlay = false) => {
        const audio = audioRef.current;
        if (!audio || !isReady || isInternalSeekingRef.current) return;
        
        // Safety: Pause before seeking to prevent "drilling" buzz on some browsers
        if (audio.paused === false) audio.pause();

        // Throttle rapid drag/adjustments
        const now = Date.now();
        if (now - lastSeekTimeRef.current < 60 && !forcePlay) return;
        lastSeekTimeRef.current = now;

        const actualDur = audio.duration || 30;
        const actualPos = getActualTime(seekTime, actualDur);
        
        if (Number.isFinite(actualPos)) {
            isInternalSeekingRef.current = true;
            audio.currentTime = actualPos;
            
            if (forcePlay || isPlaying) {
                audio.play().catch(e => {
                    if (e.name !== 'AbortError') console.error("Sync play error:", e);
                });
            }
            
            setTimeout(() => { isInternalSeekingRef.current = false; }, 80);
        }
    };

    const lastLoopTimeRef = useRef(0);

    // SEAMLESS WRAPPING LOOP: Logic to handle 30s boundary within a 15s window
    const handleTimeUpdate = () => {
        const audio = audioRef.current;
        if (!audio || !isPlaying || isDragging || isScrubbing || isInternalSeekingRef.current || audio.seeking) return;

        const actualDur = audio.duration || availableDuration || 30;
        const actualPos = audio.currentTime;
        
        const vStart = startTimeRef.current;
        const aStart = vStart % actualDur;
        
        let playedInClip = actualPos - aStart;
        if (playedInClip < 0) playedInClip += actualDur;

        // Loop enforcement: If we've played the requested segment length (e.g. 15s)
        const now = Date.now();
        if ((playedInClip >= duration - 0.1) && (now - lastLoopTimeRef.current > 200)) {
            lastLoopTimeRef.current = now;
            isInternalSeekingRef.current = true;
            audio.currentTime = aStart;
            setVirtualCurrentTime(vStart);
            setTimeout(() => { isInternalSeekingRef.current = false; }, 100);
        }
    };

    useEffect(() => {
        setIsReady(false); // Reset on track change
        setIsPlaying(false);
    }, [track.previewUrl]);

    const handleAudioReady = () => {
        if (audioRef.current) {
            const realDuration = audioRef.current.duration;
            if (Number.isFinite(realDuration) && realDuration > 0) {
                setAvailableDuration(realDuration);
            }
        }
        setIsReady(true);
        syncAudio(startTimeRef.current);
    };

    // Cleanup audio on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = "";
            }
        };
    }, []);

    // High-frequency VISUAL progress loop (Animation Only)
    useEffect(() => {
        const updateVisualProgress = () => {
            const audio = audioRef.current;
            if (audio && isPlaying && !isDragging && !isScrubbing) {
                const actualDur = audio.duration || availableDuration || 30;
                const actualPos = audio.currentTime;
                
                const vStart = startTimeRef.current;
                const aStart = vStart % actualDur;
                
                let playedInClip = actualPos - aStart;
                if (playedInClip < 0) playedInClip += actualDur;

                // Derive visual playhead strictly from audio progress
                // This guarantees the line moves perfectly with the sound
                if (playedInClip >= 0 && playedInClip <= duration + 0.5) {
                    setVirtualCurrentTime(vStart + playedInClip);
                }
            }
            requestRef.current = requestAnimationFrame(updateVisualProgress);
        };

        requestRef.current = requestAnimationFrame(updateVisualProgress);
        return () => cancelAnimationFrame(requestRef.current);
    }, [isPlaying, duration, isDragging, isScrubbing, maxDuration]);

    const handleStartTimeChange = (val) => {
        const newStart = Math.max(0, Math.min(maxDuration - duration, parseFloat(val)));
        setStartTime(newStart);
        startTimeRef.current = newStart;
        setVirtualCurrentTime(newStart);
        syncAudio(newStart);
    };

    const adjustStartTime = (delta) => {
        const newStart = Math.max(0, Math.min(maxDuration - duration, startTime + delta));
        setStartTime(newStart);
        startTimeRef.current = newStart;
        setVirtualCurrentTime(newStart);
        syncAudio(newStart, true); // Force play after adjustment
        if (!isPlaying) setIsPlaying(true); // Start playing if not already
    };

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio || !isReady) return;

        if (isPlaying) {
            audio.pause();
        } else {
            const actualDur = audio.duration || 30;
            // AUTHORITATIVE RESET: Set time exactly before playing
            const targetTime = (virtualCurrentTime >= startTimeRef.current + duration || virtualCurrentTime < startTimeRef.current)
                ? startTimeRef.current
                : virtualCurrentTime;
            
            isInternalSeekingRef.current = true;
            audio.currentTime = getActualTime(targetTime, actualDur);
            setVirtualCurrentTime(targetTime);
            audio.play().catch(console.error);
            setTimeout(() => { isInternalSeekingRef.current = false; }, 100);
        }
        setIsPlaying(!isPlaying);
    };

    const handleDurationChange = (e) => {
        const newDuration = parseInt(e.target.value, 10);
        setDuration(newDuration);
        if (startTime + newDuration > maxDuration) {
            setStartTime(Math.max(0, maxDuration - newDuration));
        }
    };



    const handleWaveformInteraction = (e) => {
        if (!waveformRef.current) return;
        const rect = waveformRef.current.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const x = clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        const clickTime = percentage * maxDuration;
        
        // SOCIAL MEDIA BEHAVIOR: 
        // 1. If we click inside the selection box, we scrub the playhead.
        // 2. If we click outside, we move the entire box.
        const isClickInside = clickTime >= startTime && clickTime <= startTime + duration;

        if (isClickInside || isScrubbing) {
            // Internal scrubbing mode
            setIsScrubbing(true);
            setVirtualCurrentTime(clickTime);
            syncAudio(clickTime);
        } else {
            // Box movement mode
            const targetStart = Math.max(0, Math.min(maxDuration - duration, clickTime - (duration / 2)));
            setStartTime(targetStart);
            startTimeRef.current = targetStart;
            setVirtualCurrentTime(targetStart);
            syncAudio(targetStart);
        }
        
        if (!isPlaying) setIsPlaying(true);
    };

    const handleMouseDown = (e) => {
        const rect = waveformRef.current.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const x = clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        const clickTime = percentage * maxDuration;

        // Detect mode before starting drag
        const isInside = clickTime >= startTime && clickTime <= startTime + duration;
        if (isInside) {
            setIsScrubbing(true);
        } else {
            setIsDragging(true);
        }

        if (audioRef.current) audioRef.current.pause();
        handleWaveformInteraction(e);
    };

    const handleMouseMove = (e) => {
        if (isDragging || isScrubbing) handleWaveformInteraction(e);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setIsScrubbing(false);
        if (audioRef.current) {
            syncAudio(virtualCurrentTime, true);
        }
        if (!isPlaying) setIsPlaying(true);
    };

    useEffect(() => {
        if (isDragging || isScrubbing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            window.addEventListener('touchmove', handleMouseMove);
            window.addEventListener('touchend', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchmove', handleMouseMove);
            window.removeEventListener('touchend', handleMouseUp);
        };
    }, [isDragging, isScrubbing]);

    const getProgressPercentage = () => {
        if (!isPlaying || virtualCurrentTime < startTime || virtualCurrentTime > startTime + duration) return 0;
        return ((virtualCurrentTime - startTime) / duration) * 100;
    };

    return (
        <div className="absolute inset-0 bg-white dark:bg-gray-900 rounded-2xl flex flex-col overflow-hidden z-[100] animate-slide-up">
            <div className="p-6 flex flex-col h-full gap-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                            <FiMusic size={24} />
                        </div>
                        <div>
                            <h3 className="font-black text-gray-900 dark:text-white leading-tight">{track.trackName}</h3>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{track.artistName}</p>
                        </div>
                    </div>
                    <button 
                        onClick={onCancel}
                        className="p-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                <audio
                    key={track.previewUrl}
                    ref={audioRef}
                    src={track.previewUrl}
                    onCanPlayThrough={handleAudioReady}
                    onTimeUpdate={handleTimeUpdate}
                    onSeeking={() => { isInternalSeekingRef.current = true; }}
                    onSeeked={() => { setTimeout(() => { isInternalSeekingRef.current = false; }, 50); }}
                    onEnded={() => setIsPlaying(false)}
                    preload="auto"
                />

                {/* Duration Slider */}
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            Clip Length <span className="text-[10px] text-gray-300">(5s - 30s)</span>
                        </span>
                        <span className="text-sm font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1 rounded-full">{duration}s</span>
                    </div>
                    <input
                        type="range"
                        min="5"
                        max="60"
                        step="1"
                        value={duration}
                        onChange={handleDurationChange}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-indigo-500"
                    />
                </div>

                {/* Draggable Waveform Area */}
                <div className="flex flex-col gap-3 relative">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Select Part & Playhead</span>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={(e) => { e.stopPropagation(); adjustStartTime(-1); }}
                                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-indigo-500 hover:bg-indigo-100 flex items-center justify-center transition-colors font-bold text-xs"
                                title="-1 second"
                            >
                                -1s
                            </button>
                            <span className="text-sm font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1 rounded-full min-w-[100px] text-center">
                                {formatTime(startTime)} - {formatTime(startTime + duration)}
                            </span>
                            <button 
                                onClick={(e) => { e.stopPropagation(); adjustStartTime(1); }}
                                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-indigo-500 hover:bg-indigo-100 flex items-center justify-center transition-colors font-bold text-xs"
                                title="+1 second"
                            >
                                +1s
                            </button>
                        </div>
                    </div>

                    <div 
                        ref={waveformRef}
                        onMouseDown={handleMouseDown}
                        onTouchStart={handleMouseDown}
                        className="relative h-32 bg-gray-50 dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 p-2 cursor-pointer shadow-inner touch-none"
                    >
                        {/* Waveform Visualization */}
                        <div className="absolute inset-x-2 top-2 bottom-2 flex items-center justify-between opacity-50 pointer-events-none">
                            {waveform.map((height, i) => (
                                <div key={i} className="w-[.8%] bg-indigo-300 dark:bg-indigo-500/40 rounded-full" style={{ height: `${height * 100}%` }} />
                            ))}
                        </div>

                        {/* Selected Window */}
                        <div
                            className="absolute inset-y-2 bg-indigo-500/10 backdrop-blur-[1px] border-y-2 border-indigo-500/30 transition-all pointer-events-none z-10"
                            style={{
                                left: `${(startTime / maxDuration) * 100}%`,
                                width: `${(duration / maxDuration) * 100}%`
                            }}
                        >
                            <div className="absolute inset-y-0 left-0 w-1 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                            <div className="absolute inset-y-0 right-0 w-1 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                        </div>

                        {/* Draggable Playhead */}
                        {isReady && (
                            <div
                                className="absolute top-2 bottom-2 w-[2px] bg-white z-20 shadow-[0_0_10px_rgba(255,255,255,0.8)] pointer-events-none"
                                style={{ 
                                    left: `${(virtualCurrentTime / maxDuration) * 100}%`,
                                    transition: (isDragging || isScrubbing) ? 'none' : 'left 0.08s linear',
                                    opacity: isPlaying || isDragging || isScrubbing ? 1 : 0.6
                                }}
                            >
                                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full border-2 border-indigo-500 shadow-lg flex items-center justify-center">
                                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                                </div>
                            </div>
                        )}
                        
                        {!isReady && (
                            <div className="absolute inset-0 bg-white/60 dark:bg-gray-900/60 backdrop-blur-[2px] z-30 flex items-center justify-center">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                    <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Loading Audio...</span>
                                </div>
                            </div>
                        )}

                        <div className="absolute bottom-3 left-3 text-[10px] uppercase font-bold text-gray-400 bg-white/90 dark:bg-gray-900/90 px-2 py-1 rounded-md pointer-events-none z-20 border border-gray-100 dark:border-gray-800 flex items-center gap-2">
                            {isReady ? (
                                <>
                                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                                    <span>1-to-1 Full Song Timeline ({formatTime(maxDuration)})</span>
                                </>
                            ) : 'Initializing Reader...'}
                        </div>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="mt-auto pt-6 border-t border-gray-100 dark:border-gray-800 flex items-center gap-4">
                    <button
                        onClick={togglePlay}
                        className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center hover:bg-indigo-100 transition-colors shadow-sm"
                    >
                        {isPlaying ? <FiPause size={28} /> : <FiPlay className="ml-1" size={28} />}
                    </button>
                    <button
                        onClick={() => onConfirm(startTime, duration)}
                        className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black text-lg shadow-lg shadow-indigo-500/25 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    >
                        <FiCheck size={24} /> Confirm Selection
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AudioTrimmer;
