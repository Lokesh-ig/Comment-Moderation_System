import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { FiMessageCircle, FiLoader, FiUser } from 'react-icons/fi';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';
import CreatePost from './components/CreatePost';
import { useState, useEffect } from 'react';
import { getConversations } from './services/api';

// Lazy load heavy components
const Profile = lazy(() => import('./pages/Profile'));
const Notifications = lazy(() => import('./pages/Notifications'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Messages = lazy(() => import('./pages/Messages'));

const FloatingMessagesPill = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [recentChats, setRecentChats] = useState([]);
  const hideOnPaths = ['/login', '/register', '/messages'];

  useEffect(() => {
    if (user && !hideOnPaths.includes(location.pathname)) {
      getConversations()
        .then((res) => setRecentChats(res.data.slice(0, 3)))
        .catch((err) => console.error(err));
    }
  }, [user, location.pathname]);

  if (hideOnPaths.includes(location.pathname)) return null;

  return (
    <div className="fixed bottom-6 right-8 z-[50] hidden md:block">
      <Link to="/messages" className="flex items-center gap-2 bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-full px-5 py-2.5 shadow-xl hover:shadow-2xl transition-all active:scale-95 group">
        <FiMessageCircle size={22} className="text-indigo-500" />
        <span className="text-sm font-bold dark:text-white">Messages</span>
        {recentChats.length > 0 ? (
          <div className="flex -space-x-2 ml-2">
            {recentChats.map((chat, idx) => (
              <div key={idx} className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-950 bg-gray-200 dark:bg-gray-800 overflow-hidden flex items-center justify-center shrink-0">
                {chat.avatar_url ? (
                  <img src={chat.avatar_url} alt={chat.username} className="w-full h-full object-cover" />
                ) : (
                  <FiUser size={10} className="text-gray-500" />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex -space-x-2 ml-2">
            <div className="w-5 h-5 rounded-full bg-yellow-400 border-2 border-white dark:border-gray-950" />
            <div className="w-5 h-5 rounded-full bg-orange-500 border-2 border-white dark:border-gray-950" />
            <div className="w-5 h-5 rounded-full bg-indigo-500 border-2 border-white dark:border-gray-950" />
          </div>
        )}
      </Link>
    </div>
  );
};

const LoadingFallback = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50 dark:bg-black transition-colors">
    <div className="w-12 h-12 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
    <p className="text-[10px] text-gray-400 font-black tracking-[0.3em] uppercase animate-pulse">Initializing Interface</p>
  </div>
);

const AppContent = () => {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const handleToggleCreate = () => setShowCreateModal(true);
    window.addEventListener('toggle-create-post', handleToggleCreate);
    return () => window.removeEventListener('toggle-create-post', handleToggleCreate);
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-black transition-colors text-gray-900 dark:text-gray-100 selection:bg-indigo-500/30">
      {!isAuthPage && <Sidebar />}

      {/* Main Content Area - Shifted to account for fixed 16-unit sidebar */}
      <main
        style={{ paddingLeft: isAuthPage ? '0' : '4rem' }}
        className="flex-1 min-w-0 min-h-screen overflow-x-hidden transition-all duration-300"
      >
        <div className={`${isAuthPage ? 'w-full' : 'w-full max-w-7xl mx-auto flex justify-center px-0 sm:px-4'} min-h-screen`}>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Home />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile/:username?"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/messages"
                element={
                  <ProtectedRoute>
                    <div className="w-full"><Messages /></div>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <Notifications />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <FloatingMessagesPill />
        </div>
      </main>

      {/* Global Post Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="relative w-full max-w-[500px] animate-scale-in">
            <CreatePost
              onPostCreated={() => {
                setShowCreateModal(false);
                // Refresh home if visiting
                if (window.location.pathname === '/') {
                  window.dispatchEvent(new CustomEvent('refresh-posts'));
                }
              }}
              onClose={() => setShowCreateModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
};

export default App;
