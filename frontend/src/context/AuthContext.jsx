import { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, registerUser, getMyProfile } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [savedAccounts, setSavedAccounts] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('saved_accounts') || '[]');
        } catch { return []; }
    });

    const saveAccountToList = (userObj, token) => {
        if (!userObj?.username || !token) return;
        setSavedAccounts(prev => {
            const filtered = prev.filter(a => a.username !== userObj.username);
            const updated = [...filtered, {
                username: userObj.username,
                avatar_url: userObj.avatar_url || null,
                access_token: token
            }];
            localStorage.setItem('saved_accounts', JSON.stringify(updated));
            return updated;
        });
    };

    const removeAccountFromList = (username) => {
        setSavedAccounts(prev => {
            const updated = prev.filter(a => a.username !== username);
            localStorage.setItem('saved_accounts', JSON.stringify(updated));
            return updated;
        });
    };

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        const savedUser = localStorage.getItem('user');
        if (token && savedUser) {
            try {
                const parsed = JSON.parse(savedUser);
                setUser(parsed);
                refreshProfile(); // Sync latest data (is_staff, etc)
            } catch {
                localStorage.removeItem('user');
                localStorage.removeItem('access_token');
            }
        }
        setLoading(false);
    }, []);

    const login = async (credentials) => {
        const res = await loginUser(credentials);
        const { access, user: userData } = res.data;
        localStorage.setItem('access_token', access);
        const userObj = userData || { username: credentials.username };
        localStorage.setItem('user', JSON.stringify(userObj));
        setUser(userObj);
        return res;
    };

    const register = async (data) => {
        const res = await registerUser(data);
        return res;
    };

    const logout = () => {
        const currentUser = user?.username;
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        setUser(null);
        if (currentUser) removeAccountFromList(currentUser);
    };

    const switchAccount = (account) => {
        // Save current account first
        const currentToken = localStorage.getItem('access_token');
        if (user && currentToken) {
            saveAccountToList(user, currentToken);
        }
        // Switch to selected account
        localStorage.setItem('access_token', account.access_token);
        const userObj = { username: account.username, avatar_url: account.avatar_url };
        localStorage.setItem('user', JSON.stringify(userObj));
        setUser(userObj);
        refreshProfile();
    };

    const refreshProfile = async () => {
        try {
            const res = await getMyProfile();
            const profileData = res.data;
            // Merge profile data with existing user data to preserve is_staff from login
            const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
            const mergedUser = { ...currentUser, ...profileData };
            // Ensure is_staff is never lost
            if (currentUser.is_staff !== undefined) {
                mergedUser.is_staff = currentUser.is_staff || profileData.is_staff;
            }
            localStorage.setItem('user', JSON.stringify(mergedUser));
            setUser(mergedUser);
            // Update saved accounts list with fresh data
            const token = localStorage.getItem('access_token');
            if (token) saveAccountToList(mergedUser, token);
        } catch (err) {
            console.error('Failed to refresh profile', err);
            if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('user');
                setUser(null);
            }
        }
    };

    return (
        <AuthContext.Provider
            value={{ user, loading, login, register, logout, refreshProfile, savedAccounts, switchAccount }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
