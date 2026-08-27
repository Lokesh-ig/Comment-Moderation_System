import { useState, useEffect } from 'react';
import { toggleCommentLike, deleteComment } from '../services/api';
import { useAuth } from '../context/AuthContext';

const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m`;
    if (diffHr < 24) return `${diffHr}h`;
    if (diffDay < 7) return `${diffDay}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const CommentItem = ({ comment, index = 0, onReply, onDelete }) => {
    // If comment is flagged or deleted, do not render it or any guideline message
    if (comment.status && comment.status !== 'allowed') {
        return null;
    }

    const { user } = useAuth();
    const [liked, setLiked] = useState(comment.is_liked || false);
    const [likesCount, setLikesCount] = useState(comment.likes_count || 0);
    const [animating, setAnimating] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Sync state with props when they change (e.g., on new post load)
    useEffect(() => {
        setLiked(comment.is_liked || false);
        setLikesCount(comment.likes_count || 0);
    }, [comment.is_liked, comment.likes_count]);

    const handleLike = async () => {
        const previousLiked = liked;
        const previousCount = likesCount;

        // Optimistic UI update
        setLiked(!liked);
        setLikesCount(prev => liked ? prev - 1 : prev + 1);

        if (!liked) {
            setAnimating(true);
            setTimeout(() => setAnimating(false), 600);
        }

        try {
            const res = await toggleCommentLike(comment.id);
            setLiked(res.data.liked);
            setLikesCount(res.data.likes_count);
        } catch (err) {
            console.error('Failed to toggle comment like:', err);
            // Revert on error
            setLiked(previousLiked);
            setLikesCount(previousCount);
        }
    };

    const handleDelete = async () => {
        if (deleting) return;
        setDeleting(true);
        try {
            await deleteComment(comment.id);
            if (onDelete) onDelete(comment.id);
        } catch (err) {
            console.error('Failed to delete comment:', err);
            setDeleting(false);
        }
    };

    const username = comment.username || 'User';
    const isReply = !!comment.parent;
    const canDelete = user && (user.username === username || user.is_staff);

    return (
        <div
            className={`flex items-start gap-3 group animate-fade-in-up opacity-0 relative ${isReply ? 'ml-10' : ''}`}
            style={{ animationDelay: `${index * 0.05}s` }}
        >
            {/* Visual connector for replies */}
            {isReply && (
                <div className="absolute -left-6 top-0 bottom-6 w-px bg-gray-100 dark:bg-gray-800" />
            )}

            <div className={`rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-semibold shrink-0 shadow-sm transition-transform group-hover:scale-105 ${isReply ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs'}`}>
                {username.charAt(0).toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-gray-900 dark:text-white hover:underline cursor-pointer">{username}</span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium flex items-center gap-1.5">
                        <span className="w-0.5 h-0.5 rounded-full bg-gray-300 dark:bg-gray-700" />
                        {formatTime(comment.created_at)}
                    </span>

                    {/* Delete button — visible on hover for owner/staff */}
                    {canDelete && (
                        <button
                            onClick={handleDelete}
                            disabled={deleting}
                            className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-30"
                            title="Delete comment"
                        >
                            {deleting ? (
                                <div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            )}
                        </button>
                    )}
                </div>

                <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 leading-relaxed break-words">
                    {comment.text}
                </p>

                <div className="mt-1.5 flex items-center gap-4">
                    <button
                        onClick={handleLike}
                        className={`flex items-center gap-1.5 text-[10px] font-bold transition-all active:scale-110 ${liked ? 'text-red-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                    >
                        <svg
                            className={`w-3.5 h-3.5 transition-all ${liked ? 'fill-current' : ''} ${animating ? 'animate-heart' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2.5}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        {likesCount > 0 ? likesCount : 'Like'}
                    </button>

                    {!isReply && (
                        <button
                            onClick={() => onReply && onReply(comment)}
                            className="text-[10px] font-bold text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors uppercase tracking-tight"
                        >
                            Reply
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CommentItem;
