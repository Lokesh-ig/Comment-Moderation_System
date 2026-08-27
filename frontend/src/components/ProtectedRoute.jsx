import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, adminOnly = false }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin-slow" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (adminOnly && !user.is_staff) {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;
