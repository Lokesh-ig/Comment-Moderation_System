import { useState, useEffect } from 'react';
import {
    getFlaggedComments,
    getModerationStats,
    getAllComments,
    getAllUsers,
    manageUser
} from '../services/api';
import API from '../services/api';
import {
    PieChart, Pie, Cell, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend
} from 'recharts';
import {
    FiShield, FiMessageSquare, FiUsers,
    FiBarChart2, FiCheck, FiTrash2,
    FiFlag, FiClock, FiSearch,
    FiMoreVertical, FiUserCheck, FiUserX,
    FiEye
} from 'react-icons/fi';

const COLORS = {
    allowed: '#10b981',
    flagged: '#f59e0b',
    deleted: '#ef4444',
};

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [flagged, setFlagged] = useState([]);
    const [allComments, setAllComments] = useState([]);
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState({ total: 0, allowed: 0, flagged: 0, deleted: 0, distribution: [] });
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [flaggedRes, statsRes, commentsRes, usersRes] = await Promise.all([
                getFlaggedComments(),
                getModerationStats(),
                getAllComments(),
                getAllUsers()
            ]);
            setFlagged(flaggedRes.data);
            setStats(statsRes.data);
            setAllComments(commentsRes.data);
            setUsers(usersRes.data);
        } catch (err) {
            console.error('Failed to fetch admin data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCommentStatus = async (id, status) => {
        setActionLoading(id);
        try {
            await API.patch(`/comment/${id}/`, { status });
            fetchData();
        } catch (err) {
            console.error(`Failed to update comment to ${status}:`, err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteComment = async (id) => {
        if (!window.confirm('Permanently delete this comment?')) return;
        setActionLoading(id);
        try {
            await API.delete(`/comment/${id}/`);
            fetchData();
        } catch (err) {
            console.error('Failed to delete comment:', err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleUserAction = async (userId, data) => {
        setActionLoading(userId);
        try {
            await manageUser(userId, data);
            fetchData();
        } catch (err) {
            console.error('Failed to update user:', err);
        } finally {
            setActionLoading(userId);
        }
    };

    const filteredComments = allComments.filter(c =>
        c.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const tabs = [
        { id: 'overview', label: 'Overview', icon: FiBarChart2 },
        { id: 'moderation', label: 'Moderation', icon: FiShield, count: flagged.length },
        { id: 'feed', label: 'Comment Feed', icon: FiMessageSquare },
        { id: 'users', label: 'User Management', icon: FiUsers },
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">Securing Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black transition-colors w-full">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-4">
                            <div className="w-12 h-12 rounded-[30%] bg-gradient-to-br from-[#6366f1] via-[#a855f7] to-[#ec4899] flex items-center justify-center shadow-xl shadow-indigo-500/20 relative group">
                                <svg className="w-11.5 h-11.5 group-hover:scale-105 transition-transform duration-300 transform rotate-[15deg]" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <defs>
                                        <linearGradient id="adminInGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#4c1d95" />
                                            <stop offset="100%" stopColor="#be123c" />
                                        </linearGradient>
                                    </defs>
                                    <path d="M50 20 C33.43 20 20 33.43 20 50 C20 66.57 33.43 80 50 80 C54.55 80 58.85 78.98 62.69 77.16 L81 81 L75.16 67.69 C78.25 62.77 80 57.14 80 50 C80 33.43 66.57 20 50 20 Z" fill="url(#adminInGrad)" />
                                    <path d="M52 35 L38 55 H48 L46 75 L62 50 H52 L54 35 Z" fill="#fef08a" />
                                </svg>
                            </div>
                            Command Center
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">System-wide monitoring & advanced moderation</p>
                    </div>

                    {/* Quick Stats Pill */}
                    <div className="flex items-center gap-2 bg-white dark:bg-gray-900 p-2 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                        <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl">
                            <span className="text-xs font-black text-indigo-500 uppercase tracking-widest">Active Admins</span>
                            <div className="flex -space-x-2 mt-1">
                                <div className="w-6 h-6 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-900" />
                                <div className="w-6 h-6 rounded-full bg-amber-500 border-2 border-white dark:border-gray-900" />
                                <div className="w-6 h-6 rounded-full bg-indigo-500 border-2 border-white dark:border-gray-900" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex flex-wrap items-center gap-2 mb-8 bg-gray-200/50 dark:bg-gray-900/50 p-1.5 rounded-2xl w-fit">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id); setSearchTerm(''); }}
                            className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-black transition-all duration-200 ${activeTab === tab.id
                                ? 'bg-white dark:bg-indigo-500 text-indigo-600 dark:text-white shadow-lg'
                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                                }`}
                        >
                            <tab.icon size={18} className={activeTab === tab.id ? 'animate-pulse' : ''} />
                            {tab.label}
                            {tab.count > 0 && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === tab.id ? 'bg-indigo-100 dark:bg-white/20 text-indigo-600 dark:text-white' : 'bg-red-500 text-white'}`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className="animate-fade-in">
                    {activeTab === 'overview' && (
                        <div className="space-y-8">
                            {/* Simple Stats Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {[
                                    { label: 'Total Volume', value: stats.total, color: 'indigo', icon: FiMessageSquare },
                                    { label: 'Safe', value: stats.allowed, color: 'emerald', icon: FiCheck },
                                    { label: 'Under Review', value: stats.flagged, color: 'amber', icon: FiFlag },
                                    { label: 'Violations', value: stats.deleted, color: 'red', icon: FiTrash2 },
                                ].map((s, i) => (
                                    <div key={i} className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
                                        <div className={`w-10 h-10 rounded-xl bg-${s.color}-50 dark:bg-${s.color}-500/10 flex items-center justify-center text-${s.color}-500 mb-4`}>
                                            <s.icon size={20} />
                                        </div>
                                        <p className="text-3xl font-black dark:text-white">{s.value}</p>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">{s.label}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Analytics Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 border border-gray-100 dark:border-gray-800">
                                    <h3 className="text-xl font-black mb-8 dark:text-white">Toxicity Distribution</h3>
                                    <div className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={stats.distribution}
                                                    innerRadius={80}
                                                    outerRadius={110}
                                                    paddingAngle={8}
                                                    dataKey="value"
                                                >
                                                    {stats.distribution.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#000', border: 'none', borderRadius: '16px', color: '#fff' }}
                                                    itemStyle={{ color: '#fff' }}
                                                />
                                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 border border-gray-100 dark:border-gray-800">
                                    <h3 className="text-xl font-black mb-8 dark:text-white">Moderation Efficiency</h3>
                                    <div className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={[
                                                { name: 'Allowed', count: stats.allowed },
                                                { name: 'Flagged', count: stats.flagged },
                                                { name: 'Deleted', count: stats.deleted },
                                            ]}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                                                <Tooltip cursor={{ fill: '#88888810' }} contentStyle={{ borderRadius: '12px' }} />
                                                <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={40}>
                                                    <Cell fill={COLORS.allowed} />
                                                    <Cell fill={COLORS.flagged} />
                                                    <Cell fill={COLORS.deleted} />
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'moderation' && (
                        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                            <div className="p-8 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                                <h3 className="text-xl font-black dark:text-white flex items-center gap-3">
                                    <FiFlag className="text-amber-500" />
                                    Review Queue
                                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500 ml-2 py-1 px-3 bg-white dark:bg-black rounded-full border border-gray-100 dark:border-gray-800">
                                        {flagged.length} Pending
                                    </span>
                                </h3>
                            </div>
                            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                {flagged.length > 0 ? flagged.map((c) => (
                                    <CommentCard
                                        key={c.id}
                                        comment={c}
                                        onApprove={() => handleCommentStatus(c.id, 'allowed')}
                                        onReject={() => handleCommentStatus(c.id, 'deleted')}
                                        onDelete={() => handleDeleteComment(c.id)}
                                        loading={actionLoading === c.id}
                                    />
                                )) : (
                                    <div className="py-32 text-center">
                                        <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <FiCheck className="text-emerald-500" size={32} />
                                        </div>
                                        <h4 className="text-xl font-black dark:text-white">Inbox Zero!</h4>
                                        <p className="text-gray-500 font-medium">No comments require moderation at this time.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'feed' && (
                        <div className="space-y-6">
                            <div className="relative max-w-md">
                                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by username or content..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all dark:text-white"
                                />
                            </div>
                            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                                <div className="p-4 bg-gray-50 dark:bg-gray-800/30 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 grid grid-cols-12 gap-4">
                                    <div className="col-span-3">User</div>
                                    <div className="col-span-5">Content</div>
                                    <div className="col-span-2 text-center">Toxicity</div>
                                    <div className="col-span-2 text-right">Action</div>
                                </div>
                                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {filteredComments.map(c => (
                                        <CommentRow
                                            key={c.id}
                                            comment={c}
                                            onUpdate={(s) => handleCommentStatus(c.id, s)}
                                            onDelete={() => handleDeleteComment(c.id)}
                                            loading={actionLoading === c.id}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div className="space-y-6">
                            <div className="relative max-w-md">
                                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Find users..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all dark:text-white"
                                />
                            </div>
                            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                                <div className="p-4 bg-gray-50 dark:bg-gray-800/30 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 grid grid-cols-12 gap-4">
                                    <div className="col-span-4">User Details</div>
                                    <div className="col-span-3">Role</div>
                                    <div className="col-span-2 text-center">Status</div>
                                    <div className="col-span-3 text-right">Actions</div>
                                </div>
                                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {filteredUsers.map(u => (
                                        <UserRow
                                            key={u.id}
                                            user={u}
                                            onToggleStaff={() => handleUserAction(u.id, { is_staff: !u.is_staff })}
                                            onToggleActive={() => handleUserAction(u.id, { is_active: !u.is_active })}
                                            loading={actionLoading === u.id}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Sub-components for cleaner structure
const CommentCard = ({ comment, onApprove, onReject, onDelete, loading }) => (
    <div className="p-8 hover:bg-gray-50 dark:hover:bg-gray-800/20 transition-colors">
        <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-black">
                        {comment.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h5 className="text-sm font-black dark:text-white uppercase tracking-tight">{comment.username}</h5>
                        <div className="flex items-center gap-2 mt-0.5">
                            <FiClock size={10} className="text-gray-400" />
                            <span className="text-[10px] font-bold text-gray-400 uppercase">{new Date(comment.created_at).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
                <p className="text-lg font-medium text-gray-800 dark:text-gray-200 leading-relaxed max-w-2xl italic">
                    "{comment.text}"
                </p>

                {/* Score Pills */}
                <div className="flex flex-wrap gap-2 mt-6">
                    {['toxic', 'severe_toxic', 'obscene', 'threat', 'insult', 'identity_hate'].map(key => (
                        <div key={key} className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${comment[key] > 0.5 ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-gray-100 dark:bg-gray-800 border-transparent text-gray-500'
                            }`}>
                            {key.replace('_', ' ')}: {(comment[key] * 100).toFixed(0)}%
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex md:flex-col items-center justify-center gap-3 shrink-0">
                <button
                    onClick={onApprove} disabled={loading}
                    className="w-full md:w-32 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                    APPROVE
                </button>
                <button
                    onClick={onReject} disabled={loading}
                    className="w-full md:w-32 py-2.5 rounded-xl bg-red-500 text-white text-xs font-black shadow-lg shadow-red-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                    DELETE
                </button>
                <button
                    onClick={onDelete} disabled={loading}
                    className="w-full px-4 py-2 text-[10px] font-black text-gray-400 hover:text-red-500 transition-colors uppercase"
                >
                    Permanent Purge
                </button>
            </div>
        </div>
    </div>
);

const CommentRow = ({ comment, onUpdate, onDelete, loading }) => (
    <div className="p-4 grid grid-cols-12 gap-4 items-center hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
        <div className="col-span-3 flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold">
                {comment.username.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-bold truncate dark:text-gray-300">{comment.username}</span>
        </div>
        <div className="col-span-5 text-sm text-gray-500 truncate italic">
            {comment.text}
        </div>
        <div className="col-span-2 flex justify-center">
            <div className={`w-2 h-2 rounded-full ${comment.toxic > 0.7 ? 'bg-red-500' : comment.toxic > 0.4 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
        </div>
        <div className="col-span-2 flex justify-end gap-2">
            <button onClick={() => onUpdate(comment.status === 'allowed' ? 'flagged' : 'allowed')} className="p-2 hover:bg-indigo-500/10 rounded-lg text-gray-400 hover:text-indigo-500 transition-all">
                {comment.status === 'allowed' ? <FiFlag size={14} /> : <FiCheck size={14} />}
            </button>
            <button onClick={onDelete} className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-500 transition-all">
                <FiTrash2 size={14} />
            </button>
        </div>
    </div>
);

const UserRow = ({ user, onToggleStaff, onToggleActive, loading }) => (
    <div className="p-4 grid grid-cols-12 gap-4 items-center hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
        <div className="col-span-4">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center">
                    <FiUsers className="text-gray-400" size={18} />
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-black dark:text-white truncate">{user.username}</p>
                    <p className="text-[10px] text-gray-400 font-bold truncate">{user.email}</p>
                </div>
            </div>
        </div>
        <div className="col-span-3">
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${user.is_staff ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                {user.is_staff ? 'Admin' : 'Member'}
            </span>
        </div>
        <div className="col-span-2 text-center">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${user.is_active ? 'text-emerald-500' : 'text-red-500'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                {user.is_active ? 'Active' : 'Locked'}
            </div>
        </div>
        <div className="col-span-3 flex justify-end gap-2">
            <button
                onClick={onToggleStaff} disabled={loading}
                title={user.is_staff ? "Demote" : "Promote to Admin"}
                className="p-2.5 bg-gray-50 dark:bg-gray-800 hover:bg-indigo-500 hover:text-white rounded-xl transition-all"
            >
                {user.is_staff ? <FiUserX size={16} /> : <FiUserCheck size={16} />}
            </button>
            <button
                onClick={onToggleActive} disabled={loading}
                title={user.is_active ? "Lock Account" : "Unlock Account"}
                className={`p-2.5 rounded-xl transition-all ${user.is_active ? 'bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white'}`}
            >
                {user.is_active ? <FiTrash2 size={16} /> : <FiCheck size={16} />}
            </button>
            <button className="p-2.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all text-gray-400">
                <FiMoreVertical size={16} />
            </button>
        </div>
    </div>
);

export default AdminDashboard;
