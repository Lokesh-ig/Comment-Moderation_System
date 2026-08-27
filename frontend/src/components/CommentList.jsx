import { useState } from 'react';
import CommentItem from './CommentItem';

const CommentThread = ({ parent, replies, onReply, onDelete }) => {
    const [showReplies, setShowReplies] = useState(false);

    return (
        <div className="space-y-4">
            <CommentItem
                comment={parent}
                onReply={onReply}
                onDelete={onDelete}
            />

            {replies.length > 0 && (
                <div className="ml-10">
                    {!showReplies ? (
                        <button
                            onClick={() => setShowReplies(true)}
                            className="flex items-center gap-3 group mt-1"
                        >
                            <div className="w-6 border-t border-gray-200 dark:border-gray-800" />
                            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors uppercase tracking-tight">
                                View replies ({replies.length})
                            </span>
                        </button>
                    ) : (
                        <div className="space-y-4 animate-fade-in">
                            {replies.map((reply, ridx) => (
                                <CommentItem
                                    key={reply.id}
                                    comment={reply}
                                    index={ridx}
                                    onReply={onReply}
                                    onDelete={onDelete}
                                />
                            ))}
                            <button
                                onClick={() => setShowReplies(false)}
                                className="flex items-center gap-3 group mt-2"
                            >
                                <div className="w-6 border-t border-gray-200 dark:border-gray-800" />
                                <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors uppercase tracking-tight">
                                    Hide replies
                                </span>
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const CommentList = ({ comments = [], onReply, onDelete, loading = false }) => {
    if (loading) {
        return (
            <div className="space-y-4 px-1">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start gap-3 animate-pulse">
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
                        <div className="flex-1 space-y-2">
                            <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" />
                            <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-700" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (!comments || comments.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-gray-900 flex items-center justify-center mb-4 border border-gray-100 dark:border-gray-800">
                    <svg className="w-8 h-8 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                </div>
                <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">No comments yet</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-[200px] mx-auto">Start the conversation by sharing your thoughts below!</p>
            </div>
        );
    }

    // Group comments: Parents first, then their replies
    const topLevelComments = comments.filter(c => !c.parent).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const replies = comments.filter(c => c.parent);

    return (
        <div className="space-y-6">
            {topLevelComments.map((parent) => {
                const childReplies = replies
                    .filter(r => r.parent === parent.id)
                    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

                return (
                    <CommentThread
                        key={parent.id}
                        parent={parent}
                        replies={childReplies}
                        onReply={onReply}
                        onDelete={onDelete}
                    />
                );
            })}
        </div>
    );
};

export default CommentList;
