import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPosts, searchUsers } from '../services/api';
import PostCard from '../components/PostCard';
import CreatePost from '../components/CreatePost';
import StoryBar from '../components/StoryBar';
import { FiSearch, FiPlusSquare, FiUser, FiBell } from 'react-icons/fi';

const Home = () => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        fetchPosts();

        const handleToggleSearch = () => document.querySelector('input[placeholder="Search"]')?.focus();

        window.addEventListener('toggle-search', handleToggleSearch);
        window.addEventListener('refresh-posts', fetchPosts);

        return () => {
            window.removeEventListener('toggle-search', handleToggleSearch);
            window.removeEventListener('refresh-posts', fetchPosts);
        };
    }, []);

    // Search Logic with Debounce
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchQuery.length >= 1) {
                setIsSearching(true);
                try {
                    const res = await searchUsers(searchQuery);
                    setSearchResults(res.data);
                } catch (err) {
                    console.error('Search failed:', err);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const fetchPosts = async () => {
        try {
            const res = await getPosts();
            setPosts(res.data);
        } catch (err) {
            console.error('Failed to fetch posts:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-[600px] mx-auto min-h-screen pb-20 px-0 sm:px-4">
            {/* Minimal Header for Mobile & Notifications */}
            <header className="sticky top-0 bg-white/95 dark:bg-black/95 backdrop-blur-xl z-[40] px-4 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-900 transition-all duration-300 sm:hidden">
                <Link to="/" className="w-9 h-9 rounded-[30%] bg-gradient-to-br from-[#6366f1] via-[#a855f7] to-[#ec4899] flex items-center justify-center shadow-lg relative">
                    <svg className="w-8.5 h-8.5 transform rotate-[15deg]" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <linearGradient id="homeInGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#4c1d95" />
                                <stop offset="100%" stopColor="#be123c" />
                            </linearGradient>
                        </defs>
                        <path d="M50 20 C33.43 20 20 33.43 20 50 C20 66.57 33.43 80 50 80 C54.55 80 58.85 78.98 62.69 77.16 L81 81 L75.16 67.69 C78.25 62.77 80 57.14 80 50 C80 33.43 66.57 20 50 20 Z" fill="url(#homeInGrad)" />
                        <path d="M52 35 L38 55 H48 L46 75 L62 50 H52 L54 35 Z" fill="#fef08a" />
                    </svg>
                </Link>
                <div className="flex items-center gap-2">
                    <button className="p-2 text-gray-600 dark:text-gray-400 hover:text-indigo-400 transition-colors">
                        <FiBell size={22} className="stroke-[2.5px]" />
                    </button>
                    <Link to={`/profile`} className="w-8 h-8 rounded-full border-2 border-indigo-500/30 p-[2px]">
                        <div className="w-full h-full rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                            <FiUser size={14} className="text-gray-400" />
                        </div>
                    </Link>
                </div>
            </header>

            {/* Stories Section */}
            <div className="mt-4 sm:mt-8 bg-white dark:bg-black/50 border-b border-gray-50 dark:border-gray-900/50 py-6 px-2 mb-8 -mx-4 sm:mx-0 sm:rounded-3xl shadow-sm ring-1 ring-black/5">
                <StoryBar />
            </div>

            {/* Content Feed */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-40 gap-6">
                    <div className="relative">
                        <div className="w-12 h-12 border-4 border-indigo-500/10 rounded-full" />
                        <div className="absolute top-0 w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                    <p className="text-xs text-gray-400 font-black uppercase tracking-[0.2em] animate-pulse">Syncing Feed</p>
                </div>
            ) : (
                <div className="space-y-8 md:space-y-12 px-0">
                    {posts.length > 0 ? (
                        posts.map((post) => (
                            <PostCard key={post.id} post={post} onLike={fetchPosts} onDelete={(id) => setPosts(prev => prev.filter(p => p.id !== id))} />
                        ))
                    ) : (
                        <div className="text-center py-32 px-6 bg-white dark:bg-gray-900/10 rounded-3xl border border-gray-100/50 dark:border-gray-900/50 mx-4 shadow-xl shadow-indigo-500/5">
                            <div className="w-24 h-24 bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner ring-4 ring-indigo-500/5">
                                <FiUser size={48} className="text-indigo-500/40" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3">Begin Your Journey</h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto mb-8 leading-relaxed font-medium">
                                Discovery is just a search away. Follow creators to fill your world with inspiration.
                            </p>
                            <button
                                onClick={() => document.querySelector('input')?.focus()}
                                className="px-8 py-3 bg-indigo-500 text-white rounded-2xl font-bold hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/30 active:scale-95"
                            >
                                Discover People
                            </button>
                        </div>
                    )}
                </div>
            )}

        </div>
    );
};

export default Home;
