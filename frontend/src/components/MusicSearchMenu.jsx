import React, { useState } from 'react';
import { FiChevronLeft, FiPlus, FiSearch } from 'react-icons/fi';

const MusicSearchMenu = ({ onSelect, onClose }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    const searchMusic = async (e) => {
        const val = e.target.value;
        setQuery(val);
        if (val.length < 2) {
            setResults([]);
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(val)}&entity=song&limit=10`);
            const data = await res.json();
            setResults(data.results || []);
        } catch (err) {
            console.error('Music search failed:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="absolute inset-0 z-[260] bg-white dark:bg-gray-900 animate-slide-up flex flex-col">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500">
                    <FiChevronLeft size={24} />
                </button>
                <div className="flex-1 relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        autoFocus
                        value={query}
                        onChange={searchMusic}
                        placeholder="Search songs, artists..."
                        className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                    />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {loading && (
                    <div className="flex justify-center p-8">
                        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                )}
                {!loading && query.length >= 2 && results.length === 0 && (
                    <div className="text-center p-8 text-gray-500 text-sm">No songs found for "{query}"</div>
                )}
                {results.map(track => (
                    <div
                        key={track.trackId}
                        onClick={() => onSelect(track)}
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors group"
                    >
                        <img src={track.artworkUrl100} className="w-12 h-12 rounded-lg object-cover shadow-sm" alt="" />
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm dark:text-white truncate">{track.trackName}</p>
                            <p className="text-xs text-gray-500 truncate">
                                {track.artistName} • {Math.floor(track.trackTimeMillis / 60000)}:{(Math.floor(track.trackTimeMillis / 1000) % 60).toString().padStart(2, '0')}
                            </p>
                        </div>
                        <FiPlus className="text-gray-400 group-hover:text-indigo-500" />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MusicSearchMenu;
