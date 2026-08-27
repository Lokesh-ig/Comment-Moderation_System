import React, { useState, useEffect } from 'react';
import { FiX, FiSearch, FiSend, FiUser } from 'react-icons/fi';
import { getFollowers, getFollowing, searchUsers, sendMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';

const ShareModal = ({ post, onClose }) => {
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [users, setUsers] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [notification, setNotification] = useState(null);

    // Fetch initial list of users to share with (combine followers and following to make it easy)
    useEffect(() => {
        const fetchInitialUsers = async () => {
            if (!user) return;
            setLoading(true);
            try {
                // Fetch both and combine
                const [followersRes, followingRes] = await Promise.all([
                    getFollowers(user.username),
                    getFollowing(user.username)
                ]);

                // Combine and deduplicate
                const combined = [...followersRes.data, ...followingRes.data];
                const uniqueUsers = Array.from(new Map(combined.map(item => [item.id, item])).values());
                setUsers(uniqueUsers);
            } catch (err) {
                console.error("Failed to fetch friends for sharing", err);
            } finally {
                setLoading(false);
            }
        };
        fetchInitialUsers();
    }, [user]);

    const handleSearch = async (e) => {
        const query = e.target.value;
        setSearchQuery(query);

        if (query.trim().length === 0) {
            // Re-fetch initial if search is cleared
            const [followersRes, followingRes] = await Promise.all([
                getFollowers(user.username),
                getFollowing(user.username)
            ]);
            const combined = [...followersRes.data, ...followingRes.data];
            const uniqueUsers = Array.from(new Map(combined.map(item => [item.id, item])).values());
            setUsers(uniqueUsers);
            return;
        }

        setLoading(true);
        try {
            const res = await searchUsers(query);
            // We might only want to allow sharing to mutuals, but for now we show search results
            setUsers(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const toggleUserSelection = (u) => {
        if (selectedUsers.find(selected => selected.id === u.id)) {
            setSelectedUsers(selectedUsers.filter(selected => selected.id !== u.id));
        } else {
            setSelectedUsers([...selectedUsers, u]);
        }
    };

    const handleSend = async () => {
        if (selectedUsers.length === 0) return;

        setSending(true);
        let successCount = 0;

        try {
            // Send to each selected user
            for (const targetUser of selectedUsers) {
                const formData = new FormData();
                formData.append('shared_post_id', post.id);
                // Optionally add a default message like "Check out this post"
                // formData.append('content', 'Started sharing a post');

                await sendMessage(targetUser.username, formData);
                successCount++;
            }

            setNotification(`Successfully sent to ${successCount} user(s)!`);
            setTimeout(() => {
                onClose();
            }, 1500);

        } catch (err) {
            console.error('Failed to send post', err);
            setNotification("Failed to send to some users. Ensure you follow each other.");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[500px] border border-gray-100 dark:border-gray-800 animate-scale-in">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
                    <h3 className="font-bold text-lg dark:text-white">Share Post</h3>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <FiX size={20} />
                    </button>
                </div>

                {/* Search / Selected List */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
                    <div className="relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search people..."
                            value={searchQuery}
                            onChange={handleSearch}
                            className="w-full bg-gray-100 dark:bg-gray-800 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none dark:text-white placeholder-gray-400"
                        />
                    </div>

                    {/* Selected Users Chips */}
                    {selectedUsers.length > 0 && (
                        <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 no-scrollbar">
                            {selectedUsers.map(su => (
                                <div key={su.id} className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-full shrink-0">
                                    <span className="text-xs font-bold">{su.username}</span>
                                    <button onClick={() => toggleUserSelection(su)} className="hover:text-indigo-800 dark:hover:text-indigo-200">
                                        <FiX size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Users List */}
                <div className="flex-1 overflow-y-auto p-2">
                    {loading ? (
                        <div className="flex justify-center items-center h-full">
                            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="flex justify-center items-center h-full text-sm text-gray-500 font-medium">
                            No users found.
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {users.map(u => {
                                const isSelected = selectedUsers.some(selected => selected.id === u.id);
                                return (
                                    <button
                                        key={u.id}
                                        onClick={() => toggleUserSelection(u)}
                                        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group text-left"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
                                                {u.avatar_url ? (
                                                    <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <FiUser size={16} className="text-gray-400" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold dark:text-white">{u.username}</span>
                                                <span className="text-[11px] text-gray-500 font-medium">{u.bio || 'Creator'}</span>
                                            </div>
                                        </div>

                                        {/* Checkbox */}
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300 dark:border-gray-600 group-hover:border-indigo-400'}`}>
                                            {isSelected && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 shrink-0">
                    {notification && (
                        <div className="mb-3 text-center text-sm font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 p-2 rounded-lg py-2 animate-bounce-short">
                            {notification}
                        </div>
                    )}
                    <button
                        onClick={handleSend}
                        disabled={selectedUsers.length === 0 || sending}
                        className="w-full py-3.5 rounded-xl bg-indigo-500 text-white font-black text-sm hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        {sending ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Sending...
                            </>
                        ) : (
                            <>
                                <FiSend size={16} />
                                Send to {selectedUsers.length > 0 ? selectedUsers.length + " " : ""}User(s)
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShareModal;
