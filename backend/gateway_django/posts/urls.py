from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView, ProfileViewSet, StoryViewSet, 
    PostListView, UserSearchView, create_comment, delete_own_comment,
    get_allowed_comments, get_flagged_comments, 
    toggle_like, toggle_comment_like, manage_comment,
    moderation_stats, get_all_comments, get_all_users, manage_user,
    delete_post, toggle_save, get_saved_posts,
    get_notifications, mark_notification_read, get_unread_count,
    get_conversations, get_messages, send_message, delete_message,
    mark_all_notifications_read,
    react_to_message, forward_message,
    delete_conversation, mark_conversation_unread,
    get_tagged_posts, LoginActivityListView, logout_view
)

router = DefaultRouter()
router.register(r'profiles', ProfileViewSet, basename='profile')
router.register(r'stories', StoryViewSet, basename='story')

urlpatterns = [
    path("", include(router.urls)),
    path("register/", RegisterView.as_view(), name="register"),
    path("posts/", PostListView.as_view(), name="posts"),
    path("posts/<int:pk>/like/", toggle_like, name="toggle-like"),
    path("posts/<int:pk>/delete/", delete_post, name="delete-post"),
    path("posts/<int:pk>/save/", toggle_save, name="toggle-save"),
    path("posts/saved/", get_saved_posts, name="saved-posts"),
    path('posts/tagged/<str:username>/', get_tagged_posts, name='get_tagged_posts'),
    path("notifications/", get_notifications, name="notifications"),
    path("notifications/<int:pk>/read/", mark_notification_read, name="mark-read"),
    path("notifications/unread-count/", get_unread_count, name="unread-count"),
    path("notifications/mark-all-read/", mark_all_notifications_read, name="mark-all-read"),
    path("search/", UserSearchView.as_view(), name="search-users"),
    path("comment/", create_comment, name="create-comment"),
    path("comment/<int:pk>/like/", toggle_comment_like, name="toggle-comment-like"),
    path("comment/<int:pk>/delete/", delete_own_comment, name="delete-own-comment"),
    path('allowed-comments/', get_allowed_comments, name='allowed-comments'),
    path('flagged-comments/', get_flagged_comments, name='flagged-comments'),
    path('all-comments/', get_all_comments, name='all-comments'),
    path('admin/users/', get_all_users, name='admin-users'),
    path('admin/users/<int:pk>/', manage_user, name='manage-user'),
    path('moderation-stats/', moderation_stats, name='moderation-stats'),
    path('comment/<int:pk>/', manage_comment, name='manage-comment'),
    path('messages/conversations/', get_conversations, name='conversations'),
    path('messages/<str:username>/', get_messages, name='messages'),
    path('messages/<str:username>/send/', send_message, name='send-message'),
    path('messages/react/<int:pk>/', react_to_message, name='react-message'),
    path('messages/forward/<int:pk>/', forward_message, name='forward-message'),
    path('messages/<int:pk>/delete_message/', delete_message, name='delete-message-individual'),
    path('messages/<str:username>/delete/', delete_conversation, name='delete-conversation'),
    path('messages/<str:username>/mark-unread/', mark_conversation_unread, name='mark-unread'),
    path('login-activity/', LoginActivityListView.as_view(), name='login_activity'),
    path('logout/', logout_view, name='logout'),
]
