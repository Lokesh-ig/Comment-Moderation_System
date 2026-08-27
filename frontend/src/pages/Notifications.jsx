import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../services/api';
import { FiHeart, FiUserPlus, FiMessageCircle, FiBell, FiCheckCircle, FiSend } from 'react-icons/fi';

const Notifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await getNotifications();
            setNotifications(res.data);
            // Auto-mark all as read when the page is opened
            if (res.data.some(n => !n.is_read)) {
                await markAllNotificationsRead();
                setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            }
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (id) => {
        try {
            await markNotificationRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (err) {
            console.error('Failed to mark notification as read:', err);
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'like': return <FiHeart className="text-red-500 fill-red-500" />;
            case 'follow': return <FiUserPlus className="text-indigo-500" />;
            case 'comment': return <FiMessageCircle className="text-emerald-500" />;
            case 'message': return <FiSend className="text-purple-500" />;
            default: return <FiBell className="text-gray-400" />;
        }
    };

    const getMessage = (notification) => {
        switch (notification.notification_type) {
            case 'like': return 'liked your post.';
            case 'follow': return 'started following you.';
            case 'comment': return 'commented on your post.';
            case 'message': return 'sent you a message.';
            default: return 'interacted with you.';
        }
    };

    return (
        <div className="w-full max-w-[600px] mx-auto min-h-screen py-8 px-4">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-black dark:text-white uppercase tracking-tighter flex items-center gap-3">
                    <FiBell className="text-indigo-500" />
                    Notifications
                </h1>
                {notifications.some(n => !n.is_read) && (
                    <span className="text-[10px] font-black bg-indigo-500 text-white px-2 py-1 rounded-full animate-pulse">
                        NEW EVENTS
                    </span>
                )}
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-40 gap-4">
                    <div className="w-10 h-10 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
                    <p className="text-[10px] text-gray-400 font-black tracking-widest uppercase">Fetching updates</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {notifications.length > 0 ? (
                        notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`group flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${notification.is_read
                                    ? 'bg-transparent border-transparent opacity-70'
                                    : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 shadow-xl shadow-indigo-500/5'
                                    }`}
                                onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
                            >
                                <div className="flex items-center gap-4">
                                    <Link to={`/profile/${notification.sender_username}`} className="relative shrink-0">
                                        <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600">
                                            <div className="w-full h-full rounded-full border-2 border-white dark:border-black overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                                {notification.sender_avatar_url ? (
                                                    <img src={notification.sender_avatar_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-xs font-bold text-gray-400">{notification.sender_username.charAt(0).toUpperCase()}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-900 p-1 rounded-full shadow-lg">
                                            {getIcon(notification.notification_type)}
                                        </div>
                                    </Link>

                                    <div className="flex flex-col">
                                        <p className="text-sm dark:text-gray-200 leading-tight">
                                            <Link to={`/profile/${notification.sender_username}`} className="font-black hover:underline mr-1 uppercase tracking-tight">
                                                {notification.sender_username}
                                            </Link>
                                            <span className="font-medium text-gray-500 dark:text-gray-400">{getMessage(notification)}</span>
                                        </p>
                                        <p className="text-[10px] text-gray-400 mt-0.5 font-bold uppercase tracking-widest">
                                            {new Date(notification.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    {notification.post_image && (
                                        <Link to={`/profile`} className="w-10 h-10 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800 shrink-0">
                                            <img src={notification.post_image} alt="" className="w-full h-full object-cover" />
                                        </Link>
                                    )}
                                    {!notification.is_read && (
                                        <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-lg shadow-indigo-500/50" />
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-32 bg-gray-50 dark:bg-gray-900/10 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
                            <FiBell size={48} className="mx-auto text-gray-200 dark:text-gray-800 mb-6" />
                            <h3 className="text-xl font-black dark:text-white uppercase tracking-widest">Quiet in here</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-bold mt-2">When someone interacts with you, it'll show up here.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Notifications;
