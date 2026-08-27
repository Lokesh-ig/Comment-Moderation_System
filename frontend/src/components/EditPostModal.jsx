import { useState, useRef, useEffect } from 'react';
import { updatePost } from '../services/api';
import { FiX, FiMusic, FiMapPin, FiSearch } from 'react-icons/fi';
import MusicSearchMenu from './MusicSearchMenu';
import AudioTrimmer from './AudioTrimmer';

const EditPostModal = ({ post, onClose, onUpdate }) => {
    const [caption, setCaption] = useState(post.caption || '');
    const [location, setLocation] = useState(post.location || '');
    const [loading, setLoading] = useState(false);

    const [music, setMusic] = useState(post.music_title ? {
        title: post.music_title,
        artist: post.music_artist,
        url: post.music_url,
        coverart: post.music_coverart,
        // We'll need the track data if they want to re-trim. 
        // For existing music, we might not have the full 'track' object from iTunes,
        // but we can mock enough of it for the Trimmer to work if they just want to adjust.
        rawTrack: {
            trackName: post.music_title,
            artistName: post.music_artist,
            previewUrl: post.music_url,
            artworkUrl100: post.music_coverart
        }
    } : null);
    const [showMusicSearch, setShowMusicSearch] = useState(false);
    const [showTrimmer, setShowTrimmer] = useState(false);
    const [trimStartTime, setTrimStartTime] = useState(post.music_start_time || 0);
    const [musicDuration, setMusicDuration] = useState(post.music_duration || 15);

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
        setLoading(true);
        try {
            const data = {
                caption,
                location,
                music_title: music?.title || null,
                music_artist: music?.artist || null,
                music_url: music?.url || null,
                music_coverart: music?.coverart || null,
                music_start_time: trimStartTime,
                music_duration: musicDuration
            };
            await updatePost(post.id, data);
            onUpdate(data);
            onClose();
        } catch (err) {
            console.error('Update failed:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-[500px] bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
                    <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-tighter">Edit Post</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <FiX size={20} className="text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto no-scrollbar">
                    {/* Caption */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Caption</label>
                        <textarea
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            placeholder="Write something..."
                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 text-sm focus:ring-2 ring-indigo-500/20 outline-none resize-none min-h-[100px] dark:text-white"
                        />
                    </div>

                    {/* Location */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Location</label>
                        <div className="relative">
                            <FiMapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="Add location"
                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl py-3 pl-11 pr-4 text-sm focus:ring-2 ring-indigo-500/20 outline-none dark:text-white"
                            />
                        </div>
                    </div>

                    {/* Music Section */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 flex justify-between">
                            Music
                            {music && !showMusicSearch && (
                                <button type="button" onClick={() => setShowMusicSearch(true)} className="text-indigo-500 hover:underline">Change</button>
                            )}
                        </label>

                        {!music && !showMusicSearch ? (
                            <button
                                type="button"
                                onClick={() => setShowMusicSearch(true)}
                                className="w-full border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl py-6 flex flex-col items-center gap-2 hover:border-indigo-500 group transition-all"
                            >
                                <FiMusic size={24} className="text-gray-300 group-hover:text-indigo-500 animate-bounce" />
                                <span className="text-xs font-bold text-gray-400 group-hover:text-indigo-500">Attach Music</span>
                            </button>
                        ) : music && !showMusicSearch ? (
                            <div className="flex items-center justify-between p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl border border-indigo-100 dark:border-indigo-500/20">
                                <div className="flex items-center gap-4 overflow-hidden">
                                    <img src={music.coverart} alt="" className="w-12 h-12 rounded-xl object-cover shadow-lg shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-sm font-black dark:text-white leading-tight truncate uppercase tracking-tighter">{music.title}</p>
                                        <p className="text-[10px] font-bold text-indigo-500 truncate">{music.artist} • {musicDuration}s clip</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setShowTrimmer(true)}
                                        className="px-3 py-1.5 text-xs font-black text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-lg transition-colors uppercase tracking-widest"
                                    >
                                        Trim
                                    </button>
                                    <button type="button" onClick={() => setMusic(null)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/5 rounded-full transition-colors">
                                        <FiX size={18} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {showMusicSearch && (
                                    <div className="relative h-[250px] border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-inner">
                                        <MusicSearchMenu
                                            onSelect={handleTrackSelect}
                                            onClose={() => setShowMusicSearch(false)}
                                        />
                                    </div>
                                )}
                                {showTrimmer && music?.rawTrack && (
                                    <div className="relative h-[300px] border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-inner">
                                        <AudioTrimmer
                                            track={music.rawTrack}
                                            initialStartTime={trimStartTime}
                                            initialDuration={musicDuration}
                                            onConfirm={handleTrimConfirm}
                                            onCancel={() => setShowTrimmer(false)}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-indigo-500 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-500/20 hover:bg-indigo-600 disabled:opacity-50 transition-all hover:-translate-y-1 active:translate-y-0"
                        >
                            {loading ? 'Saving Changes...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditPostModal;
