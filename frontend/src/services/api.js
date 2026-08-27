import axios from 'axios';

const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'https://comment-moderation.up.railway.app/api',
});

// Attach JWT token to every request
API.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 responses
API.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// Auth
export const loginUser = (credentials) => API.post('/login/', credentials);
export const registerUser = (data) => API.post('/register/', data);
export const getLoginActivity = () => API.get('/login-activity/');
export const logoutRecord = () => API.post('/logout/');

// Profiles (lookup by username)
export const getMyProfile = () => API.get('/profiles/me/');
export const getProfile = (username) => API.get(`/profiles/${username}/`);
export const updateProfile = (username, data) => API.patch(`/profiles/${username}/`, data);
export const changePassword = (data) => API.post('/profiles/change_password/', data);
export const followUser = (username) => API.post(`/profiles/${username}/follow/`);
export const getFollowers = (username) => API.get(`/profiles/${username}/followers/`);
export const getFollowing = (username) => API.get(`/profiles/${username}/following/`);
export const searchUsers = (query) => API.get(`/search/?q=${query}`);

// Stories
export const getStories = () => API.get('/stories/');
export const postStory = (formData) => API.post('/stories/', formData);
export const deleteStory = (storyId) => API.delete(`/stories/${storyId}/`);
export const likeStory = (storyId) => API.post(`/stories/${storyId}/like/`);
export const replyToStory = (storyId, content) => API.post(`/stories/${storyId}/reply/`, { content });

// Posts
export const getPosts = () => API.get('/posts/');
export const createPost = (formData) => API.post('/posts/', formData);
export const updatePost = (postId, data) => API.patch(`/posts/${postId}/`, data);
export const toggleLike = (postId) => API.post(`/posts/${postId}/like/`);
export const deletePost = (postId) => API.delete(`/posts/${postId}/delete/`);
export const toggleSave = (postId) => API.post(`/posts/${postId}/save/`);
export const getSavedPosts = () => API.get('/posts/saved/');
export const getTaggedPosts = (username) => API.get(`/posts/tagged/${username}/`);

// Comments
export const postComment = (data) => API.post('/comment/', data);
export const toggleCommentLike = (commentId) => API.post(`/comment/${commentId}/like/`);
export const deleteComment = (commentId) => API.delete(`/comment/${commentId}/delete/`);
export const getAllowedComments = () => API.get('/allowed-comments/');
export const getFlaggedComments = () => API.get('/flagged-comments/');
export const getModerationStats = () => API.get('/moderation-stats/');
export const getAllComments = () => API.get('/all-comments/');
export const getAllUsers = () => API.get('/admin/users/');
export const manageUser = (userId, data) => API.patch(`/admin/users/${userId}/`, data);

// Notifications
export const getNotifications = () => API.get('/notifications/');
export const markNotificationRead = (id) => API.post(`/notifications/${id}/read/`);
export const getUnreadCount = () => API.get('/notifications/unread-count/');
export const markAllNotificationsRead = () => API.post('/notifications/mark-all-read/');

// Messaging
export const getConversations = () => API.get('/messages/conversations/');
export const getMessages = (username) => API.get(`/messages/${username}/`);
export const sendMessage = (username, formData) => API.post(`/messages/${username}/send/`, formData);
export const reactToMessage = (messageId, emoji) => API.post(`/messages/react/${messageId}/`, { emoji });
export const forwardMessage = (messageId, username) => API.post(`/messages/forward/${messageId}/`, { username });
export const deleteConversation = (username) => API.delete(`/messages/${username}/delete/`);
export const markConversationUnread = (username) => API.post(`/messages/${username}/mark-unread/`);
export const deleteMessage = (messageId) => API.delete(`/messages/${messageId}/delete_message/`);

export default API;
