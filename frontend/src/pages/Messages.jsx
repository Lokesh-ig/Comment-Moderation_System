import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getConversations, getMessages, sendMessage, reactToMessage, forwardMessage, deleteConversation, markConversationUnread, deleteMessage } from '../services/api';
import { FiSend, FiMessageCircle, FiUser, FiCornerUpLeft, FiShare, FiSmile, FiX, FiMic, FiImage, FiMoreVertical, FiMoreHorizontal, FiMail, FiMapPin, FiBellOff, FiTrash2, FiSquare, FiPlay, FiStopCircle, FiTrash } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const notify = (message, type = 'success') => {
    window.dispatchEvent(new CustomEvent('modchat-notify', { detail: { message, type } }));
};

const QUICK_EMOJIS = ['❤️', '😂', '😮', '👍', '🔥', '😢'];

const Messages = () => {
    const { user } = useAuth();
    const [conversations, setConversations] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [replyTo, setReplyTo] = useState(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(null);
    const [forwardModal, setForwardModal] = useState(null);
    const [lastTap, setLastTap] = useState({ id: null, time: 0 });
    const [contextMenu, setContextMenu] = useState(null); // { username, x, y }
    const [pinnedChats, setPinnedChats] = useState([]);
    const [mutedChats, setMutedChats] = useState([]);

    // New States for Enhanced Input
    const [attachment, setAttachment] = useState(null);
    const [attachmentPreview, setAttachmentPreview] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const [showGifPicker, setShowGifPicker] = useState(false);
    const [showKeyboardEmoji, setShowKeyboardEmoji] = useState(false);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const timerIntervalRef = useRef(null);

    useEffect(() => { fetchConversations(); }, []);
    useEffect(() => { if (selectedUser) fetchMessages(selectedUser.username); }, [selectedUser]);
    useEffect(() => { scrollToBottom(); }, [messages]);
    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); };

    const fetchConversations = async () => {
        try {
            const res = await getConversations();
            setConversations(res.data);
            if (res.data.length > 0 && !selectedUser) setSelectedUser(res.data[0]);
        } catch (err) { console.error('Failed to fetch conversations:', err); }
        finally { setLoading(false); }
    };

    const fetchMessages = async (username) => {
        try {
            const res = await getMessages(username);
            setMessages(res.data);
            setConversations(prev => prev.map(c => c.username === username ? { ...c, unread_count: 0 } : c));
        } catch (err) { setMessages([]); }
    };

    const handleSendMessage = async (e) => {
        if (e) e.preventDefault();

        // Ensure there is some content to send
        if (!newMessage.trim() && !attachment && !audioBlob && !selectedUser) return;

        const formData = new FormData();
        if (newMessage.trim()) formData.append('content', newMessage);
        if (replyTo) formData.append('reply_to', replyTo.id);

        if (attachment) {
            formData.append('attachment', attachment);
        } else if (audioBlob) {
            const mimeType = audioBlob.type || 'audio/webm';
            let ext = 'webm';
            if (mimeType.includes('mp4')) ext = 'mp4';
            else if (mimeType.includes('mpeg')) ext = 'mp3';
            else if (mimeType.includes('ogg')) ext = 'ogg';
            else if (mimeType.includes('wav')) ext = 'wav';

            formData.append('attachment', audioBlob, `audio_message.${ext}`);
        }

        try {
            const res = await sendMessage(selectedUser.username, formData);
            setMessages(prev => [...prev, res.data]);

            // Reset states
            setNewMessage('');
            setAttachment(null);
            setAttachmentPreview(null);
            setAudioBlob(null);
            setReplyTo(null);
            setShowKeyboardEmoji(false);

            setConversations(prev => {
                const updated = prev.map(c => c.username === selectedUser.username ? { ...c, latest_message: res.data } : c);
                return updated.sort((a, b) => {
                    const timeA = a.latest_message ? new Date(a.latest_message.created_at).getTime() : 0;
                    const timeB = b.latest_message ? new Date(b.latest_message.created_at).getTime() : 0;
                    return timeB - timeA;
                });
            });
        } catch (err) { notify(err.response?.data?.error || 'Failed to send', 'error'); }
    };

    const handleSendGif = async (gifUrl) => {
        if (!selectedUser) return;
        const formData = new FormData();
        formData.append('gif_url', gifUrl);
        if (replyTo) formData.append('reply_to', replyTo.id);

        try {
            const res = await sendMessage(selectedUser.username, formData);
            setMessages(prev => [...prev, res.data]);
            setShowGifPicker(false);
            setReplyTo(null);

            setConversations(prev => {
                const updated = prev.map(c => c.username === selectedUser.username ? { ...c, latest_message: res.data } : c);
                return updated.sort((a, b) => {
                    const timeA = a.latest_message ? new Date(a.latest_message.created_at).getTime() : 0;
                    const timeB = b.latest_message ? new Date(b.latest_message.created_at).getTime() : 0;
                    return timeB - timeA;
                });
            });
        } catch (err) { notify('Failed to send GIF', 'error'); }
    };

    const handleAttachmentChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAttachment(file);
            setAttachmentPreview(URL.createObjectURL(file));
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            mediaRecorderRef.current = new MediaRecorder(stream);
            let audioChunks = [];

            mediaRecorderRef.current.addEventListener("dataavailable", event => {
                audioChunks.push(event.data);
            });

            mediaRecorderRef.current.addEventListener("stop", () => {
                const mimeType = mediaRecorderRef.current.mimeType || 'audio/webm';
                const audioBlob = new Blob(audioChunks, { type: mimeType });
                setAudioBlob(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            });

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setRecordingTime(0);
            timerIntervalRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (err) {
            notify('Microphone access denied', 'error');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(timerIntervalRef.current);
        }
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handleReact = async (messageId, emoji) => {
        try {
            await reactToMessage(messageId, emoji);
            await fetchMessages(selectedUser.username);
            setShowEmojiPicker(null);
        } catch (err) { notify('Failed to react', 'error'); }
    };

    const handleForward = async (messageId, targetUsername) => {
        try {
            await forwardMessage(messageId, targetUsername);
            notify(`Forwarded to @${targetUsername}`, 'success');
            setForwardModal(null);
        } catch (err) { notify('Failed to forward', 'error'); }
    };

    const handleReply = (msg) => {
        setReplyTo(msg);
        setShowEmojiPicker(null);
        inputRef.current?.focus();
    };

    const handleDoubleTap = (msg) => {
        const now = Date.now();
        if (lastTap.id === msg.id && now - lastTap.time < 300) {
            setShowEmojiPicker(msg.id);
            setLastTap({ id: null, time: 0 });
        } else {
            setLastTap({ id: msg.id, time: now });
        }
    };

    // Context menu actions
    const handleMarkUnread = async (username) => {
        try {
            await markConversationUnread(username);
            setConversations(prev => prev.map(c => c.username === username ? { ...c, unread_count: 1 } : c));
            notify('Marked as unread');
        } catch (err) { notify('Failed', 'error'); }
        setContextMenu(null);
    };

    const handleDeleteChat = async (username) => {
        try {
            await deleteConversation(username);
            setConversations(prev => prev.filter(c => c.username !== username));
            if (selectedUser?.username === username) {
                setSelectedUser(null);
                setMessages([]);
            }
            notify('Chat deleted');
        } catch (err) { notify('Failed to delete', 'error'); }
        setContextMenu(null);
    };

    const handlePinChat = (username) => {
        setPinnedChats(prev => prev.includes(username) ? prev.filter(u => u !== username) : [...prev, username]);
        setContextMenu(null);
    };

    const handleMuteChat = (username) => {
        setMutedChats(prev => prev.includes(username) ? prev.filter(u => u !== username) : [...prev, username]);
        setContextMenu(null);
    };

    const handleDeleteMessage = async (messageId) => {
        try {
            await deleteMessage(messageId);
            setMessages(prev => prev.filter(m => m.id !== messageId));

            // Optionally update latest_message preview in conversations if we deleted the latest one
            setConversations(prev => prev.map(c => {
                if (c.username === selectedUser.username && c.latest_message?.id === messageId) {
                    return { ...c, latest_message: { content: 'Message deleted' } };
                }
                return c;
            }));
            notify('Message deleted', 'success');
        } catch (err) {
            notify('Failed to delete message', 'error');
        }
    };

    // Sort conversations: pinned first
    const sortedConversations = [...conversations].sort((a, b) => {
        const aPinned = pinnedChats.includes(a.username) ? 1 : 0;
        const bPinned = pinnedChats.includes(b.username) ? 1 : 0;
        return bPinned - aPinned;
    });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 gap-4 w-full">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-400 font-medium tracking-widest uppercase">Loading Messages...</p>
            </div>
        );
    }

    return (
        <div className="w-full flex-1 min-w-0 h-[calc(100vh-2rem)] my-0 sm:my-4 rounded-none sm:rounded-3xl bg-white dark:bg-gray-950 border-0 sm:border border-gray-100 dark:border-gray-800 shadow-2xl overflow-hidden flex flex-row relative">
            {/* Sidebar / Conversation List */}
            <div className={`w-full md:w-[320px] lg:w-[350px] shrink-0 border-r border-gray-100 dark:border-gray-900 flex flex-col bg-gray-50/50 dark:bg-gray-900/20 ${selectedUser ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 md:p-6 border-b border-gray-100 dark:border-gray-900 bg-white dark:bg-black flex items-center justify-between z-10 sticky top-0">
                    <h2 className="text-xl font-black tracking-tight dark:text-white">Messages</h2>
                    <span className="text-xs font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full uppercase tracking-widest">{user?.username}</span>
                </div>
                <div className="flex-1 overflow-y-auto no-scrollbar pb-20 md:pb-0">
                    {sortedConversations.length > 0 ? sortedConversations.map(conv => (
                        <div key={conv.id} className="relative group/conv">
                            <button onClick={() => setSelectedUser(conv)}
                                className={`w-full text-left p-4 flex items-center gap-3 transition-all relative ${selectedUser?.username === conv.username
                                    ? 'bg-white dark:bg-gray-900 shadow-sm border-l-4 border-l-indigo-500'
                                    : 'hover:bg-white dark:hover:bg-gray-800/50 border-l-4 border-l-transparent'}`}>
                                <div className="w-12 h-12 rounded-full border border-gray-100 dark:border-gray-800 overflow-hidden shrink-0 shadow-sm relative">
                                    {conv.avatar_url ? <img src={conv.avatar_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400"><FiUser size={20} /></div>}
                                    {/* Online indicator dot */}
                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></div>
                                </div>
                                <div className="flex-1 min-w-0 pr-6">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        <span className="font-bold text-sm truncate dark:text-white block">{conv.username}</span>
                                        {pinnedChats.includes(conv.username) && <FiMapPin size={10} className="text-indigo-500 shrink-0" />}
                                        {mutedChats.includes(conv.username) && <FiBellOff size={10} className="text-gray-400 shrink-0" />}
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className={`text-xs truncate ${conv.unread_count > 0 ? 'text-indigo-500 font-bold' : 'text-gray-500 font-medium'}`}>
                                            {conv.latest_message ? conv.latest_message.content : 'No messages yet'}
                                        </span>
                                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                            {conv.latest_message && <span className="text-[10px] text-gray-400 font-medium">{new Date(conv.latest_message.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>}
                                            {conv.unread_count > 0 && <span className="w-2 h-2 rounded-full bg-indigo-500"></span>}
                                        </div>
                                    </div>
                                </div>
                            </button>
                            {/* Three dot menu button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setContextMenu(contextMenu?.username === conv.username ? null : { username: conv.username, x: rect.right - 10, y: rect.bottom + 4 });
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full opacity-0 group-hover/conv:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all z-10">
                                <FiMoreHorizontal size={16} className="text-gray-400" />
                            </button>
                        </div>
                    )) : (
                        <div className="p-8 text-center flex flex-col items-center justify-center h-full">
                            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-300 dark:text-gray-600 mb-4"><FiMessageCircle size={24} /></div>
                            <p className="text-sm font-bold text-gray-400 tracking-wide">No messages yet</p>
                            <p className="text-xs text-gray-500 mt-2 font-medium">Follow creators to start chatting!</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Context Menu Dropdown */}
            {contextMenu && (
                <div
                    className="fixed z-[100] w-[220px] bg-[#262626] rounded-2xl shadow-2xl p-2 flex flex-col gap-1"
                    style={{ top: contextMenu.y, right: window.innerWidth - contextMenu.x }}
                    onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => handleMarkUnread(contextMenu.username)}
                        className="w-full flex items-center justify-between px-3 py-2.5 text-[15px] hover:bg-white/10 transition-colors rounded-xl text-white font-medium">
                        <span>Mark as unread</span>
                        <FiMail size={18} className="text-white" />
                    </button>
                    <button onClick={() => handlePinChat(contextMenu.username)}
                        className="w-full flex items-center justify-between px-3 py-2.5 text-[15px] hover:bg-white/10 transition-colors rounded-xl text-white font-medium">
                        <span>{pinnedChats.includes(contextMenu.username) ? 'Unpin' : 'Pin'}</span>
                        <FiMapPin size={18} className="text-white" />
                    </button>
                    <button onClick={() => handleMuteChat(contextMenu.username)}
                        className="w-full flex items-center justify-between px-3 py-2.5 text-[15px] hover:bg-white/10 transition-colors rounded-xl text-white font-medium">
                        <span>{mutedChats.includes(contextMenu.username) ? 'Unmute' : 'Mute'}</span>
                        <FiBellOff size={18} className="text-white" />
                    </button>
                    <div className="border-t border-white/10 mx-1 my-1" />
                    <button onClick={() => handleDeleteChat(contextMenu.username)}
                        className="w-full flex items-center justify-between px-3 py-2.5 text-[15px] hover:bg-red-500/10 transition-colors rounded-xl text-red-500 font-medium">
                        <span>Delete</span>
                        <FiTrash2 size={18} />
                    </button>
                </div>
            )}

            {/* Chat Area */}
            {selectedUser ? (
                <div className="flex-1 min-w-0 flex flex-col bg-white dark:bg-black h-full">
                    {/* Chat Header */}
                    <div className="p-3 border-b border-gray-100 dark:border-gray-900 bg-white/95 dark:bg-black/95 backdrop-blur-md flex items-center gap-3 z-10 shadow-sm">
                        <button className="md:hidden text-gray-500 p-2 -ml-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full" onClick={() => setSelectedUser(null)}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <Link to={`/profile/${selectedUser.username}`} className="w-9 h-9 rounded-full border border-gray-100 dark:border-gray-800 overflow-hidden shrink-0">
                            {selectedUser.avatar_url ? <img src={selectedUser.avatar_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400"><FiUser size={14} /></div>}
                        </Link>
                        <Link to={`/profile/${selectedUser.username}`} className="font-bold text-sm dark:text-white hover:underline">{selectedUser.username}</Link>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col bg-gray-50/30 dark:bg-gray-950/30 w-full relative gap-3" onClick={() => { setShowEmojiPicker(null); }}>
                        {messages.length > 0 ? messages.map((msg, i) => {
                            const isMe = msg.sender_username === user?.username;
                            const prevMsg = messages[i - 1];
                            const sameSender = prevMsg && prevMsg.sender_username === msg.sender_username;
                            const showGap = !sameSender && i > 0;

                            return (
                                <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} group/msg relative ${showGap ? 'mt-6' : 'mt-2'}`}>
                                    {/* Action buttons */}
                                    <div className={`flex items-center gap-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity shrink-0 ${isMe ? 'order-first mr-1' : 'order-last ml-1'}`}>
                                        <button onClick={(e) => { e.stopPropagation(); setForwardModal(msg); }} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full" title="More">
                                            <FiMoreVertical size={14} className="text-gray-400" />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); handleReply(msg); }} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full" title="Reply">
                                            <FiCornerUpLeft size={14} className="text-gray-400" />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id); }} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full" title="React">
                                            <FiSmile size={14} className="text-gray-400" />
                                        </button>
                                        {isMe && (
                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteMessage(msg.id); }} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full group/trash" title="Delete">
                                                <FiTrash size={14} className="text-gray-400 group-hover/trash:text-red-500 transition-colors" />
                                            </button>
                                        )}
                                    </div>

                                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%] md:max-w-[60%] relative`}
                                        onClick={(e) => { e.stopPropagation(); handleDoubleTap(msg); }}>

                                        {msg.forwarded_from_data && (
                                            <div className="text-[10px] text-gray-400 mb-0.5 flex items-center gap-1">
                                                <FiShare size={9} /> Forwarded
                                            </div>
                                        )}

                                        {msg.reply_to_data && (
                                            <div className={`text-[11px] mb-0.5 px-3 py-1 rounded-lg border max-w-full truncate ${isMe
                                                ? 'bg-indigo-400/10 border-indigo-500/20 text-indigo-300'
                                                : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500'}`}>
                                                <span className="font-bold">@{msg.reply_to_data.sender_username}</span>: {msg.reply_to_data.content}
                                            </div>
                                        )}

                                        <div className={`px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed break-words overflow-hidden flex flex-col gap-2 shadow-sm ${isMe
                                            ? 'bg-indigo-600 text-white rounded-br-sm'
                                            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm border border-gray-100 dark:border-gray-800'}`}>

                                            {msg.attachment && msg.attachment.match(/\.(jpeg|jpg|gif|png|webp)$/i) && (
                                                <div className="w-full max-w-[280px] sm:max-w-[320px] rounded-xl overflow-hidden mb-1">
                                                    <img src={`http://localhost:8000${msg.attachment}`} alt="Attachment" className="w-full object-cover" />
                                                </div>
                                            )}

                                            {msg.attachment && msg.attachment.match(/\.(webm|mp3|wav|ogg|m4a|mp4|aac)$/i) && (
                                                <audio controls src={`http://localhost:8000${msg.attachment}`} className="w-full max-w-[220px] sm:max-w-[280px] h-10" />
                                            )}

                                            {msg.gif_url && (
                                                <div className="w-full max-w-[280px] sm:max-w-[320px] rounded-xl overflow-hidden mb-1">
                                                    <img src={msg.gif_url} alt="GIF" className="w-full object-cover" />
                                                </div>
                                            )}

                                            {msg.shared_post_data && (
                                                <Link to={`/`} className={`flex flex-col border rounded-xl overflow-hidden mt-1 mb-1 transition-transform hover:scale-[1.02] ${isMe ? 'border-indigo-400/30 bg-indigo-500/50 hover:bg-indigo-500/70' : 'border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 hover:bg-white/70 dark:hover:bg-gray-900/70'}`}>
                                                    <div className="flex items-center gap-2 p-2 border-b border-inherit bg-black/5 dark:bg-white/5">
                                                        <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 bg-gray-200 dark:bg-gray-800">
                                                            {msg.shared_post_data.author_avatar_url ? (
                                                                <img src={msg.shared_post_data.author_avatar_url} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center">
                                                                    <FiUser size={10} className={isMe ? 'text-white/70' : 'text-gray-400'} />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span className="text-[11px] font-bold truncate">{msg.shared_post_data.author_username}</span>
                                                    </div>
                                                    {msg.shared_post_data.image && (
                                                        <img src={`http://localhost:8000${msg.shared_post_data.image}`} alt="Shared Post" className="w-full aspect-square object-cover" />
                                                    )}
                                                    {msg.shared_post_data.caption && (
                                                        <div className="p-2 text-[11px] truncate opacity-90">
                                                            {msg.shared_post_data.caption}
                                                        </div>
                                                    )}
                                                </Link>
                                            )}

                                            {msg.content && <p className="whitespace-pre-wrap break-words m-0">{msg.content}</p>}
                                        </div>

                                        {msg.reactions && msg.reactions.length > 0 && (
                                            <div className={`flex gap-0.5 -mt-1 ${isMe ? 'justify-end pr-1' : 'justify-start pl-1'}`}>
                                                {Object.entries(msg.reactions.reduce((acc, r) => { acc[r.emoji] = (acc[r.emoji] || 0) + 1; return acc; }, {})).map(([emoji, count]) => (
                                                    <button key={emoji} onClick={(e) => { e.stopPropagation(); handleReact(msg.id, emoji); }}
                                                        className="px-1 py-0.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-full text-[11px] shadow-sm hover:scale-110 transition-transform leading-none">
                                                        {emoji}{count > 1 && <span className="text-gray-500 ml-0.5 text-[9px]">{count}</span>}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        <span className={`text-[9px] text-gray-400 mt-1 font-bold uppercase tracking-widest px-1 ${isMe ? 'text-right' : 'text-left'}`}>
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>

                                        {showEmojiPicker === msg.id && (
                                            <div className={`absolute -top-10 ${isMe ? 'right-0' : 'left-0'} bg-white dark:bg-gray-800 rounded-full shadow-2xl border border-gray-100 dark:border-gray-700 px-2 py-1.5 flex gap-0.5 z-50`}
                                                onClick={(e) => e.stopPropagation()}>
                                                {QUICK_EMOJIS.map(emoji => (
                                                    <button key={emoji} onClick={() => handleReact(msg.id, emoji)}
                                                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-base transition-all hover:scale-125">
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 absolute inset-0">
                                <div className="w-20 h-20 rounded-full border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl flex items-center justify-center text-gray-300 dark:text-gray-700 mb-4">
                                    {selectedUser?.avatar_url ? <img src={selectedUser.avatar_url} alt="" className="w-full h-full object-cover rounded-full" /> : <FiUser size={36} />}
                                </div>
                                <h3 className="text-xl font-black mb-1 dark:text-white uppercase tracking-tight">{selectedUser.username}</h3>
                                <p className="text-sm text-gray-500 font-medium">Start a conversation!</p>
                            </div>
                        )}
                        <div ref={messagesEndRef} className="h-2 w-full shrink-0" />
                    </div>

                    {replyTo && (
                        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex items-center gap-3">
                            <div className="w-1 h-8 bg-indigo-500 rounded-full shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Replying to @{replyTo.sender_username}</p>
                                <p className="text-xs text-gray-500 truncate">{replyTo.content}</p>
                            </div>
                            <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
                                <FiX size={16} className="text-gray-400" />
                            </button>
                        </div>
                    )}

                    {/* Input Bar */}
                    <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-900 bg-white dark:bg-black shrink-0 relative z-20">
                        {/* Emoji Picker Popup */}
                        {showKeyboardEmoji && (
                            <div className="absolute bottom-full left-4 mb-2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-2 z-50">
                                <div className="grid grid-cols-6 gap-1">
                                    {['😀', '😂', '🥺', '❤️', '🔥', '👍', '🎉', '😭', '😎', '🤔', '👎', '🙄'].map(emoji => (
                                        <button key={emoji} type="button" onClick={() => { setNewMessage(prev => prev + emoji); setShowKeyboardEmoji(false); inputRef.current?.focus(); }}
                                            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-lg transition-colors">
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* GIF Picker Popup */}
                        {showGifPicker && (
                            <div className="absolute bottom-full right-4 mb-2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-2 z-50 w-64 h-64 overflow-y-auto no-scrollbar">
                                <div className="flex justify-between items-center mb-2 px-1">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Select GIF</span>
                                    <button onClick={() => setShowGifPicker(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><FiX size={14} className="text-gray-500" /></button>
                                </div>
                                <div className="grid grid-cols-2 gap-1">
                                    {[
                                        "https://media.tenor.com/b_879hLGEyYAAAAi/happy-cat.gif",
                                        "https://media.tenor.com/41I-iMYCuv4AAAAi/cat-dancing.gif",
                                        "https://media.tenor.com/_qQ1eN-3LtcAAAAi/sad-cat.gif",
                                        "https://media.tenor.com/tTz9j_Zp4iAAAAAi/thumbs-up.gif",
                                        "https://media.tenor.com/PZ7a_6T8iXEAAAAi/shocked-face.gif",
                                        "https://media.tenor.com/0P1uYt6e9P4AAAAi/party.gif"
                                    ].map((url, idx) => (
                                        <button key={idx} type="button" onClick={() => handleSendGif(url)}
                                            className="w-full aspect-square rounded-lg overflow-hidden border border-gray-100 dark:border-gray-700 hover:opacity-80 transition-opacity">
                                            <img src={url} alt="GIF" className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Attachment/Audio Previews */}
                        {(attachmentPreview || audioBlob) && (
                            <div className="mb-2 p-2 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl flex items-center gap-3">
                                {attachmentPreview && <img src={attachmentPreview} alt="Preview" className="w-12 h-12 object-cover rounded-lg" />}
                                {audioBlob && (
                                    <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-500">
                                            <FiMic size={14} />
                                        </div>
                                        Audio Message attached
                                    </div>
                                )}
                                <div className="flex-1" />
                                <button type="button" onClick={() => { setAttachment(null); setAttachmentPreview(null); setAudioBlob(null); }}
                                    className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full text-gray-500">
                                    <FiX size={16} />
                                </button>
                            </div>
                        )}

                        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleAttachmentChange} />

                            <div className={`flex-1 flex items-center ${isRecording ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30' : 'bg-gray-100 dark:bg-gray-900 border-gray-200 dark:border-gray-800'} rounded-full border overflow-hidden transition-colors`}>
                                {!isRecording && (
                                    <button type="button" onClick={() => setShowKeyboardEmoji(!showKeyboardEmoji)} className="p-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shrink-0">
                                        <FiSmile size={22} />
                                    </button>
                                )}

                                {isRecording ? (
                                    <div className="flex-1 flex items-center gap-2 py-2.5 px-4">
                                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                        <span className="text-sm font-bold text-red-500">Recording... {formatTime(recordingTime)}</span>
                                        <div className="flex-1" />
                                        <button type="button" onClick={() => { setIsRecording(false); clearInterval(timerIntervalRef.current); setAudioBlob(null); }} className="text-xs text-gray-500 font-bold hover:text-gray-700 mr-2 uppercase">Cancel</button>
                                        <button type="button" onClick={stopRecording} className="p-1.5 bg-red-500 hover:bg-red-600 rounded-full text-white transition-colors flex items-center justify-center">
                                            <FiStopCircle size={14} className="fill-current text-white" />
                                        </button>
                                    </div>
                                ) : (
                                    <input ref={inputRef} type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder={replyTo ? `Reply to @${replyTo.sender_username}...` : "Message..."}
                                        className="flex-1 bg-transparent py-2.5 text-sm focus:outline-none text-gray-900 dark:text-white placeholder-gray-500 font-medium" />
                                )}

                                {!isRecording && (
                                    <div className="flex items-center gap-0.5 pr-2 shrink-0">
                                        <button type="button" onClick={startRecording} className="p-2 text-gray-400 hover:text-indigo-500 transition-colors"><FiMic size={20} /></button>
                                        <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-indigo-500 transition-colors"><FiImage size={20} /></button>
                                        <button type="button" onClick={() => setShowGifPicker(!showGifPicker)} className="p-2 text-gray-400 hover:text-indigo-500 transition-colors">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="9" cy="10" r="1.5" /><circle cx="15" cy="10" r="1.5" /><path d="M9 16c1 1 5 1 6 0" />
                                            </svg>
                                        </button>
                                    </div>
                                )}
                            </div>
                            {(newMessage.trim() || attachmentPreview || audioBlob) && !isRecording && (
                                <button type="submit" className="p-3 rounded-full text-white bg-indigo-500 hover:bg-indigo-600 active:scale-95 transition-all shadow-lg shadow-indigo-500/30 shrink-0">
                                    <FiSend size={18} className="translate-x-[1px] translate-y-[-1px]" />
                                </button>
                            )}
                        </form>
                    </div>
                </div>
            ) : (
                <div className="hidden md:flex flex-1 flex-col items-center justify-center p-8 bg-gray-50/30 dark:bg-gray-950/30">
                    <div className="w-24 h-24 rounded-full border-4 border-gray-100 dark:border-gray-900 flex items-center justify-center text-gray-300 dark:text-gray-700 bg-white dark:bg-black shadow-2xl mb-6"><FiMessageCircle size={40} /></div>
                    <h3 className="text-2xl font-black mb-3 dark:text-white tracking-tight">Your Messages</h3>
                    <p className="text-gray-500 font-medium text-center">Send private messages to a friend.</p>
                </div>
            )}

            {/* Forward Modal */}
            {forwardModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={() => setForwardModal(null)}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div className="relative w-full max-w-[400px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <h3 className="text-sm font-bold dark:text-white uppercase tracking-widest">Forward Message</h3>
                            <button onClick={() => setForwardModal(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"><FiX size={18} className="text-gray-500" /></button>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 mx-4 mt-3 rounded-xl">
                            <p className="text-xs text-gray-400 font-bold mb-1">Message:</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{forwardModal.content}</p>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto p-2 no-scrollbar">
                            <p className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select a contact</p>
                            {conversations.filter(c => c.username !== selectedUser?.username).map(conv => (
                                <button key={conv.id} onClick={() => handleForward(forwardModal.id, conv.username)}
                                    className="w-full text-left p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-all">
                                    <div className="w-10 h-10 rounded-full border border-gray-100 dark:border-gray-800 overflow-hidden shrink-0">
                                        {conv.avatar_url ? <img src={conv.avatar_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400"><FiUser size={16} /></div>}
                                    </div>
                                    <span className="text-sm font-bold dark:text-white">{conv.username}</span>
                                    <FiSend size={14} className="ml-auto text-indigo-500" />
                                </button>
                            ))}
                            {conversations.filter(c => c.username !== selectedUser?.username).length === 0 && (
                                <p className="text-center py-8 text-sm text-gray-400 font-medium">No other contacts to forward to</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Messages;
