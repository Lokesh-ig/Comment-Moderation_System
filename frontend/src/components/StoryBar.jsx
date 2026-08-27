import { useState, useEffect, useRef } from 'react';
import { getStories, postStory, getFollowers, deleteStory, likeStory, replyToStory } from '../services/api';
import { FiPlus, FiX, FiChevronLeft, FiChevronRight, FiCamera, FiMusic, FiTag, FiFileText, FiCheck, FiTrash2, FiHeart, FiSend, FiVolume2, FiVolumeX } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import MusicSearchMenu from './MusicSearchMenu';
import AudioTrimmer from './AudioTrimmer';

const StoryViewer = ({ stories, initialIndex, onClose, onDelete, currentUser, getRelativeTime }) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [progress, setProgress] = useState(0);
    const [replyText, setReplyText] = useState('');
    const [sendingReply, setSendingReply] = useState(false);
    const [localLiked, setLocalLiked] = useState(false);
    const [showHeartAnimation, setShowHeartAnimation] = useState(false);
    const [isMuted, setIsMuted] = useState(true);

    const timerRef = useRef(null);
    const story = stories[currentIndex];

    // Sync local state with story data
    useEffect(() => {
        if (story) {
            setLocalLiked(story.is_liked);
        }
    }, [story]);

    useEffect(() => {
        setProgress(0);
        // Calculate duration: Use music_duration if present, else default (15s for image, 60s for video)
        let displayDuration = story.music_duration ? story.music_duration * 1000 : (story.is_video ? 60000 : 15000);

        // Ensure minimum 5s duration
        displayDuration = Math.max(displayDuration, 5000);

        const interval = 50;
        let elapsed = 0;

        // Video and Audio handles for timer and cleanup
        const audio = document.getElementById(`story-audio-${story.id}`);
        const video = document.getElementById(`story-video-${story.id}`);
        
        if (video) {
            video.currentTime = 0;
            video.play().catch(e => console.log("Video play blocked", e));
        }

        timerRef.current = setInterval(() => {
            if (video && video.paused && !video.ended) return; // Wait if video is buffering

            // Handle Audio Wrap-Around Looping
            if (audio && story.music_duration) {
                const startTime = story.music_start_time || 0;
                const actualDur = audio.duration || 30;
                
                // Calculate elapsed time since start, accounting for 30s wrap
                let playedFromStart = audio.currentTime - startTime;
                if (playedFromStart < 0) playedFromStart += actualDur;

                // Loop if selected duration is exceeded
                if (playedFromStart >= story.music_duration) {
                    audio.currentTime = startTime;
                }
            }

            elapsed += interval;
            setProgress((elapsed / displayDuration) * 100);

            if (elapsed >= displayDuration) {
                if (currentIndex < stories.length - 1) {
                    setCurrentIndex(prev => prev + 1);
                } else {
                    onClose();
                }
            }
        }, interval);

        return () => {
            clearInterval(timerRef.current);
            if (audio) audio.pause();
            if (video) video.pause();
        };
    }, [currentIndex, stories.length, onClose, story.id]);

    const goNext = () => {
        const audio = document.getElementById(`story-audio-${story.id}`);
        if (audio) audio.pause();
        if (currentIndex < stories.length - 1) setCurrentIndex(prev => prev + 1);
        else onClose();
    };

    const goPrev = () => {
        const audio = document.getElementById(`story-audio-${story.id}`);
        if (audio) audio.pause();
        if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
    };

    const toggleMute = (e) => {
        e.stopPropagation();
        const nextMuted = !isMuted;
        setIsMuted(nextMuted);
        const audio = document.getElementById(`story-audio-${story.id}`);
        if (audio) {
            audio.muted = nextMuted;
            if (!nextMuted) {
                audio.play().catch(err => console.log('Play failed on unmute', err));
            }
        }
    };

    const handleLike = async (e) => {
        e.stopPropagation();
        const prevLiked = localLiked;
        setLocalLiked(!prevLiked);
        if (!prevLiked) setShowHeartAnimation(true);
        setTimeout(() => setShowHeartAnimation(false), 800);

        try {
            const res = await likeStory(story.id);
            setLocalLiked(res.data.liked);
        } catch (err) {
            console.error('Like failed:', err);
            setLocalLiked(prevLiked);
        }
    };

    const handleReply = async (e) => {
        e.preventDefault();
        if (!replyText.trim() || sendingReply) return;

        setSendingReply(true);
        try {
            await replyToStory(story.id, replyText);
            setReplyText('');
            alert('Reply sent as a message!');
        } catch (err) {
            console.error('Reply failed:', err);
            const errorMsg = err.response?.data?.error || err.response?.data?.detail || 'Failed to send reply.';
            alert(`Error: ${errorMsg}`);
        } finally {
            setSendingReply(false);
        }
    };

    const handleShare = (e) => {
        e.stopPropagation();
        if (navigator.share) {
            navigator.share({
                title: `${story.username}'s Story`,
                text: `Check out ${story.username}'s story!`,
                url: window.location.href,
            }).catch(console.error);
        } else {
            alert('Sharing link copied to clipboard!');
            navigator.clipboard.writeText(window.location.href);
        }
    };

    if (!story) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-0 sm:p-4" onClick={onClose}>
            <div className="relative w-full max-w-[420px] h-full max-h-[90vh] mx-auto" onClick={e => e.stopPropagation()}>
                {/* Audio Element */}
                {story.music_url && (
                    <audio
                        id={`story-audio-${story.id}`}
                        src={story.music_url}
                        muted={isMuted}
                        preload="auto"
                        onLoadedMetadata={(e) => {
                            const audio = e.target;
                            const startTime = parseFloat(story.music_start_time || 0);
                            audio.currentTime = startTime;
                            audio.play().catch(err => console.log("Manual play blocked", err));
                        }}
                    />
                )}

                {/* Progress bars */}
                <div className="absolute top-3 left-3 right-3 z-20 flex gap-1">
                    {stories.map((_, i) => (
                        <div key={i} className="flex-1 h-[3px] bg-white/30 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-white rounded-full"
                                style={{
                                    width: i < currentIndex ? '100%' : i === currentIndex ? `${progress}%` : '0%',
                                    transition: i === currentIndex ? 'none' : 'width 0.3s'
                                }}
                            />
                        </div>
                    ))}
                </div>

                {/* Header */}
                <div className="absolute top-6 left-3 right-3 z-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full border-2 border-white/50 overflow-hidden bg-gray-700 shadow-lg">
                            {story.avatar_url ? (
                                <img src={story.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                                    {story.username?.charAt(0)?.toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <p className="text-white text-sm font-bold drop-shadow-md">{story.username}</p>
                                <p className="text-white/60 text-sm font-medium drop-shadow-md">
                                    {getRelativeTime(story.created_at)}
                                </p>
                            </div>
                            {story.music_url && (
                                <div className="flex items-center gap-1.5 text-white/90 text-[11px] font-bold mt-0.5 animate-fadeIn">
                                    <FiMusic size={10} className="shrink-0" />
                                    <span className="truncate max-w-[150px] drop-shadow-sm">
                                        {story.music_title} • {story.music_artist}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 z-50">
                        {story.music_url && (
                            <button
                                onClick={toggleMute}
                                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors drop-shadow-md"
                                title={isMuted ? "Unmute" : "Mute"}
                            >
                                {isMuted ? <FiVolumeX size={22} /> : <FiVolume2 size={22} className="animate-pulse" />}
                            </button>
                        )}
                        {currentUser?.username === story.username && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm('Delete this story?')) {
                                        onDelete(story.id);
                                    }
                                }}
                                className="p-2 text-red-500 hover:text-red-400 hover:bg-black/20 rounded-full transition-colors drop-shadow-md"
                                title="Delete Story"
                            >
                                <FiTrash2 size={22} />
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors drop-shadow-md">
                            <FiX size={24} />
                        </button>
                    </div>
                </div>

                {/* Story Image */}
                <div className="w-full h-full rounded-2xl overflow-hidden bg-gray-900 relative">
                    {story.is_video ? (
                        <video
                            id={`story-video-${story.id}`}
                            src={story.video}
                            className="w-full h-full object-contain"
                            playsInline
                            muted={false}
                        />
                    ) : (
                        <img
                            src={story.image}
                            alt={`${story.username}'s story`}
                            className="w-full h-full object-contain"
                        />
                    )}

                    {/* Music Sticker removed from bottom, now in header */}

                    {/* Caption - Rendered at saved custom position */}
                    {story.caption && (
                        <div
                            className="absolute z-30 pointer-events-none flex justify-center px-4"
                            style={{
                                left: `${(story.caption_x || 0.5) * 100}%`,
                                top: `${(story.caption_y || 0.8) * 100}%`,
                                transform: 'translate(-50%, -50%)',
                                width: 'fit-content',
                                minWidth: '120px'
                            }}
                        >
                            <p className="text-white text-base font-bold px-2 py-1 inline-block drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] text-center break-words max-w-[280px] drop-shadow-2xl">
                                {story.caption}
                            </p>
                        </div>
                    )}

                    {/* Big Heart Animation */}
                    {showHeartAnimation && (
                        <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
                            <FiHeart size={100} className="text-white fill-white animate-heart-pop opacity-0" />
                        </div>
                    )}
                </div>

                {/* Footer Interactions */}
                <div className="absolute bottom-4 left-3 right-3 z-40 flex items-center gap-3">
                    <form onSubmit={handleReply} className="flex-1 flex items-center bg-transparent ring-1 ring-white/30 rounded-full px-4 py-2 hover:ring-white/50 focus-within:ring-white transition-all bg-black/20 backdrop-blur-sm">
                        <input
                            type="text"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Send message"
                            className="bg-transparent border-none text-white text-sm w-full focus:ring-0 placeholder:text-white/60"
                            onClick={(e) => e.stopPropagation()}
                        />
                        {replyText.trim() && (
                            <button type="submit" disabled={sendingReply} className="ml-2 text-white">
                                <FiSend size={18} />
                            </button>
                        )}
                    </form>

                    <button
                        onClick={handleLike}
                        className={`transition-transform flex flex-col items-center group ${localLiked ? 'scale-110' : 'hover:scale-110'}`}
                    >
                        <FiHeart size={28} className={`${localLiked ? 'text-red-500 fill-red-500' : 'text-white'}`} />
                    </button>

                    <button
                        onClick={handleShare}
                        className="text-white hover:scale-110 transition-transform"
                    >
                        <FiSend size={28} className="rotate-[-20deg]" />
                    </button>
                </div>

                {/* Navigation areas */}
                <div className="absolute inset-0 top-16 bottom-20 flex z-0">
                    <div className="w-1/3 h-full cursor-pointer" onClick={goPrev} />
                    <div className="w-1/3 h-full" />
                    <div className="w-1/3 h-full cursor-pointer" onClick={goNext} />
                </div>

                {/* Arrow buttons */}
                {currentIndex > 0 && (
                    <button onClick={goPrev} className="absolute -left-16 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md hidden md:flex items-center justify-center text-white hover:bg-white/20 transition-all">
                        <FiChevronLeft size={24} />
                    </button>
                )}
                {currentIndex < stories.length - 1 && (
                    <button onClick={goNext} className="absolute -right-16 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md hidden md:flex items-center justify-center text-white hover:bg-white/20 transition-all">
                        <FiChevronRight size={24} />
                    </button>
                )}
            </div>
        </div>
    );
};


const CreateStoryModal = ({ file, onClose, onUpload, user }) => {
    const [caption, setCaption] = useState('');
    const [selectedTrack, setSelectedTrack] = useState(null);
    const [trimStartTime, setTrimStartTime] = useState(0);
    const [musicDuration, setMusicDuration] = useState(15);
    const [showMusicSearch, setShowMusicSearch] = useState(false);
    const [showTrimmer, setShowTrimmer] = useState(false);

    const [taggedUsers, setTaggedUsers] = useState([]);
    const [followers, setFollowers] = useState([]);
    const [previewUrl, setPreviewUrl] = useState('');
    const [uploading, setUploading] = useState(false);
    const [showTagMenu, setShowTagMenu] = useState(false);
    const [captionPos, setCaptionPos] = useState({ x: 0.5, y: 0.8 });

    useEffect(() => {
        if (file) {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [file]);

    useEffect(() => {
        if (user && user.username) {
            getFollowers(user.username)
                .then(res => setFollowers(res.data || []))
                .catch(err => console.error('Failed to fetch followers for tagging:', err));
        }
    }, [user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setUploading(true);
        const formData = new FormData();

        const isVideo = file.type.startsWith('video/');
        if (isVideo) {
            formData.append('video', file);
            formData.append('is_video', 'true');
        } else {
            formData.append('image', file);
            formData.append('is_video', 'false');
        }

        if (caption.trim()) formData.append('caption', caption.trim());

        if (selectedTrack) {
            formData.append('music_title', selectedTrack.trackName);
            formData.append('music_artist', selectedTrack.artistName);
            formData.append('music_url', selectedTrack.previewUrl);
            formData.append('music_coverart', selectedTrack.artworkUrl100);
            
            // Map the full-song bit to the 30s preview snippet:
            // (trimStartTime / maxTrackDuration) * 30
            const maxTrackDuration = selectedTrack.trackTimeMillis ? Math.floor(selectedTrack.trackTimeMillis / 1000) : 30;
            const actualPreviewStartTime = maxTrackDuration > 0 ? (trimStartTime / maxTrackDuration) * 30 : 0;
            
            formData.append('music_start_time', actualPreviewStartTime);
            formData.append('music_duration', musicDuration);
        }

        if (taggedUsers.length > 0) {
            formData.append('tagged_users', JSON.stringify(taggedUsers.map(u => u.username)));
        }

        formData.append('caption_x', captionPos.x);
        formData.append('caption_y', captionPos.y);

        await onUpload(formData);
        setUploading(false);
    };

    const handleTrackSelect = (track) => {
        setTrimStartTime(0); // Reset start time for new track
        setSelectedTrack(track);
        setShowMusicSearch(false);
        setShowTrimmer(true);
    };

    const handleTrimConfirm = (time, duration) => {
        setTrimStartTime(time);
        setMusicDuration(duration);
        setShowTrimmer(false);
    };

    const toggleTag = (follower) => {
        if (taggedUsers.find(u => u.id === follower.id)) {
            setTaggedUsers(prev => prev.filter(u => u.id !== follower.id));
        } else {
            setTaggedUsers(prev => [...prev, follower]);
        }
    };

    const handlePreviewClick = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        setCaptionPos({ x, y });
    };

    return (
        <div className="fixed inset-0 z-[250] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
            <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row shadow-2xl animate-scale-in relative h-full max-h-[90vh] md:max-h-[600px]" onClick={e => e.stopPropagation()}>
                {/* Image/Video Preview Side */}
                <div className="w-full md:w-1/2 bg-gray-100 dark:bg-gray-800 relative flex items-center justify-center min-h-[300px] md:h-full">
                    {previewUrl && (
                        file.type.startsWith('video/') ? (
                            <video src={previewUrl} className="w-full h-full object-contain" controls muted autoPlay loop />
                        ) : (
                            <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                        )
                    )}

                    {/* Live Preview Overlays */}
                    {selectedTrack && (
                        <div className="absolute top-8 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full flex items-center gap-2 text-white border border-white/30 text-sm font-bold shadow-lg animate-pulse">
                            <FiMusic size={14} /> {selectedTrack.trackName} - {selectedTrack.artistName}
                        </div>
                    )}

                    {/* Interactive Preview for Caption Positioning */}
                    <div
                        className="absolute inset-0 cursor-crosshair z-10"
                        onClick={handlePreviewClick}
                        title="Click to position caption"
                    />

                    {caption && (
                        <div
                            className="absolute z-20 pointer-events-none transition-all duration-300 ease-out flex justify-center"
                            style={{
                                left: `${captionPos.x * 100}%`,
                                top: `${captionPos.y * 100}%`,
                                transform: 'translate(-50%, -50%)',
                                width: 'fit-content',
                                minWidth: '100px'
                            }}
                        >
                            <span className="text-white text-sm font-bold px-2 py-1 inline-block drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] text-center shadow-indigo-500/20">
                                {caption}
                            </span>
                        </div>
                    )}
                </div>

                {/* Form Controls Side */}
                <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col h-full overflow-hidden">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                            <FiCamera className="text-indigo-500" /> Share Story
                        </h2>
                        <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400">
                            <FiX size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 no-scrollbar space-y-5">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <FiFileText /> Caption
                            </label>
                            <textarea
                                value={caption}
                                onChange={e => setCaption(e.target.value)}
                                placeholder="Write something amazing..."
                                className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl p-4 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 resize-none h-24 text-sm"
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <FiMusic /> Music
                            </label>
                            {!selectedTrack ? (
                                <button
                                    type="button"
                                    onClick={() => setShowMusicSearch(true)}
                                    className="w-full bg-gray-50 dark:bg-gray-800 border-dashed border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 text-gray-400 hover:border-indigo-500 hover:text-indigo-500 transition-all flex items-center justify-center gap-2 text-sm font-medium"
                                >
                                    <FiPlus /> Add Music to Story
                                </button>
                            ) : (
                                <div className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
                                    <img src={selectedTrack.artworkUrl100} className="w-12 h-12 rounded-lg object-cover" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm dark:text-white truncate">{selectedTrack.trackName}</p>
                                        <p className="text-xs text-indigo-500 truncate">
                                            {selectedTrack.artistName} • {musicDuration}s clip • {musicDuration}s story
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setShowTrimmer(true)}
                                            className="px-3 py-1.5 text-xs font-bold text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-lg transition-colors"
                                        >
                                            Adjust
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowMusicSearch(true)}
                                            className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                        >
                                            Change
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-2 relative">
                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <FiTag /> Tag Followers
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowTagMenu(!showTagMenu)}
                                className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl p-4 text-left flex items-center justify-between text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm"
                            >
                                <span className={taggedUsers.length === 0 ? 'text-gray-400' : 'font-medium'}>
                                    {taggedUsers.length === 0 ? 'Select people...' : `${taggedUsers.length} people tagged`}
                                </span>
                                <FiChevronRight className={`transition-transform ${showTagMenu ? 'rotate-90' : ''}`} />
                            </button>

                            {showTagMenu && (
                                <div className="absolute top-[100%] left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-2xl z-20 max-h-48 overflow-y-auto p-2 animate-slide-down">
                                    {followers.length === 0 ? (
                                        <div className="p-4 text-center text-sm text-gray-500">You don't have any followers yet.</div>
                                    ) : (
                                        followers.map(f => {
                                            const isTagged = taggedUsers.find(u => u.id === f.id);
                                            return (
                                                <div
                                                    key={f.id}
                                                    onClick={() => toggleTag(f)}
                                                    className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200">
                                                            {f.avatar_url ? <img src={f.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold">{f.username.charAt(0).toUpperCase()}</div>}
                                                        </div>
                                                        <span className="text-sm font-medium dark:text-white">{f.username}</span>
                                                    </div>
                                                    {isTagged && <FiCheck className="text-indigo-500" size={18} />}
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 py-3.5 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                            Cancel
                        </button>
                        <button onClick={handleSubmit} disabled={uploading} className="flex-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3.5 rounded-xl font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20">
                            {uploading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Post Now'}
                        </button>
                    </div>

                    {/* Overlays */}
                    {showMusicSearch && (
                        <MusicSearchMenu
                            onSelect={handleTrackSelect}
                            onClose={() => setShowMusicSearch(false)}
                        />
                    )}
                    {showTrimmer && selectedTrack && (
                        <AudioTrimmer
                            key={selectedTrack.trackId}
                            track={selectedTrack}
                            initialStartTime={trimStartTime}
                            initialDuration={musicDuration}
                            onConfirm={handleTrimConfirm}
                            onCancel={() => setShowTrimmer(false)}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

const StoryBar = () => {
    const [stories, setStories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);
    const [viewerStories, setViewerStories] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const { user } = useAuth();

    const fetchStories = async () => {
        try {
            const res = await getStories();
            setStories(res.data || []);
        } catch (err) {
            console.error('Failed to fetch stories:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStories();
    }, []);

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
        }
        e.target.value = ''; // Reset input to allow re-selecting the same file if modal is closed
    };

    const handleUploadStory = async (formData) => {
        try {
            const res = await postStory(formData);
            if (res.data) {
                // Refetch all stories to get proper ordering
                await fetchStories();
                setUploadSuccess(true);
                setSelectedFile(null); // Close modal
                setTimeout(() => setUploadSuccess(false), 3000);
            }
        } catch (err) {
            console.error('Failed to post story:', err.response?.data || err);
            let errorMsg = 'Failed to upload story. Please try again.';
            if (err.response?.data) {
                if (typeof err.response.data === 'string') {
                    errorMsg = err.response.data;
                } else if (err.response.data.details) {
                    errorMsg = err.response.data.details;
                } else if (err.response.data.error) {
                    errorMsg = err.response.data.error;
                } else {
                    // Handle DRF field errors
                    const fieldErrors = Object.entries(err.response.data)
                        .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
                        .join('\n');
                    if (fieldErrors) errorMsg = fieldErrors;
                }
            }
            alert(errorMsg);
        }
    };

    const handleDeleteStory = async (storyId) => {
        try {
            await deleteStory(storyId);
            setViewerOpen(false);
            fetchStories();
        } catch (err) {
            console.error('Failed to delete story:', err);
            alert('Failed to delete story.');
        }
    };

    const openStory = (userStoriesGroup) => {
        setViewerStories(userStoriesGroup);
        setViewerIndex(0);
        setViewerOpen(true);
    };

    // Helper for relative time (simple version)
    const getRelativeTime = (dateString) => {
        const now = new Date();
        const past = new Date(dateString);
        const diffInMs = now - past;
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
        if (diffInHours < 1) return 'Just now';
        return `${diffInHours}h`;
    };

    // Group stories by username
    const groupedStories = stories.reduce((acc, story) => {
        if (!acc[story.username]) {
            acc[story.username] = [];
        }
        acc[story.username].push(story);
        return acc;
    }, {});

    const userStories = groupedStories[user?.username] || [];
    const otherUsernames = Object.keys(groupedStories).filter(username => username !== user?.username);

    if (loading) return (
        <div className="flex gap-4 px-2 py-4 overflow-hidden">
            {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-900 animate-pulse shrink-0" />
            ))}
        </div>
    );

    return (
        <>
            {/* Story Viewer Modal */}
            {viewerOpen && (
                <StoryViewer
                    stories={viewerStories}
                    initialIndex={viewerIndex}
                    onClose={() => setViewerOpen(false)}
                    onDelete={handleDeleteStory}
                    currentUser={user}
                    getRelativeTime={getRelativeTime}
                />
            )}
            {/* Upload Success Toast */}
            {uploadSuccess && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[300] bg-green-500 text-white px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-2 animate-bounce">
                    <FiCamera size={18} />
                    Story uploaded successfully!
                </div>
            )}

            <div className="flex items-center gap-5 py-2 px-2 overflow-x-auto no-scrollbar scroll-smooth">
                {/* Your Story - Integrated View & Add */}
                <div className="flex flex-col items-center gap-2 min-w-[72px] cursor-pointer group">
                    <div className="relative">
                        {userStories.length > 0 ? (
                            /* If user has active stories, avatar opens viewer, + icon adds more */
                            <div className="relative">
                                <div
                                    onClick={() => openStory(userStories)}
                                    className="w-16 h-16 rounded-full p-[3px] bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 transition-transform duration-300 group-hover:scale-105 shadow-md"
                                >
                                    <div className="w-full h-full rounded-full border-2 border-white dark:border-black overflow-hidden bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                                        {userStories[0].is_video ? (
                                            <video src={userStories[0].video} className="w-full h-full object-cover" muted />
                                        ) : (
                                            <img src={userStories[0].image} alt="Your story" className="w-full h-full object-cover" />
                                        )}
                                    </div>
                                </div>
                                {/* Persistent Plus icon to add MORE stories */}
                                <label className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-indigo-500 border-4 border-white dark:border-black flex items-center justify-center text-white shadow-lg cursor-pointer hover:scale-110 transition-transform z-10">
                                    <FiPlus size={12} className="stroke-[3px]" />
                                    <input type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} disabled={uploading} />
                                </label>
                            </div>
                        ) : (
                            /* No active stories - show upload button style */
                            <label className="cursor-pointer">
                                <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center p-1 transition-all group-hover:border-indigo-500/50 group-hover:scale-105">
                                    <div className="w-full h-full rounded-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center relative overflow-hidden ring-2 ring-white dark:ring-black">
                                        {uploading ? (
                                            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                        ) : user?.profile?.avatar_url ? (
                                            <img src={user.profile.avatar_url} alt="You" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                        ) : (
                                            <span className="text-xl font-black text-gray-300 dark:text-gray-700">{user?.username?.charAt(0)?.toUpperCase()}</span>
                                        )}
                                        {!uploading && <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                    </div>
                                </div>
                                <input type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} disabled={uploading} />
                            </label>
                        )}
                        {/* Plus icon for initial upload */}
                        {userStories.length === 0 && !uploading && (
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-indigo-500 border-4 border-white dark:border-black flex items-center justify-center text-white shadow-lg pointer-events-none">
                                <FiPlus size={12} className="stroke-[3px]" />
                            </div>
                        )}
                    </div>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 font-bold tracking-tight">
                        {uploading ? 'Uploading...' : 'Your Story'}
                    </span>
                </div>

                {/* Other Users' Stories - Grouped by user */}
                {otherUsernames.map((username) => {
                    const userStoriesGroup = groupedStories[username];
                    const firstStory = userStoriesGroup[0];
                    return (
                        <div
                            key={username}
                            onClick={() => openStory(userStoriesGroup)}
                            className="flex flex-col items-center gap-2 min-w-[72px] cursor-pointer group animate-scale-in"
                        >
                            <div className="w-16 h-16 rounded-full p-[3px] bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 transition-transform duration-300 group-hover:scale-105 shadow-md">
                                <div className="w-full h-full rounded-full border-2 border-white dark:border-black overflow-hidden bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                                    {firstStory.avatar_url ? (
                                        <img src={firstStory.avatar_url} alt={username} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400 font-black text-lg bg-gray-100 dark:bg-gray-800">
                                            {username.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-bold tracking-tight max-w-[68px] truncate">
                                {username}
                            </span>
                        </div>
                    );
                })}

                {/* Empty state hint */}
                {otherUsernames.length === 0 && userStories.length === 0 && (
                    <div className="flex items-center gap-3 pl-2 text-gray-400 dark:text-gray-600 min-w-[180px]">
                        <FiCamera size={16} />
                        <span className="text-xs font-medium">Share your first story!</span>
                    </div>
                )}
            </div>


            {/* Create Story Modal */}
            {selectedFile && (
                <CreateStoryModal
                    file={selectedFile}
                    onClose={() => setSelectedFile(null)}
                    onUpload={handleUploadStory}
                    user={user}
                />
            )}
        </>
    );
};

export default StoryBar;
