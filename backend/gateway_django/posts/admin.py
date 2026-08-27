from django.contrib import admin
from .models import (
    Profile, Story, Post, Comment, Notification, 
    Message, MessageReaction, PostTag, LoginActivity
)

@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'two_factor_enabled']
    search_fields = ['user__username', 'bio']

@admin.register(Story)
class StoryAdmin(admin.ModelAdmin):
    list_display = ['user', 'created_at', 'is_video', 'caption']
    search_fields = ['user__username', 'caption']
    list_filter = ['created_at', 'is_video']

@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ['author', 'location', 'created_at']
    search_fields = ['author__username', 'caption', 'location']
    list_filter = ['created_at']

@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ['user', 'post', 'text', 'status', 'created_at']
    search_fields = ['user__username', 'text']
    list_filter = ['status', 'created_at']
    actions = ['approve_comments', 'flag_comments', 'delete_comments']

    @admin.action(description='Set selected comments to Allowed')
    def approve_comments(self, request, queryset):
        updated = queryset.update(status='allowed')
        self.message_user(request, f"{updated} comment(s) successfully marked as allowed.")

    @admin.action(description='Set selected comments to Flagged')
    def flag_comments(self, request, queryset):
        updated = queryset.update(status='flagged')
        self.message_user(request, f"{updated} comment(s) successfully marked as flagged.")

    @admin.action(description='Set selected comments to Deleted')
    def delete_comments(self, request, queryset):
        updated = queryset.update(status='deleted')
        self.message_user(request, f"{updated} comment(s) successfully marked as deleted.")

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['recipient', 'sender', 'notification_type', 'is_read', 'created_at']
    list_filter = ['notification_type', 'is_read', 'created_at']
    search_fields = ['recipient__username', 'sender__username']

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['sender', 'recipient', 'is_read', 'created_at']
    list_filter = ['is_read', 'created_at']
    search_fields = ['sender__username', 'recipient__username', 'content']

@admin.register(MessageReaction)
class MessageReactionAdmin(admin.ModelAdmin):
    list_display = ['user', 'message', 'emoji', 'created_at']

@admin.register(PostTag)
class PostTagAdmin(admin.ModelAdmin):
    list_display = ['post', 'tagged_user', 'created_at']

@admin.register(LoginActivity)
class LoginActivityAdmin(admin.ModelAdmin):
    list_display = ['user', 'event_type', 'ip_address', 'device', 'timestamp']
    list_filter = ['event_type', 'timestamp']
    search_fields = ['user__username', 'ip_address']
