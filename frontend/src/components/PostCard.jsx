import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import CommentBox from './CommentBox';
import CommentList from './CommentList';
import { toggleLike, deletePost, toggleSave, updatePost } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FiHeart, FiMessageCircle, FiSend, FiMoreHorizontal, FiBookmark, FiTrash2, FiX, FiMusic, FiEdit2, FiVolume2, FiVolumeX } from 'react-icons/fi';
import EditPostModal from './EditPostModal';
import ShareModal from './ShareModal';

const PostCard = ({ post, onLike, onDelete }) => {
    const { user } = useAuth();
    const [liked, setLiked] = useState(post?.is_liked || false);
    const [likesCount, setLikesCount] = useState(post?.likes_count || 0);
    const [saved, setSaved] = useState(post?.is_saved || false);
    const [comments, setComments] = useState(post.comments || []);
    const [replyTo, setReplyTo] = useState(null);
    const [heartAnim, setHeartAnim] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [isVisible, setIsVisible] = useState(false);
    const menuRef = useRef(null);
    const audioRef = useRef(null);
    const postRef = useRef(null);

    useEffect(() => {
        setLiked(post?.is_liked || false);
        setLikesCount(post?.likes_count || 0);
        setSaved(post?.is_saved || false);
        setComments(post.comments || []);
    }, [post?.is_liked, post?.likes_count, post?.is_saved, post.comments]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setShowMenu(false);
            }
        };
        if (showMenu) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMenu]);

    // Track Intersection
    useEffect(() => {
        if (!post.music_url) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsVisible(entry.isIntersecting);
            },
            { threshold: 0.1 }
        );

        if (postRef.current) observer.observe(postRef.current);
        return () => observer.disconnect();
    }, [post.music_url]);

    // Reactive Playback Control
    useEffect(() => {
        if (!post.music_url || !audioRef.current) return;

        const audio = audioRef.current;
        let animationFrameId;

        const checkTime = () => {
            if (audio && !audio.paused && audio.duration) {
                const actualDuration = audio.duration;
                // Safely handle startTime if it's beyond the actual snippet duration (e.g. 30s preview)
                const startTime = (post.music_start_time || 0) % actualDuration;
                const duration = Math.min(post.music_duration || 30, actualDuration);
                const endTime = startTime + duration;

                // If current time is outside the expected span, reset to the start point
                // Use a small buffer (0.2s) to prevent rapid resets near the end or if duration is slightly off
                if (audio.currentTime >= endTime || audio.currentTime < startTime - 0.2) {
                    audio.currentTime = startTime;
                }
            }
            animationFrameId = requestAnimationFrame(checkTime);
        };

        const handleVisibilityChange = () => {
            if (document.hidden) {
                audio.pause();
            } else if (isVisible && !isMuted) {
                audio.play().catch(e => console.log('Tab refocus play blocked', e));
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        if (isVisible && !isMuted && !document.hidden) {
            audio.muted = false;
            audio.volume = 1.0;

            const playAudio = () => {
                const actualDuration = audio.duration || 30;
                const startTime = (post.music_start_time || 0) % actualDuration;

                if (audio.paused) {
                    // Start at the correct position or where it was
                    audio.currentTime = (audio.currentTime >= startTime) ? audio.currentTime : startTime;
                    audio.play()
                        .then(() => {
                            animationFrameId = requestAnimationFrame(checkTime);
                        })
                        .catch(e => console.log('Reactive play blocked', e));
                } else {
                    animationFrameId = requestAnimationFrame(checkTime);
                }
            };

            // If metadata isn't loaded yet, wait for it
            if (audio.readyState < 1) {
                audio.addEventListener('loadedmetadata', playAudio, { once: true });
            } else {
                playAudio();
            }
        } else {
            audio.pause();
            cancelAnimationFrame(animationFrameId);
        }

        return () => {
            cancelAnimationFrame(animationFrameId);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [post.music_url, isVisible, isMuted, post.music_start_time, post.music_duration]);

    // Ensure audio loads once URL is ready
    useEffect(() => {
        if (post.music_url && audioRef.current) {
            audioRef.current.load();
        }
    }, [post.music_url]);

    const toggleMute = () => {
        setIsMuted(prev => !prev);
    };

    const handleLike = async () => {
        const previousLiked = liked;
        const previousCount = likesCount;
        setLiked(!liked);
        setLikesCount(prev => liked ? prev - 1 : prev + 1);
        try {
            const res = await toggleLike(post.id);
            if (res.data.liked && !previousLiked) {
                setHeartAnim(true);
                setTimeout(() => setHeartAnim(false), 600);
            }
        } catch (err) {
            setLiked(previousLiked);
            setLikesCount(previousCount);
        }
    };

    const handleSave = async () => {
        const prev = saved;
        setSaved(!saved);
        try {
            await toggleSave(post.id);
        } catch (err) {
            setSaved(prev);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Delete this post permanently?')) return;
        setDeleting(true);
        try {
            await deletePost(post.id);
            setShowMenu(false);
            if (onDelete) onDelete(post.id);
        } catch (err) {
            console.error('Failed to delete post:', err);
        } finally {
            setDeleting(false);
        }
    };

    const handleCommentPosted = (newComment) => {
        if (newComment && typeof newComment === 'object') {
            setComments(prevComments => [...(Array.isArray(prevComments) ? prevComments : []), newComment]);
        }
        setReplyTo(null); // Clear reply state
    };

    const handleCommentDeleted = (commentId) => {
        setComments(prevComments => prevComments.filter(c => c.id !== commentId));
    };

    const isAuthor = user?.username === post?.author_username;

    return (
        <div ref={postRef} className="bg-white dark:bg-black border border-gray-100 dark:border-gray-900 rounded-lg md:rounded-xl overflow-hidden mb-6 animate-fade-in shadow-sm relative">
            {/* Post Header */}
            <div className="flex items-center justify-between p-3 md:p-4">
                <Link to={`/profile/${post?.author_username}`} className="flex items-center gap-3 group">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 transition-transform group-hover:scale-110">
                        <div className="w-full h-full rounded-full border-2 border-white dark:border-black overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                            {post?.author_avatar_url ? (
                                <img src={post.author_avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-xs font-bold text-gray-400">{post?.author_username?.charAt(0)?.toUpperCase()}</span>
                            )}
                        </div>
                    </div>
                    <div>
                        <p className="text-sm font-bold dark:text-white group-hover:text-indigo-400 transition-colors uppercase tracking-wide">
                            {post?.author_username}
                        </p>
                        <div className="flex items-center gap-2">
                            <p className="text-[10px] text-gray-400 dark:text-gray-500">{post?.location || 'Community Feed'}</p>
                            {post.music_title && (
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-500 dark:text-indigo-400">
                                    <span className="text-gray-300">•</span>
                                    <FiMusic size={10} className="animate-pulse" />
                                    <span className="truncate max-w-[150px]">{post.music_title}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </Link>

                {(isAuthor || user?.is_staff) && (
                    <div className="relative" ref={menuRef}>
                        <button onClick={() => setShowMenu(!showMenu)} className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors p-1">
                            <FiMoreHorizontal size={20} />
                        </button>
                        {showMenu && (
                            <div className="absolute right-0 top-10 w-56 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden z-50 animate-scale-in">
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
                                >
                                    <FiTrash2 size={16} />
                                    {deleting ? 'Deleting...' : 'Delete Post'}
                                </button>
                                {isAuthor && (
                                    <button
                                        onClick={() => { setShowMenu(false); setShowEditModal(true); }}
                                        className="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        <FiEdit2 size={16} />
                                        Edit Post
                                    </button>
                                )}
                                <button onClick={() => setShowMenu(false)} className="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                    <FiX size={16} />
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Image Section */}
            <div className="relative bg-gray-50 dark:bg-gray-900 flex items-center justify-center overflow-hidden" onDoubleClick={handleLike}>
                <img
                    src={post.image}
                    alt="Post"
                    className="w-full h-auto max-h-[800px] object-contain transition-opacity duration-500"
                    onLoad={(e) => e.target.style.opacity = 1}
                    style={{ opacity: 0 }}
                />

                {/* Mute/Unmute Toggle for music */}
                {post.music_url && (
                    <>
                        <audio
                            ref={audioRef}
                            src={post.music_url}
                            muted={isMuted}
                            loop
                            preload="auto"
                            playsInline
                            className="hidden"
                        />
                        <button
                            onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                            className="absolute bottom-3 right-3 z-20 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-all border border-white/10 shadow-lg"
                        >
                            {isMuted ? <FiVolumeX size={14} /> : <FiVolume2 size={14} className="animate-pulse" />}
                        </button>
                    </>
                )}

                {heartAnim && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <FiHeart size={80} className="text-white fill-white animate-heart opacity-90" />
                    </div>
                )}
            </div>

            {/* Tagged Users */}
            {post?.tagged_users && post.tagged_users.length > 0 && (
                <div className="px-4 pt-3 flex items-center gap-1.5 flex-wrap">
                    <FiUser size={14} className="text-gray-400" />
                    {post.tagged_users.map((tagged, i) => (
                        <span key={tagged.id}>
                            <Link to={`/profile/${tagged.username}`} className="text-xs font-bold text-gray-800 dark:text-gray-200 hover:text-indigo-500 transition-colors">
                                {tagged.username}
                            </Link>
                            {i < post.tagged_users.length - 1 && <span className="text-gray-400 text-xs">, </span>}
                        </span>
                    ))}
                </div>
            )}

            {/* Actions & Content */}
            <div className="p-4 pt-7">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                        <button onClick={handleLike} className="transition-transform active:scale-125">
                            <FiHeart size={26} className={liked ? 'text-red-500 fill-red-500' : 'text-gray-700 dark:text-gray-200'} />
                        </button>
                        <button onClick={() => setShowComments(!showComments)} className="hover:text-gray-500 transition-colors">
                            <FiMessageCircle size={26} className="text-gray-700 dark:text-gray-200" />
                        </button>
                        <button onClick={() => setShowShareModal(true)} className="hover:text-gray-500 transition-colors">
                            <FiSend size={26} className="text-gray-700 dark:text-gray-200" />
                        </button>
                    </div>
                    <button onClick={handleSave} className="transition-transform active:scale-125">
                        <FiBookmark size={26} className={saved ? 'text-indigo-500 fill-indigo-500' : 'text-gray-700 dark:text-gray-200'} />
                    </button>
                </div>

                <p className="text-sm font-bold dark:text-white mb-2">{likesCount.toLocaleString()} likes</p>
                <div className="text-sm dark:text-gray-200">
                    <Link to={`/profile/${post.author_username}`} className="font-bold mr-2 hover:underline">{post.author_username}</Link>
                    {post.caption}
                </div>

                <button onClick={() => setShowComments(!showComments)} className="text-gray-500 dark:text-gray-400 text-sm mt-2 hover:underline">
                    {showComments ? 'Hide comments' : `View all ${post.comment_count} comments`}
                </button>

                {showComments && (
                    <div className="mt-4 space-y-4 border-t border-gray-100 dark:border-gray-900 pt-4 animate-fade-in">
                        <CommentList
                            comments={comments}
                            onReply={(comment) => setReplyTo(comment)}
                            onDelete={handleCommentDeleted}
                        />
                        <CommentBox
                            postId={post.id}
                            replyTo={replyTo}
                            onCancelReply={() => setReplyTo(null)}
                            onCommentPosted={handleCommentPosted}
                        />
                    </div>
                )}

                <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase mt-3 tracking-widest">
                    {new Date(post.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
                </p>
            </div>

            {/* Edit Modal */}
            {showEditModal && (
                <EditPostModal
                    post={post}
                    onClose={() => setShowEditModal(false)}
                    onUpdate={(updatedData) => {
                        Object.assign(post, updatedData);
                        setShowEditModal(false);
                    }}
                />
            )}

            {/* Share Modal */}
            {showShareModal && (
                <ShareModal
                    post={post}
                    onClose={() => setShowShareModal(false)}
                />
            )}
        </div>
    );
};

// Simple FiUser icon replacement for what was an SVG before
const FiUser = ({ size, className }) => (
    <svg size={size} className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ width: size, height: size }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

export default PostCard;
