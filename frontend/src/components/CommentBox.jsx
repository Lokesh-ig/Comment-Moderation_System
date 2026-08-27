import { useState, useRef, useEffect } from 'react';
import { postComment } from '../services/api';
import { useAuth } from '../context/AuthContext';
import EmojiPicker from 'emoji-picker-react';

const CommentBox = ({ postId, onCommentPosted, replyTo, onCancelReply }) => {
    const { user } = useAuth();
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const emojiPickerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
                setShowEmojiPicker(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const onEmojiClick = (emojiObject) => {
        setText(prevText => prevText + emojiObject.emoji);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!text.trim() || !postId) return;

        setLoading(true);
        setResult(null);

        try {
            const res = await postComment({
                text: text.trim(),
                post_id: postId,
                parent_id: replyTo?.id
            });
            const data = res.data;

            const status = data.status || data.moderation_result || 'allowed';
            setResult({ status, message: data.message || '' });
            setText('');

            // Only add approved comments to the visible list
            if (status === 'allowed' && onCommentPosted && data.comment) {
                onCommentPosted(data.comment);
            }

            if (onCancelReply) {
                onCancelReply();

            }

            // Auto-hide result after 4 seconds
            setTimeout(() => setResult(null), 4000);
        } catch (err) {
            setResult({
                status: 'error',
                message: err.response?.data?.message || err.response?.data?.error || 'Failed to post comment',
            });
            setTimeout(() => setResult(null), 4000);
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="space-y-3">
            {replyTo && (
                <div className="flex items-center justify-between px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg border border-indigo-100 dark:border-indigo-900/50 animate-slide-down">
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        Replying to <span className="font-bold">@{replyTo.username}</span>
                    </span>
                    <button
                        onClick={onCancelReply}
                        className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-full text-indigo-400 transition-colors"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-xs shrink-0">
                    {user.username?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 relative flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl border border-transparent focus-within:border-indigo-500/30 focus-within:ring-2 focus-within:ring-indigo-500/40 transition-all">
                    <button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="pl-3 pr-2 py-2.5 text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors focus:outline-none flex-shrink-0"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </button>
                    <input
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder={replyTo ? `Reply to @${replyTo.username}...` : "Add a comment..."}
                        className="w-full py-2.5 pr-4 bg-transparent text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={loading}
                    />
                    {showEmojiPicker && (
                        <div className="absolute bottom-full left-0 mb-2 z-50 shadow-xl" ref={emojiPickerRef}>
                            <EmojiPicker 
                                onEmojiClick={onEmojiClick} 
                                theme="auto" 
                                previewConfig={{ showPreview: false }} 
                            />
                        </div>
                    )}
                </div>
                <button
                    type="submit"
                    disabled={loading || !text.trim()}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold hover:from-indigo-600 hover:to-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg hover:shadow-indigo-500/25 flex items-center gap-2"
                >
                    {loading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin-slow" />
                    ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    )}
                    {replyTo ? 'Reply' : 'Post'}
                </button>
            </form>

            {result && (
                <div className={`text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-2 animate-fade-in ${
                    result.status === 'allowed'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                        : result.status === 'flagged'
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                        : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
                }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shrink-0" />
                    <span>
                        {result.status === 'allowed' && 'Comment posted!'}
                        {result.status === 'flagged' && 'Comment submitted for moderation review'}
                        {result.status === 'deleted' && 'Comment removed due to content policy'}
                        {result.status === 'error' && (result.message || 'Failed to post comment')}
                    </span>
                </div>
            )}
        </div>
    );
};

export default CommentBox;
