import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useTheme from '../hooks/useTheme';
import {
    FiHome, FiSearch, FiHeart,
    FiPlusSquare, FiUser, FiLogOut, FiShield,
    FiPlay, FiMessageCircle, FiMenu, FiCompass,
    FiMoon, FiSun, FiSettings, FiBookmark, FiUsers, FiX
} from 'react-icons/fi';
import { searchUsers, followUser, getUnreadCount, getConversations } from '../services/api';

const Sidebar = () => {
    const { user, logout, savedAccounts, switchAccount } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { isDark, toggleTheme } = useTheme();
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [isMoreOpen, setIsMoreOpen] = useState(false);
    const moreMenuRef = useRef(null);
    const moreButtonRef = useRef(null);
    const popupRef = useRef(null);

    // Close more menu on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            const clickedOutsideButton = moreMenuRef.current && !moreMenuRef.current.contains(e.target);
            const clickedOutsidePopup = popupRef.current && !popupRef.current.contains(e.target);

            // If the popup is open out of the normal DOM flow, we need to check both
            if (clickedOutsideButton && clickedOutsidePopup) {
                setIsMoreOpen(false);
            }
        };
        if (isMoreOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMoreOpen]);

    // Close more menu on route change
    useEffect(() => {
        setIsMoreOpen(false);
    }, [location.pathname]);

    // Clear badges instantly when visiting those pages
    useEffect(() => {
        if (location.pathname === '/notifications') {
            setUnreadCount(0);
        }
        if (location.pathname === '/messages') {
            setUnreadMessages(0);
        }
    }, [location.pathname]);

    useEffect(() => {
        const fetchCount = async () => {
            if (!user) return;
            // Don't fetch if already on the page (badge is cleared)
            if (location.pathname === '/notifications') return;
            try {
                const res = await getUnreadCount();
                setUnreadCount(res.data.unread_count);
            } catch (err) {
                console.error('Failed to fetch unread count:', err);
            }
        };
        fetchCount();
        const fetchMsgCount = async () => {
            if (!user) return;
            if (location.pathname === '/messages') return;
            try {
                const res = await getConversations();
                const total = res.data.reduce((sum, c) => sum + (c.unread_count || 0), 0);
                setUnreadMessages(total);
            } catch (err) {
                console.error('Failed to fetch unread messages:', err);
            }
        };
        fetchMsgCount();
        let interval;
        if (user) {
            interval = setInterval(() => { fetchCount(); fetchMsgCount(); }, 60000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [user, location.pathname]);

    const menuItems = [
        { icon: FiHome, label: 'Home', path: '/' },
        { icon: FiMessageCircle, label: 'Messages', path: '/messages', unreadCount: unreadMessages },
        {
            icon: FiSearch,
            label: 'Search',
            path: '#',
            onClick: (e) => {
                e.preventDefault();
                setIsSearchOpen(!isSearchOpen);
            }
        },
        { icon: FiHeart, label: 'Notifications', path: '/notifications', unreadCount: unreadCount },
        {
            icon: FiPlusSquare,
            label: 'Create',
            path: '#',
            onClick: (e) => {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('toggle-create-post'));
            }
        },
        {
            icon: FiUser,
            label: 'Profile',
            path: `/profile/${user?.username || 'me'}`,
            isProfile: true
        },
    ];

    const handleSearch = async (query) => {
        setSearchQuery(query);
        setIsSearching(true);
        try {
            const res = await searchUsers(query);
            setSearchResults(res.data);
        } catch (err) {
            console.error('Search failed:', err);
        } finally {
            setIsSearching(false);
        }
    };

    useEffect(() => {
        if (isSearchOpen) {
            handleSearch('');
        }
    }, [isSearchOpen]);

    const handleFollow = async (username) => {
        try {
            await followUser(username);
            const res = await searchUsers(searchQuery);
            setSearchResults(res.data);
        } catch (err) {
            console.error('Follow failed:', err);
        }
    };

    const isActive = (path) => location.pathname === path;

    const handleSettingsClick = () => {
        setIsMoreOpen(false);
        navigate(`/profile/${user?.username || 'me'}`);
        setTimeout(() => window.dispatchEvent(new CustomEvent('open-settings')), 300);
    };

    const handleSavedClick = () => {
        setIsMoreOpen(false);
        navigate(`/profile/${user?.username || 'me'}?tab=saved`);
    };

    const handleSwitchAccount = async (account) => {
        setIsMoreOpen(false);
        const success = await switchAccount(account);
        if (success) {
            navigate('/');
        } else {
            navigate('/login', { state: { username: account.username, message: `Session for ${account.username} expired. Please sign in again.` } });
        }
    };

    const otherAccounts = savedAccounts.filter(a => a.username !== user?.username);

    return (
        <>
            <aside className={`hidden md:flex fixed left-0 top-0 h-screen transition-all duration-300 z-[60] border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-3 md:p-4 flex-col justify-between group overflow-hidden ${isSearchOpen ? 'w-16' : 'w-16 hover:w-64 md:hover:w-64'}`}>
                <div className="flex flex-col h-full">
                    {/* Logo Section */}
                    <Link to="/" style={{ marginBottom: '32px' }} className="flex items-center gap-3 px-3 py-4 hover:opacity-80 transition-opacity">
                        <div className="w-10 h-10 rounded-[30%] bg-gradient-to-br from-[#6366f1] via-[#a855f7] to-[#ec4899] flex items-center justify-center shadow-xl shadow-indigo-500/25 transform rotate-3 transition-transform hover:rotate-0 shrink-0 relative group">
                            <svg className="w-9.5 h-9.5 relative z-10 transform rotate-[15deg]" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <defs>
                                    <linearGradient id="sidebarInGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#4c1d95" />
                                        <stop offset="100%" stopColor="#be123c" />
                                    </linearGradient>
                                </defs>
                                <path d="M50 20 C33.43 20 20 33.43 20 50 C20 66.57 33.43 80 50 80 C54.55 80 58.85 78.98 62.69 77.16 L81 81 L75.16 67.69 C78.25 62.77 80 57.14 80 50 C80 33.43 66.57 20 50 20 Z" fill="url(#sidebarInGrad)" />
                                <path d="M52 35 L38 55 H48 L46 75 L62 50 H52 L54 35 Z" fill="#fef08a" />
                            </svg>
                        </div>
                        <span className={`text-2xl font-black tracking-tighter bg-gradient-to-r from-indigo-400 via-purple-500 to-pink-500 bg-clip-text text-transparent transition-all duration-300 ${isSearchOpen ? 'opacity-0 w-0' : 'opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto overflow-hidden'}`}>
                            ModChat
                        </span>
                    </Link>

                    {/* Main Navigation */}
                    <nav className="flex-1 flex flex-col">
                        {menuItems.map((item, i) => (
                            <Link
                                key={i}
                                to={item.path}
                                onClick={item.onClick}
                                className={`flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-200 group relative ${isActive(item.path) && !isSearchOpen
                                    ? 'bg-gray-100 dark:bg-gray-900 text-black dark:text-white font-bold'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900/50'
                                    } ${(isSearchOpen && item.label === 'Search') ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
                                style={{ marginBottom: '20px' }}
                            >
                                <div className="relative shrink-0 flex items-center justify-center w-7 h-7">
                                    {item.isProfile ? (
                                        <div className={`w-6 h-6 rounded-full overflow-hidden border ${isActive(item.path) ? 'border-black dark:border-white' : 'border-transparent'}`}>
                                            {user?.avatar_url ? (
                                                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <FiUser size={20} />
                                            )}
                                        </div>
                                    ) : (
                                        <item.icon
                                            size={24}
                                            className={`transition-transform duration-300 ${isActive(item.path) && !isSearchOpen ? 'stroke-[2.5px]' : 'group-hover:scale-105'
                                                }`}
                                        />
                                    )}
                                    {item.unreadCount > 0 && (
                                        <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full border-2 border-white dark:border-black flex items-center justify-center px-1 animate-bounce shadow-lg shadow-red-500/20">
                                            <span className="text-[9px] text-white font-black">
                                                {item.unreadCount > 9 ? '9+' : item.unreadCount}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <span className={`text-[16px] transition-all duration-200 ${isSearchOpen ? 'opacity-0 w-0' : 'opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto h-auto overflow-hidden whitespace-nowrap'}`}>
                                    {item.label}
                                </span>
                            </Link>
                        ))}

                    </nav>

                    {/* Bottom Actions */}
                    <div className="pt-4 mt-auto border-t border-gray-100 dark:border-gray-900 space-y-1" ref={moreMenuRef}>
                        <button
                            ref={moreButtonRef}
                            onClick={() => setIsMoreOpen(!isMoreOpen)}
                            className={`w-full flex items-center gap-4 px-3 py-3.5 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 transition-all group ${isMoreOpen ? 'bg-gray-100 dark:bg-gray-900' : ''}`}
                        >
                            {isMoreOpen ? (
                                <FiX size={24} className="shrink-0 transition-transform duration-500" />
                            ) : (
                                <FiMenu size={24} className="shrink-0 group-hover:rotate-90 transition-transform duration-500" />
                            )}
                            <span className={`font-bold text-[15px] transition-all duration-300 ${isSearchOpen ? 'opacity-0 w-0' : 'opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto overflow-hidden whitespace-nowrap'}`}>More</span>
                        </button>
                        {user && (
                            <button
                                onClick={logout}
                                className="w-full flex items-center gap-4 px-3 py-3.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all group"
                            >
                                <FiLogOut size={24} className="shrink-0 group-hover:-translate-x-1 transition-transform" />
                                <span className={`font-bold text-[15px] transition-all duration-300 ${isSearchOpen ? 'opacity-0 w-0' : 'opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto overflow-hidden whitespace-nowrap'}`}>Logout</span>
                            </button>
                        )}
                    </div>
                </div>
            </aside>

            {/* Mobile Bottom Navigation Bar (Instagram-style) */}
            <nav className="flex md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-black/95 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 z-[60] flex-row items-center justify-around px-2 shadow-2xl">
                {menuItems.map((item, i) => (
                    <Link
                        key={i}
                        to={item.path}
                        onClick={item.onClick}
                        className={`flex items-center justify-center p-2 rounded-xl transition-all duration-200 relative ${isActive(item.path) && !isSearchOpen
                            ? 'text-indigo-600 dark:text-indigo-400 font-bold scale-110'
                            : 'text-gray-700 dark:text-gray-300 hover:text-indigo-500'
                            }`}
                    >
                        <div className="relative flex items-center justify-center w-7 h-7">
                            {item.isProfile ? (
                                <div className={`w-7 h-7 rounded-full overflow-hidden border-2 ${isActive(item.path) ? 'border-indigo-500' : 'border-gray-300 dark:border-gray-700'}`}>
                                    {user?.avatar_url ? (
                                        <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <FiUser size={18} />
                                    )}
                                </div>
                            ) : (
                                <item.icon
                                    size={24}
                                    className={`transition-transform duration-200 ${isActive(item.path) && !isSearchOpen ? 'stroke-[2.5px]' : ''}`}
                                />
                            )}
                            {item.unreadCount > 0 && (
                                <div className="absolute -top-1 -right-1.5 min-w-[16px] h-[16px] bg-red-500 rounded-full border-2 border-white dark:border-black flex items-center justify-center px-1">
                                    <span className="text-[8px] text-white font-black">
                                        {item.unreadCount > 9 ? '9+' : item.unreadCount}
                                    </span>
                                </div>
                            )}
                        </div>
                    </Link>
                ))}

                {/* Mobile More Menu Toggle Button */}
                <button
                    onClick={() => setIsMoreOpen(!isMoreOpen)}
                    className={`flex items-center justify-center p-2 rounded-xl text-gray-700 dark:text-gray-300 transition-all ${isMoreOpen ? 'text-indigo-500 scale-110' : ''}`}
                >
                    {isMoreOpen ? <FiX size={24} /> : <FiMenu size={24} />}
                </button>
            </nav>

            {/* More Menu Popup — Fixed position so it's not clipped by sidebar overflow */}
            {isMoreOpen && (
                <div
                    ref={popupRef}
                    className="fixed z-[65] bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden w-[260px] p-2 flex flex-col gap-1.5"
                    style={{
                        bottom: moreButtonRef.current ? (window.innerHeight - moreButtonRef.current.getBoundingClientRect().top + 8) + 'px' : '120px',
                        left: '12px',
                        animation: 'slideUp 0.2s ease-out'
                    }}
                >
                    {/* Switch Appearance */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleTheme();
                        }}
                        className="w-full flex items-center justify-between px-3 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            {isDark ? <FiMoon size={20} className="text-indigo-400" /> : <FiSun size={20} className="text-amber-500" />}
                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Switch Appearance</span>
                        </div>
                        {/* Toggle Switch */}
                        <div className={`relative w-10 h-5 rounded-full transition-all duration-300 ${isDark ? 'bg-indigo-500' : 'bg-gray-300'}`}>
                            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300 ${isDark ? 'left-[22px]' : 'left-0.5'}`} />
                        </div>
                    </button>

                    <div className="h-px bg-gray-100 dark:bg-gray-800 mx-2" />

                    {/* Settings */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleSettingsClick();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-all"
                    >
                        <FiSettings size={20} className="text-gray-600 dark:text-gray-400" />
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Settings</span>
                    </button>

                    <div className="h-px bg-gray-100 dark:bg-gray-800 mx-2" />

                    {/* Saved */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleSavedClick();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-all"
                    >
                        <FiBookmark size={20} className="text-gray-600 dark:text-gray-400" />
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Saved</span>
                    </button>

                    <div className="h-px bg-gray-100 dark:bg-gray-800 mx-2" />

                    {/* Switch Account Section */}
                    <div className="pt-2 pb-1 px-1 flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 mb-1 px-2">
                            <FiUsers size={16} className="text-gray-400" />
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Switch Account</span>
                        </div>

                        {/* Current Account */}
                        {user && (
                            <div className="flex items-center gap-3 p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 mb-0.5">
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0 border-2 border-indigo-500">
                                    {user.avatar_url ? (
                                        <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs font-bold">
                                            {user.username?.charAt(0)?.toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{user.username}</p>
                                    <p className="text-[10px] text-indigo-500 font-bold">Active</p>
                                </div>
                                <div className="w-2 h-2 rounded-full bg-green-500 shrink-0 animate-pulse" />
                            </div>
                        )}

                        {/* Other Saved Accounts */}
                        {otherAccounts.length > 0 && (
                            <div className="space-y-1.5 mt-0.5">
                                {otherAccounts.map((account) => (
                                    <button
                                        key={account.username}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSwitchAccount(account);
                                        }}
                                        className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all group"
                                    >
                                        <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0 border border-gray-300 dark:border-gray-600 group-hover:border-indigo-500 transition-colors">
                                            {account.avatar_url ? (
                                                <img src={account.avatar_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs font-bold">
                                                    {account.username?.charAt(0)?.toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{account.username}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Log into existing account */}
                        <Link
                            to="/login"
                            onClick={() => setIsMoreOpen(false)}
                            className="flex items-center gap-3 p-2 mt-0.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all text-indigo-500 hover:text-indigo-600"
                        >
                            <div className="w-8 h-8 rounded-full border-2 border-dashed border-indigo-400 flex items-center justify-center shrink-0">
                                <span className="text-lg leading-none">+</span>
                            </div>
                            <span className="text-xs font-bold">Log into existing account</span>
                        </Link>
                    </div>
                </div>
            )}

            {/* Search Drawer Overlay */}
            <div className={`fixed top-0 bottom-16 md:bottom-0 left-0 right-0 md:right-auto bg-white dark:bg-black border-r border-gray-100 dark:border-gray-900 transition-all duration-300 z-[70] md:z-[55] shadow-2xl ${isSearchOpen ? 'translate-y-0 md:translate-y-0 md:translate-x-16 w-full md:w-[350px] opacity-100' : 'translate-y-full md:translate-y-0 md:-translate-x-full w-full md:w-0 opacity-0 pointer-events-none'}`}>
                <div className="p-4 md:p-6 h-full flex flex-col">
                    <div className="flex items-center justify-between mb-4 md:mb-6">
                        <h2 className="text-2xl font-black dark:text-white">Search</h2>
                        <button
                            onClick={() => setIsSearchOpen(false)}
                            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <FiX size={22} />
                        </button>
                    </div>
                    <div className="relative mb-6">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                            <FiSearch
                                size={18}
                                className={`${searchQuery ? 'text-indigo-500' : 'text-gray-400'} transition-colors`}
                            />
                        </div>
                        <input
                            type="text"
                            placeholder="Creators"
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="w-full bg-gray-100 dark:bg-gray-900 border-none rounded-2xl py-4 pr-4 text-sm focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 shadow-inner"
                            style={{ paddingLeft: '38px' }}
                            autoFocus
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar">
                        {isSearching ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                <p className="text-xs text-gray-400 font-bold tracking-widest uppercase">Searching...</p>
                            </div>
                        ) : searchResults.length > 0 ? (
                            <div className="space-y-1">
                                {searchResults.map((u) => (
                                    <div key={u.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-900/50 rounded-xl transition-all group">
                                        <Link to={`/profile/${u.username}`} className="flex items-center gap-3 flex-1 min-w-0" onClick={() => setIsSearchOpen(false)}>
                                            <div className="w-12 h-12 rounded-full border-2 border-indigo-500/20 p-0.5 shrink-0 group-hover:border-indigo-500/50 transition-colors">
                                                {u.avatar_url ? (
                                                    <img src={u.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                                        <FiUser size={20} className="text-gray-400" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-sm font-bold dark:text-white truncate">{u.username}</span>
                                                    <span className="text-[10px] font-mono font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800/50">ID: #{u.user_id || u.id}</span>
                                                </div>
                                                <span className="text-[11px] text-gray-400 truncate font-bold uppercase tracking-tighter">{u.bio || 'ModChat Account'}</span>
                                            </div>
                                        </Link>
                                        {u.username !== user?.username && (
                                            <button
                                                onClick={() => handleFollow(u.username)}
                                                className={`ml-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 ${u.is_following
                                                    ? 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                                    : 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-indigo-500/20'}`}
                                            >
                                                {u.is_following ? 'Following' : 'Follow'}
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : searchQuery.length > 0 ? (
                            <div className="text-center py-20 px-6">
                                <div className="w-16 h-16 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FiSearch size={24} className="text-gray-300" />
                                </div>
                                <p className="text-sm text-gray-400 font-medium">No results found for "{searchQuery}"</p>
                            </div>
                        ) : (
                            <div className="py-20 text-center">
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Recent Searches</p>
                                <p className="text-[11px] text-gray-500 mt-2">No recent searches</p>
                            </div>
                        )}
                    </div>
                </div>
            </div >

            {/* Backdrop */}
            {
                isSearchOpen && (
                    <div
                        className="fixed inset-0 bg-black/5 z-[50]"
                        onClick={() => setIsSearchOpen(false)}
                    />
                )
            }

            {/* More menu backdrop */}
            {isMoreOpen && (
                <div
                    className="fixed inset-0 z-[58]"
                    onClick={() => setIsMoreOpen(false)}
                />
            )}

            {/* Slide-up animation */}
            <style>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </>
    );
};

export default Sidebar;
