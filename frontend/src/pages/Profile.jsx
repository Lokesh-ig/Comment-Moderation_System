import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { getProfile, getMyProfile, getPosts, followUser, getFollowers, getFollowing, updateProfile, getSavedPosts, deletePost, getTaggedPosts, changePassword } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import { FiSettings, FiGrid, FiBookmark, FiTag, FiHeart, FiMessageCircle, FiUserPlus, FiUserCheck, FiLock, FiX, FiUser, FiAlertCircle, FiCamera, FiChevronLeft } from 'react-icons/fi';

// Global notification helper
const notify = (message, type = 'success') => {
    window.dispatchEvent(new CustomEvent('modchat-notify', {
        detail: { message, type }
    }));
};

const UserListModal = ({ title, users, isOpen, onClose, onFollowToggle, currentUser }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
            <div className="relative w-full max-w-[400px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <div className="w-8" />
                    <h3 className="text-sm font-bold dark:text-white uppercase tracking-widest">{title}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500">
                        <FiX size={20} />
                    </button>
                </div>
                <div className="max-h-[400px] overflow-y-auto no-scrollbar p-2">
                    {users.length > 0 ? (
                        users.map((u) => (
                            <div key={u.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-all group">
                                <Link to={`/profile/${u.username}`} className="flex items-center gap-3 flex-1 min-w-0" onClick={onClose}>
                                    <div className="w-10 h-10 rounded-full border-2 border-indigo-500/20 p-0.5 shrink-0 group-hover:border-indigo-500/50 transition-colors">
                                        {u.avatar_url ? (
                                            <img src={u.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                                <FiUser size={16} className="text-gray-400" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-sm font-bold dark:text-white truncate">{u.username}</span>
                                        <span className="text-[10px] text-gray-400 truncate font-medium uppercase tracking-tight">{u.bio || 'ModChat Creator'}</span>
                                    </div>
                                </Link>
                                {u.username !== currentUser && (
                                    <button
                                        onClick={() => onFollowToggle(u.username)}
                                        className={`ml-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${u.is_following
                                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                                            : 'bg-indigo-500 text-white hover:bg-indigo-600'}`}
                                    >
                                        {u.is_following ? 'Following' : 'Follow'}
                                    </button>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="py-12 text-center text-gray-400">
                            <p className="text-sm font-medium">No {title.toLowerCase()} yet</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const EditProfileModal = ({ profile, isOpen, onClose, onUpdate }) => {
    const [username, setUsername] = useState(profile?.username || '');
    const [bio, setBio] = useState(profile?.bio || '');
    const [email, setEmail] = useState(profile?.email || '');
    const [avatar, setAvatar] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url || null);
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData();
        formData.append('username', username);
        formData.append('bio', bio);
        formData.append('email', email);
        if (avatar) formData.append('avatar', avatar);

        try {
            await onUpdate(formData);
            onClose();
        } catch (err) {
            console.error('Update failed:', err);
            const data = err.response?.data;
            let errorMsg = 'Update failed';

            if (data) {
                if (typeof data === 'string') {
                    errorMsg = data;
                } else if (data.username) {
                    errorMsg = Array.isArray(data.username) ? data.username[0] : data.username;
                } else if (data.email) {
                    errorMsg = Array.isArray(data.email) ? data.email[0] : data.email;
                } else if (data.detail) {
                    errorMsg = data.detail;
                } else if (typeof data === 'object') {
                    errorMsg = Object.entries(data).map(([k, v]) => `${k}: ${v}`).join('\n');
                } else {
                    errorMsg = JSON.stringify(data);
                }
            } else if (err.message) {
                errorMsg = err.message;
            }
            notify(errorMsg, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-fade-in" onClick={onClose} />
            <div className="relative w-full max-w-[450px] bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <button onClick={onClose} className="text-sm font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Cancel</button>
                    <h3 className="text-base font-bold dark:text-white">Edit Profile</h3>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="text-sm font-bold text-indigo-500 hover:text-indigo-600 disabled:opacity-50"
                    >
                        {loading ? '...' : 'Done'}
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="flex items-center gap-6">
                        <label className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 border-2 border-indigo-500/20 cursor-pointer hover:border-indigo-500 transition-all relative group">
                            {avatarPreview ? (
                                <img src={avatarPreview} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">
                                    {username.charAt(0)}
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <FiUser className="text-white" size={24} />
                            </div>
                            <input
                                type="file"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                        setAvatar(file);
                                        setAvatarPreview(URL.createObjectURL(file));
                                    }
                                }}
                                accept="image/*"
                            />
                        </label>
                        <div>
                            <h4 className="text-sm font-bold dark:text-white mb-1 truncate">{username}</h4>
                            <label className="text-xs font-bold text-indigo-500 cursor-pointer hover:text-indigo-600 block transition-colors">
                                Change profile photo
                                <input
                                    type="file"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                            setAvatar(file);
                                            setAvatarPreview(URL.createObjectURL(file));
                                        }
                                    }}
                                    accept="image/*"
                                />
                            </label>
                            {avatar && <p className="text-[10px] text-emerald-500 mt-1 font-bold">✓ {avatar.name}</p>}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-xl text-sm focus:ring-2 ring-indigo-500/20 outline-none transition-all dark:text-white"
                                placeholder="Username"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Bio</label>
                            <textarea
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-xl text-sm focus:ring-2 ring-indigo-500/20 outline-none transition-all dark:text-white h-24 resize-none"
                                placeholder="Describe yourself..."
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const UnfollowModal = ({ username, isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose} />
            <div className="relative w-full max-w-[400px] bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden animate-scale-in text-center">
                <div className="p-8">
                    <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-4 text-red-500">
                        <FiAlertCircle size={32} />
                    </div>
                    <h3 className="text-lg font-bold dark:text-white mb-2">Unfollow @{username}?</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                        Their private posts will no longer appear in your feed. You can follow them again anytime.
                    </p>
                </div>
                <div className="flex flex-col border-t border-gray-100 dark:border-gray-800">
                    <button
                        onClick={() => { onConfirm(); onClose(); }}
                        className="w-full py-4 text-sm font-black text-red-500 hover:bg-red-50 dark:hover:bg-red-500/5 transition-colors"
                    >
                        Unfollow
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full py-4 text-sm font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

const AvatarUploadModal = ({ isOpen, onClose, onUpload, currentAvatar, username }) => {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(currentAvatar);
    const [uploading, setUploading] = useState(false);

    if (!isOpen) return null;

    const handleFileChange = (e) => {
        const f = e.target.files[0];
        if (f) {
            setFile(f);
            setPreview(URL.createObjectURL(f));
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('avatar', file);
            await onUpload(formData);
            onClose();
        } catch (err) {
            console.error('Upload failed:', err);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-fade-in" onClick={onClose} />
            <div className="relative w-full max-w-[400px] bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <button onClick={onClose} className="text-sm font-bold text-gray-500 hover:text-gray-700">Cancel</button>
                    <h3 className="text-base font-bold dark:text-white">Change Photo</h3>
                    <button onClick={handleUpload} disabled={!file || uploading} className="text-sm font-bold text-indigo-500 hover:text-indigo-600 disabled:opacity-50">
                        {uploading ? '...' : 'Save'}
                    </button>
                </div>
                <div className="p-8 flex flex-col items-center gap-6">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-indigo-500/20 bg-gray-100 dark:bg-gray-800">
                        {preview ? (
                            <img src={preview} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <FiUser size={48} />
                            </div>
                        )}
                    </div>
                    <label className="cursor-pointer px-6 py-3 bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-600 transition-all active:scale-95">
                        <FiCamera className="inline mr-2" size={16} />
                        Choose Photo
                        <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    </label>
                    {file && <p className="text-xs text-emerald-500 font-bold">✓ {file.name}</p>}
                </div>
            </div>
        </div>
    );
};

const PostDetailModal = ({ post, isOpen, onClose, onLike, onDelete }) => {
    if (!isOpen || !post) return null;
    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose} />
            <div className="relative w-full max-w-[600px] max-h-[90vh] overflow-y-auto no-scrollbar bg-white dark:bg-black rounded-3xl shadow-2xl animate-scale-in">
                <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors">
                    <FiX size={20} />
                </button>
                <PostCard post={post} onLike={onLike} onDelete={onDelete} />
            </div>
        </div>
    );
};

const SettingsModal = ({ isOpen, onClose, onLogout, profile, onUpdate }) => {
    const [view, setView] = useState('main'); // main, account, password, 2fa
    const [loading, setLoading] = useState(false);
    const [passwordData, setPasswordData] = useState({ old_password: '', new_password: '', confirm_password: '' });
    const [email, setEmail] = useState(profile?.email || '');
    const [loginActivities, setLoginActivities] = useState([]);

    if (!isOpen) return null;

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwordData.new_password !== passwordData.confirm_password) {
            notify('Passwords do not match', 'error');
            return;
        }
        setLoading(true);
        try {
            const { changePassword } = await import('../services/api');
            await changePassword({
                old_password: passwordData.old_password,
                new_password: passwordData.new_password
            });
            notify('Password updated successfully');
            setView('main');
            setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
        } catch (err) {
            notify(err.response?.data?.error || 'Failed to update password', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchLoginActivities = async () => {
        setLoading(true);
        try {
            const { getLoginActivity } = await import('../services/api');
            const res = await getLoginActivity();
            setLoginActivities(res.data);
            setView('login_activity');
        } catch (err) {
            notify('Failed to fetch login activities', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleEmailUpdate = async () => {
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('email', email);
            await onUpdate(formData);
            setView('main');
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handle2FAToggle = async () => {
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('two_factor_enabled', !profile.two_factor_enabled);
            await onUpdate(formData);
            notify(`Two-step verification ${!profile.two_factor_enabled ? 'enabled' : 'disabled'}`);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const renderMain = () => (
        <div className="flex flex-col gap-2 p-2">
            <button onClick={() => setView('account')} className="w-full py-4 text-sm font-semibold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-800/70 rounded-2xl transition-all shadow-sm">
                Account settings and privacy
            </button>
            <button onClick={fetchLoginActivities} className="w-full py-4 text-sm font-semibold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-800/70 rounded-2xl transition-all shadow-sm">
                Login activities
            </button>
            <button onClick={onLogout} className="w-full py-4 text-sm font-black text-red-500 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-2xl transition-all shadow-sm">
                Logout
            </button>
            <button onClick={onClose} className="w-full py-4 text-sm font-bold text-gray-500 bg-gray-50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-800/70 rounded-2xl transition-all shadow-sm">
                Cancel
            </button>
        </div>
    );

    const renderAccount = () => (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between mb-4">
                <button onClick={() => setView('main')} className="text-gray-500 hover:text-indigo-500 transition-colors">
                    <FiChevronLeft size={24} />
                </button>
                <h3 className="text-base font-bold dark:text-white">Account Settings</h3>
                <div className="w-6" />
            </div>

            <div className="space-y-4">
                {/* Email Section */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Contact Info</label>
                    <div className="flex gap-2">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="flex-1 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 ring-indigo-500/20 dark:text-white"
                        />
                        <button onClick={handleEmailUpdate} disabled={loading} className="px-4 py-2 bg-indigo-500 text-white rounded-xl text-xs font-bold hover:bg-indigo-600 disabled:opacity-50 transition-all">
                            Save
                        </button>
                    </div>
                </div>

                {/* Password Section */}
                <button onClick={() => setView('password')} className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all group">
                    <div className="text-left">
                        <p className="text-sm font-bold dark:text-white">Change Password</p>
                        <p className="text-[11px] text-gray-500 font-medium">Update your security secret</p>
                    </div>
                    <FiLock className="text-gray-400 group-hover:text-indigo-500 transition-colors" />
                </button>

                {/* 2FA Section */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                    <div className="text-left">
                        <p className="text-sm font-bold dark:text-white">Two-step verification</p>
                        <p className="text-[11px] text-gray-500 font-medium">Add an extra layer of security</p>
                    </div>
                    <button
                        onClick={handle2FAToggle}
                        disabled={loading}
                        className={`relative w-11 h-6 rounded-full transition-all duration-300 ${profile.two_factor_enabled ? 'bg-indigo-500' : 'bg-gray-300'}`}
                    >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300 ${profile.two_factor_enabled ? 'left-[24px]' : 'left-1'}`} />
                    </button>
                </div>
            </div>
        </div>
    );

    const renderLoginActivity = () => (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between mb-4">
                <button onClick={() => setView('main')} className="text-gray-500 hover:text-indigo-500 transition-colors">
                    <FiChevronLeft size={24} />
                </button>
                <h3 className="text-base font-bold dark:text-white">Login Activity</h3>
                <div className="w-6" />
            </div>

            <div className="max-h-[400px] overflow-y-auto pr-2 space-y-4 no-scrollbar">
                {loginActivities.length > 0 ? (
                    loginActivities.map((activity) => (
                        <div key={activity.id} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activity.event_type === 'login' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                    <FiLock size={18} />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-bold dark:text-white capitalize">{activity.event_type}</p>
                                    <p className="text-[10px] text-gray-500 font-medium">{new Date(activity.timestamp).toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{activity.ip_address}</p>
                                <p className="text-[9px] text-gray-400 font-medium truncate max-w-[100px]">{activity.user_agent.split(' ')[0]}</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="py-12 text-center text-gray-400">
                        <p className="text-sm font-medium">No activity recorded yet</p>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose} />
            <div className="relative w-full max-w-[400px] bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
                {view === 'main' && renderMain()}
                {view === 'account' && renderAccount()}
                {view === 'password' && renderPassword()}
                {view === 'login_activity' && renderLoginActivity()}
            </div>
        </div>
    );
};

const Profile = () => {
    const { username } = useParams();
    const { user, logout, refreshProfile } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [profile, setProfile] = useState(null);
    const [userPosts, setUserPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'posts');
    const [isFollowing, setIsFollowing] = useState(false);
    const [savedPosts, setSavedPosts] = useState([]);
    const [taggedPosts, setTaggedPosts] = useState([]);

    // Modal states
    const [showListModal, setShowListModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showUnfollowModal, setShowUnfollowModal] = useState(false);
    const [showAvatarModal, setShowAvatarModal] = useState(false);
    const [selectedPost, setSelectedPost] = useState(null);
    const [listTitle, setListTitle] = useState('');
    const [listUsers, setListUsers] = useState([]);

    const isOwnProfile = !username || username === user?.username;

    const fetchData = async () => {
        try {
            let profileData;
            if (isOwnProfile) {
                const res = await getMyProfile();
                profileData = res.data;
            } else {
                const res = await getProfile(username);
                profileData = res.data;
            }
            setProfile(profileData);
            if (profileData) {
                setIsFollowing(profileData.is_following || false);

                const postsRes = await getPosts();
                const filteredPosts = postsRes.data.filter(p => p.author_username === profileData.username);
                setUserPosts(filteredPosts);
            }
        } catch (err) {
            console.error('Failed to fetch profile:', err);
            if (!isOwnProfile) navigate('/');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [username, isOwnProfile, navigate]);

    // Listen for sidebar "Settings" click
    useEffect(() => {
        const handleOpenSettings = () => {
            if (isOwnProfile) setShowSettingsModal(true);
        };
        window.addEventListener('open-settings', handleOpenSettings);
        return () => window.removeEventListener('open-settings', handleOpenSettings);
    }, [isOwnProfile]);

    // Handle ?tab=saved query param
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab === 'saved' && isOwnProfile) {
            setActiveTab('saved');
            const fetchSaved = async () => {
                try {
                    const res = await getSavedPosts();
                    setSavedPosts(res.data);
                } catch (err) {
                    console.error('Failed to fetch saved posts:', err);
                }
            };
            fetchSaved();
        }
    }, [searchParams, isOwnProfile]);

    const handleFollow = async (targetUsername) => {
        const usernameToFollow = targetUsername || profile.username;

        // If already following and no target override (main profile button), show confirmation
        if (!targetUsername && isFollowing) {
            setShowUnfollowModal(true);
            return;
        }

        try {
            const res = await followUser(usernameToFollow);
            const action = res.data.followed ? 'followed' : 'unfollowed';
            notify(`Successfully ${action} @${usernameToFollow}`, 'success');

            if (showListModal) {
                if (listTitle === 'Followers') handleShowFollowers();
                else handleShowFollowing();
            }
            fetchData();
        } catch (err) {
            console.error('Follow failed:', err);
            notify('Failed to update follow status', 'error');
        }
    };

    const confirmUnfollow = async () => {
        try {
            await followUser(profile.username);
            notify(`Unfollowed @${profile.username}`, 'info');
            fetchData();
        } catch (err) {
            notify('Failed to unfollow', 'error');
        }
    };

    const handleUpdateProfile = async (formData) => {
        try {
            await updateProfile(profile.username, formData);
            await refreshProfile();
            await fetchData();
            notify('Profile updated successfully!', 'success');
            if (formData.get('username') !== profile.username) {
                navigate(`/profile/${formData.get('username')}`);
            }
        } catch (err) {
            throw err;
        }
    };

    const handleLogout = async () => {
        try {
            const { logoutRecord } = await import('../services/api');
            await logoutRecord();
        } catch (err) {
            console.error('Logout record failed:', err);
        }
        logout();
        navigate('/login');
    };

    const handleShowFollowers = async () => {
        try {
            const res = await getFollowers(profile.username);
            setListUsers(res.data);
            setListTitle('Followers');
            setShowListModal(true);
        } catch (err) {
            console.error('Failed to fetch followers:', err);
        }
    };

    const handleShowFollowing = async () => {
        try {
            const res = await getFollowing(profile.username);
            setListUsers(res.data);
            setListTitle('Following');
            setShowListModal(true);
        } catch (err) {
            console.error('Failed to fetch following:', err);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 gap-4">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-400 font-medium tracking-widest uppercase">Syncing Profile...</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-[935px] mx-auto px-4 py-8 md:py-12 animate-fade-in relative">
            {/* Header */}
            <header className="flex flex-col md:flex-row items-center md:items-start gap-10 md:gap-16 mb-16 px-4">
                {/* Avatar */}
                <div className="relative group shrink-0">
                    <div
                        className={`w-32 h-32 md:w-40 md:h-40 rounded-full p-1 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 shadow-2xl transition-transform duration-500 group-hover:scale-105 ${isOwnProfile ? 'cursor-pointer' : ''}`}
                        onClick={() => isOwnProfile && setShowAvatarModal(true)}
                    >
                        <div className="w-full h-full rounded-full border-4 border-white dark:border-black overflow-hidden bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                            {profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-6xl font-black text-gray-200 dark:text-gray-800">{profile?.username?.charAt(0)?.toUpperCase()}</span>
                            )}
                        </div>
                        {isOwnProfile && (
                            <div className="absolute inset-0 rounded-full bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <FiCamera className="text-white" size={32} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Info Section */}
                <div className="flex-1 text-center md:text-left pt-2">
                    <div className="flex flex-col md:flex-row md:items-center gap-6 mb-8">
                        <h2 className="text-2xl font-light tracking-tight text-gray-900 dark:text-white uppercase font-black">{profile?.username}</h2>
                        <div className="flex gap-2 justify-center">
                            {isOwnProfile ? (
                                <>
                                    <button
                                        onClick={() => setShowEditModal(true)}
                                        className="px-6 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-95 shadow-sm"
                                    >
                                        Edit Profile
                                    </button>
                                    <button
                                        onClick={() => setShowSettingsModal(true)}
                                        className="p-2 text-gray-600 hover:text-indigo-500 transition-colors"
                                    >
                                        <FiSettings size={22} strokeWidth={2.5} />
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => handleFollow()}
                                    className={`px-8 py-2 rounded-lg text-sm font-bold transition-all active:scale-95 shadow-lg ${isFollowing
                                        ? 'bg-gray-100 dark:bg-gray-800 text-black dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/20'
                                        }`}
                                >
                                    {isFollowing ? <span className="flex items-center gap-2"><FiUserCheck /> Following</span> : <span className="flex items-center gap-2"><FiUserPlus /> Follow</span>}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-center md:justify-start gap-6 sm:gap-10 mb-8 border-y md:border-none py-4 md:py-0 border-gray-100 dark:border-gray-900">
                        <div className="flex flex-col md:flex-row items-center gap-1">
                            <span className="font-black text-gray-900 dark:text-white text-lg">{userPosts.length}</span>
                            <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">posts</span>
                        </div>
                        <button onClick={handleShowFollowers} className="flex flex-col md:flex-row items-center gap-1 hover:opacity-70 transition-opacity">
                            <span className="font-black text-gray-900 dark:text-white text-lg">{profile?.follower_count || 0}</span>
                            <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">followers</span>
                        </button>
                        <button onClick={handleShowFollowing} className="flex flex-col md:flex-row items-center gap-1 hover:opacity-70 transition-opacity">
                            <span className="font-black text-gray-900 dark:text-white text-lg">{profile?.following_count || 0}</span>
                            <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">following</span>
                        </button>
                    </div>

                    <div className="max-w-md">
                        <h3 className="font-black text-sm text-gray-900 dark:text-white mb-1 uppercase tracking-tight">{profile?.username}</h3>
                        <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                            {profile?.bio || `Join ${profile?.username} on the journey to perfection! 🚀`}
                        </p>
                    </div>
                </div>
            </header>

            {/* Modals */}
            <UserListModal
                title={listTitle}
                users={listUsers}
                isOpen={showListModal}
                onClose={() => setShowListModal(false)}
                onFollowToggle={handleFollow}
                currentUser={user?.username}
            />

            <EditProfileModal
                profile={profile}
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                onUpdate={handleUpdateProfile}
            />

            <SettingsModal
                isOpen={showSettingsModal}
                onClose={() => setShowSettingsModal(false)}
                onLogout={handleLogout}
                profile={profile}
                onUpdate={handleUpdateProfile}
            />

            <UnfollowModal
                username={profile?.username}
                isOpen={showUnfollowModal}
                onClose={() => setShowUnfollowModal(false)}
                onConfirm={confirmUnfollow}
            />

            <AvatarUploadModal
                isOpen={showAvatarModal}
                onClose={() => setShowAvatarModal(false)}
                onUpload={handleUpdateProfile}
                currentAvatar={profile?.avatar_url}
                username={profile?.username}
            />

            <PostDetailModal
                post={selectedPost}
                isOpen={!!selectedPost}
                onClose={() => setSelectedPost(null)}
                onLike={fetchData}
                onDelete={(id) => {
                    setSelectedPost(null);
                    setUserPosts(prev => prev.filter(p => p.id !== id));
                }}
            />

            {/* Tabs Navigation */}
            <div className="border-t border-gray-100 dark:border-gray-900">
                <div className="flex justify-center gap-6 sm:gap-16">
                    {[
                        { id: 'posts', label: 'POSTS', icon: FiGrid },
                        { id: 'saved', label: 'SAVED', icon: FiBookmark },
                        { id: 'tagged', label: 'TAGGED', icon: FiTag },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={async () => {
                                setActiveTab(tab.id);
                                if (tab.id === 'saved' && isOwnProfile) {
                                    try {
                                        const res = await getSavedPosts();
                                        setSavedPosts(res.data);
                                    } catch (err) {
                                        console.error('Failed to fetch saved posts:', err);
                                    }
                                }
                                if (tab.id === 'tagged') {
                                    try {
                                        const res = await getTaggedPosts(profile.username);
                                        setTaggedPosts(res.data);
                                    } catch (err) {
                                        console.error('Failed to fetch tagged posts:', err);
                                    }
                                }
                            }}
                            className={`flex items-center gap-2 py-4 border-t-2 transition-all group ${activeTab === tab.id
                                ? 'border-indigo-500 text-indigo-500 font-bold'
                                : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                                }`}
                        >
                            <tab.icon size={12} className={activeTab === tab.id ? 'scale-110' : 'group-hover:scale-110'} />
                            <span className="text-[10px] tracking-widest font-bold">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="mt-32 pb-20">
                    {activeTab === 'posts' && (
                        <>
                            {isOwnProfile || isFollowing ? (
                                userPosts.length > 0 ? (
                                    <div className="grid grid-cols-3 gap-1 md:gap-6 animate-scale-in">
                                        {userPosts.map((post) => (
                                            <div key={post.id} className="relative aspect-square group cursor-pointer overflow-hidden bg-gray-100 dark:bg-gray-900 rounded-xl" onClick={() => setSelectedPost(post)}>
                                                <img src={post.image} alt="" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                                                <div className="absolute inset-0 bg-indigo-900/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-8 text-white backdrop-blur-[2px]">
                                                    <div className="flex items-center gap-2 font-black text-lg scale-90 group-hover:scale-100 transition-transform"><FiHeart fill="white" /> {post.likes_count}</div>
                                                    <div className="flex items-center gap-2 font-black text-lg scale-90 group-hover:scale-100 transition-transform"><FiMessageCircle fill="white" /> {post.comment_count}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-32 text-gray-400 flex flex-col items-center gap-4">
                                        <div className="w-20 h-20 rounded-full border-2 border-gray-200 dark:border-gray-800 flex items-center justify-center text-gray-200 dark:text-gray-800">
                                            <FiGrid size={40} />
                                        </div>
                                        <h4 className="text-xl font-black dark:text-white uppercase tracking-widest">No Posts</h4>
                                        <p className="text-sm max-w-xs mx-auto font-medium">When they share their first masterpiece, it will appear here.</p>
                                    </div>
                                )
                            ) : (
                                <div className="max-w-sm mx-auto p-12 text-center mt-4 bg-gray-50 dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-2xl animate-fade-in-up">
                                    <div className="w-20 h-20 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto mb-6 text-indigo-500 ring-8 ring-indigo-500/5">
                                        <FiLock size={36} />
                                    </div>
                                    <h4 className="text-xl font-black dark:text-white mb-2 uppercase tracking-widest">Private Space</h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-bold">
                                        This account is private. Follow to witness their unique creative vision.
                                    </p>
                                </div>
                            )}
                        </>
                    )}

                    {activeTab === 'saved' && isOwnProfile && (
                        <>
                            {savedPosts.length > 0 ? (
                                <div className="grid grid-cols-3 gap-1 md:gap-6 animate-scale-in">
                                    {savedPosts.map((post) => (
                                        <div key={post.id} className="relative aspect-square group cursor-pointer overflow-hidden bg-gray-100 dark:bg-gray-900 rounded-xl" onClick={() => setSelectedPost(post)}>
                                            <img src={post.image} alt="" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                                            <div className="absolute inset-0 bg-indigo-900/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-8 text-white backdrop-blur-[2px]">
                                                <div className="flex items-center gap-2 font-black text-lg scale-90 group-hover:scale-100 transition-transform"><FiHeart fill="white" /> {post.likes_count}</div>
                                                <div className="flex items-center gap-2 font-black text-lg scale-90 group-hover:scale-100 transition-transform"><FiMessageCircle fill="white" /> {post.comment_count}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-32 text-gray-400 flex flex-col items-center gap-4">
                                    <div className="w-20 h-20 rounded-full border-2 border-gray-200 dark:border-gray-800 flex items-center justify-center text-gray-200 dark:text-gray-800">
                                        <FiBookmark size={40} />
                                    </div>
                                    <h4 className="text-xl font-black dark:text-white uppercase tracking-widest">No Saved Posts</h4>
                                    <p className="text-sm max-w-xs mx-auto font-medium">Posts you save will appear here for quick access.</p>
                                </div>
                            )}
                        </>
                    )}

                    {activeTab === 'tagged' && (
                        <>
                            {taggedPosts.length > 0 ? (
                                <div className="grid grid-cols-3 gap-1 md:gap-6 animate-scale-in">
                                    {taggedPosts.map((post) => (
                                        <div key={post.id} className="relative aspect-square group cursor-pointer overflow-hidden bg-gray-100 dark:bg-gray-900 rounded-xl" onClick={() => setSelectedPost(post)}>
                                            <img src={post.image} alt="" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                                            <div className="absolute inset-0 bg-indigo-900/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-8 text-white backdrop-blur-[2px]">
                                                <div className="flex items-center gap-2 font-black text-lg scale-90 group-hover:scale-100 transition-transform"><FiHeart fill="white" /> {post.likes_count}</div>
                                                <div className="flex items-center gap-2 font-black text-lg scale-90 group-hover:scale-100 transition-transform"><FiMessageCircle fill="white" /> {post.comment_count}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-32 text-gray-400 flex flex-col items-center gap-4">
                                    <div className="w-20 h-20 rounded-full border-2 border-gray-200 dark:border-gray-800 flex items-center justify-center text-gray-200 dark:text-gray-800">
                                        <FiTag size={40} />
                                    </div>
                                    <h4 className="text-xl font-black dark:text-white uppercase tracking-widest">No Photos</h4>
                                    <p className="text-sm max-w-xs mx-auto font-medium">When people tag {isOwnProfile ? 'you' : 'them'} in photos, they'll appear here.</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;
