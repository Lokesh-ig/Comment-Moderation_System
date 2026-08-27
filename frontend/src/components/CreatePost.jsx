import { useState, useRef, useEffect } from 'react';
import { createPost, getConversations } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FiImage, FiMapPin, FiX, FiUserPlus, FiCheck, FiMusic, FiSearch } from 'react-icons/fi';
import MusicSearchMenu from './MusicSearchMenu';
import AudioTrimmer from './AudioTrimmer';

const notify = (message, type = 'success') => {
    window.dispatchEvent(new CustomEvent('modchat-notify', { detail: { message, type } }));
};

const CreatePost = ({ onPostCreated, onClose }) => {
    useEffect(() => {
        console.log("CreatePost component mounted");
    }, []);

    const { user } = useAuth();
    const [caption, setCaption] = useState('');
    const [location, setLocation] = useState('');
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showTagPanel, setShowTagPanel] = useState(false);
    const [tagSearch, setTagSearch] = useState('');
    const [taggedUsers, setTaggedUsers] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [music, setMusic] = useState(null);
    const [showMusicSearch, setShowMusicSearch] = useState(false);
    const [showTrimmer, setShowTrimmer] = useState(false);
    const [trimStartTime, setTrimStartTime] = useState(0);
    const [musicDuration, setMusicDuration] = useState(15);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (showTagPanel) {
            fetchContacts();
        }
    }, [showTagPanel]);

    const fetchContacts = async () => {
        try {
            const res = await getConversations();
            setContacts(res.data);
        } catch (err) { console.error('Failed to fetch contacts:', err); }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const toggleTag = (username) => {
        setTaggedUsers(prev =>
            prev.includes(username)
                ? prev.filter(u => u !== username)
                : [...prev, username]
        );
    };

    const handleTrackSelect = (track) => {
        setMusic({
            title: track.trackName,
            artist: track.artistName,
            url: track.previewUrl,
            coverart: track.artworkUrl100,
            rawTrack: track
        });
        setShowMusicSearch(false);
        setShowTrimmer(true);
    };

    const handleTrimConfirm = (time, duration) => {
        setTrimStartTime(time);
        setMusicDuration(duration);
        setShowTrimmer(false);
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!image) return;

        setLoading(true);
        const formData = new FormData();
        formData.append('image', image);
        formData.append('caption', caption);
        formData.append('location', location || 'Everywhere');
        if (taggedUsers.length > 0) {
            formData.append('tagged_users', JSON.stringify(taggedUsers));
        }

        if (music) {
            formData.append('music_title', music.title);
            formData.append('music_artist', music.artist);
            formData.append('music_url', music.url);
            formData.append('music_coverart', music.coverart);
            formData.append('music_start_time', trimStartTime);
            formData.append('music_duration', musicDuration);
        }

        try {
            await createPost(formData);
            setCaption('');
            setLocation('');
            setImage(null);
            setPreview(null);
            setTaggedUsers([]);
            setMusic(null);
            setShowMusicSearch(false);
            if (onPostCreated) onPostCreated();
            if (onClose) onClose();
            notify('Post shared!');
        } catch (error) {
            console.error('Failed to create post:', error);
            notify('Failed to share post. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const filteredContacts = contacts.filter(c =>
        c.username !== user?.username &&
        c.username.toLowerCase().includes(tagSearch.toLowerCase())
    );

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden transition-all max-w-[500px] w-full mx-auto">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 to-purple-600 p-0.5">
                        <div className="w-full h-full rounded-full bg-white dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                                {user?.username ? user.username[0].toUpperCase() : '?'}
                            </span>
                        </div>
                    </div>
                    <h3 className="font-semibold text-gray-800 dark:text-gray-100">Create New Post</h3>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 transition-colors"
                    >
                        <FiX size={20} />
                    </button>
                )}
            </div>

            <form onSubmit={handleSubmit} className="p-4">
                <textarea
                    placeholder="Write a caption..."
                    className="w-full bg-transparent border-none focus:ring-0 text-gray-700 dark:text-gray-200 resize-none min-h-[80px] focus:outline-none"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                />

                {preview && (
                    <div className="relative mt-4 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                        <img src={preview} alt="Preview" className="w-full h-auto max-h-[400px] object-contain bg-gray-50 dark:bg-gray-900" />
                        <button
                            type="button"
                            onClick={() => { setImage(null); setPreview(null); }}
                            className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full hover:bg-black/70 transition-colors"
                        >
                            <FiX size={18} />
                        </button>
                    </div>
                )}

                {/* Tagged Users Display */}
                {taggedUsers.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {taggedUsers.map(username => (
                            <span key={username} className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-bold">
                                @{username}
                                <button type="button" onClick={() => toggleTag(username)} className="ml-0.5 hover:text-red-500 transition-colors">
                                    <FiX size={12} />
                                </button>
                            </span>
                        ))}
                    </div>
                )}

                {/* Tag People Panel */}
                {showTagPanel && (
                    <div className="mt-3 border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden">
                        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                            <input
                                type="text"
                                placeholder="Search people to tag..."
                                value={tagSearch}
                                onChange={(e) => setTagSearch(e.target.value)}
                                className="w-full bg-transparent text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none"
                                autoFocus
                            />
                        </div>
                        <div className="max-h-[200px] overflow-y-auto">
                            {filteredContacts.length > 0 ? filteredContacts.map(contact => {
                                const isTagged = taggedUsers.includes(contact.username);
                                return (
                                    <button
                                        key={contact.id}
                                        type="button"
                                        onClick={() => toggleTag(contact.username)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${isTagged ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden shrink-0">
                                            {contact.avatar_url
                                                ? <img src={contact.avatar_url} alt="" className="w-full h-full object-cover" />
                                                : <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-bold">{contact.username[0].toUpperCase()}</div>
                                            }
                                        </div>
                                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex-1">{contact.username}</span>
                                        {isTagged && (
                                            <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center shrink-0">
                                                <FiCheck size={12} className="text-white" />
                                            </div>
                                        )}
                                    </button>
                                );
                            }) : (
                                <p className="text-center py-6 text-sm text-gray-400">No contacts found</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Selected Music Display */}
                {music && !showMusicSearch && (
                    <div className="mt-4 flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl border border-indigo-100 dark:border-indigo-500/20 animate-fade-in">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <img src={music.coverart} alt="" className="w-10 h-10 rounded-lg object-cover shadow-sm shrink-0" />
                            <div className="min-w-0">
                                <p className="text-xs font-black dark:text-white leading-tight truncate uppercase tracking-tighter">{music.title}</p>
                                <p className="text-[10px] font-bold text-indigo-500 truncate">{music.artist} • {musicDuration}s clip</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            <button
                                type="button"
                                onClick={() => setShowTrimmer(true)}
                                className="px-3 py-1 text-[10px] font-black text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-lg transition-colors uppercase tracking-widest"
                            >
                                Trim
                            </button>
                            <button type="button" onClick={() => setMusic(null)} className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/10 rounded-full transition-colors">
                                <FiX size={16} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Overlays */}
                {showMusicSearch && (
                    <div className="relative h-[300px] mt-4 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl">
                        <MusicSearchMenu
                            onSelect={handleTrackSelect}
                            onClose={() => setShowMusicSearch(false)}
                        />
                    </div>
                )}

                {showTrimmer && music?.rawTrack && (
                    <div className="relative h-[480px] min-h-[460px] mt-4 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl">
                        <AudioTrimmer
                            track={music.rawTrack}
                            initialStartTime={trimStartTime}
                            initialDuration={musicDuration}
                            onConfirm={handleTrimConfirm}
                            onCancel={() => setShowTrimmer(false)}
                        />
                    </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current.click()}
                            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors font-medium text-sm"
                        >
                            <FiImage size={20} className="text-purple-500" />
                            Photo
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowTagPanel(!showTagPanel)}
                            className={`flex items-center gap-2 transition-colors font-medium text-sm ${showTagPanel || taggedUsers.length > 0 ? 'text-indigo-500' : 'text-gray-600 dark:text-gray-400 hover:text-indigo-500'}`}
                        >
                            <FiUserPlus size={20} className={showTagPanel || taggedUsers.length > 0 ? 'text-indigo-500' : 'text-blue-500'} />
                            Tags
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowMusicSearch(!showMusicSearch)}
                            className={`flex items-center gap-2 transition-colors font-medium text-sm ${music ? 'text-purple-500' : 'text-gray-600 dark:text-gray-400 hover:text-purple-500'}`}
                        >
                            <FiMusic size={20} className={music ? 'text-purple-500' : 'text-pink-500'} />
                            Music
                        </button>
                        <div className="flex items-center gap-1">
                            <FiMapPin size={18} className="text-red-500" />
                            <input
                                type="text"
                                placeholder="Add location"
                                className="bg-transparent border-none focus:ring-0 focus:outline-none text-xs text-gray-500 dark:text-gray-400 w-24"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                            />
                        </div>
                    </div>

                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleImageChange}
                    />

                    <button
                        type="submit"
                        disabled={!image || loading}
                        className={`px-6 py-2 rounded-full font-bold text-sm transition-all shadow-md ${!image || loading
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90 active:scale-95'
                            }`}
                    >
                        {loading ? 'Sharing...' : 'Share'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreatePost;
