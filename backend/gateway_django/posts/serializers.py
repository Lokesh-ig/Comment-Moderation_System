from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Post, Comment, Profile, Story, Notification, Message, MessageReaction, PostTag, LoginActivity

class UserSerializer(serializers.ModelSerializer):
    password2 = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'password2']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        validated_data.pop('password2', None)
        user = User.objects.create_user(**validated_data)
        return user

class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', required=False, validators=[])
    email = serializers.EmailField(source='user.email', required=False, validators=[])
    follower_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()
    is_staff = serializers.ReadOnlyField(source='user.is_staff')
    is_active = serializers.ReadOnlyField(source='user.is_active')

    class Meta:
        model = Profile
        fields = ['id', 'username', 'email', 'avatar', 'avatar_url', 'bio', 'follower_count', 'following_count', 'is_following', 'is_staff', 'is_active', 'two_factor_enabled']

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', {})
        username = user_data.get('username')
        email = user_data.get('email')
        user = instance.user

        if username and username != user.username:
            if User.objects.filter(username=username).exists():
                raise serializers.ValidationError({"username": "This username is already taken."})
            user.username = username
        
        if email and email != user.email:
            if User.objects.filter(email=email).exists():
                raise serializers.ValidationError({"email": "This email is already in use."})
            user.email = email
        
        user.save()

        instance.bio = validated_data.get('bio', instance.bio)
        instance.two_factor_enabled = validated_data.get('two_factor_enabled', instance.two_factor_enabled)
        if 'avatar' in validated_data:
            instance.avatar = validated_data.get('avatar')
        instance.save()
        return instance

    def get_follower_count(self, obj):
        return obj.followers.count()

    def get_following_count(self, obj):
        return obj.following.count()

    def get_is_following(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            # Check if current user is in the list of profiles following 'obj'
            try:
                return obj.followers.filter(user=request.user).exists()
            except:
                return False
        return False
    
    def get_avatar_url(self, obj):
        if obj.avatar:
            return obj.avatar.url
        return None

class StorySerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')
    avatar_url = serializers.SerializerMethodField()
    tagged_users_data = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()

    class Meta:
        model = Story
        fields = [
            'id', 'user', 'username', 'avatar_url', 'image', 'video', 'is_video', 'caption', 
            'caption_x', 'caption_y',
            'music_title', 'music_artist', 'music_url', 'music_coverart', 'music_start_time', 'music_duration',
            'tagged_users_data', 'likes_count', 'is_liked', 'created_at'
        ]
        extra_kwargs = {
            'user': {'read_only': True},
            'image': {'required': False, 'allow_null': True},
            'video': {'required': False, 'allow_null': True},
        }
    
    def get_avatar_url(self, obj):
        try:
            if obj.user and hasattr(obj.user, 'profile') and obj.user.profile.avatar:
                return obj.user.profile.avatar.url
        except:
            pass
        return None

    def get_tagged_users_data(self, obj):
        tags = obj.tagged_users.all()
        return [{
            'id': u.id,
            'username': u.username,
            'avatar_url': u.profile.avatar.url if hasattr(u, 'profile') and u.profile.avatar else None
        } for u in tags]

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(id=request.user.id).exists()
        return False

class CommentSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')
    avatar_url = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = [
            'id', 'text', 'username', 'avatar_url', 'toxic', 'severe_toxic', 
            'obscene', 'threat', 'insult', 'identity_hate', 
            'status', 'parent', 'created_at', 'likes_count', 'is_liked'
        ]

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(id=request.user.id).exists()
        return False
    
    def get_avatar_url(self, obj):
        try:
            if obj.user and hasattr(obj.user, 'profile') and obj.user.profile.avatar:
                return obj.user.profile.avatar.url
        except:
            pass
        return None

from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        
        # Record Login Activity
        request = self.context.get('request')
        if request:
            try:
                user_agent = request.META.get('HTTP_USER_AGENT', '')
                ip_address = request.META.get('REMOTE_ADDR')
                
                # Basic parsing for browser/os
                LoginActivity.objects.create(
                    user=self.user,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    event_type='login'
                )
            except Exception as e:
                print(f"Failed to record login activity: {e}")

        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'email': self.user.email,
            'is_staff': self.user.is_staff,
        }
        return data

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

class LoginActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = LoginActivity
        fields = ['id', 'ip_address', 'user_agent', 'event_type', 'timestamp']

class PostSerializer(serializers.ModelSerializer):
    author_username = serializers.ReadOnlyField(source='author.username')
    author_avatar_url = serializers.SerializerMethodField()
    comments = serializers.SerializerMethodField()
    comment_count = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    is_saved = serializers.SerializerMethodField()
    tagged_users = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            'id', 'author', 'author_username', 'author_avatar_url', 'location', 'caption', 
            'image', 'created_at', 'comments', 'comment_count', 
            'likes_count', 'is_liked', 'is_saved', 'tagged_users',
            'music_title', 'music_artist', 'music_url', 'music_coverart', 
            'music_start_time', 'music_duration'
        ]
        extra_kwargs = {
            'author': {'read_only': True},
            'image': {'required': False, 'allow_null': True}
        }

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(id=request.user.id).exists()
        return False
    
    def get_comments(self, obj):
        allowed_comments = obj.comments.filter(status='allowed').order_by('-created_at')
        return CommentSerializer(allowed_comments, many=True, context=self.context).data

    def get_comment_count(self, obj):
        return obj.comments.filter(status='allowed').count()

    def get_author_avatar_url(self, obj):
        try:
            if obj.author and hasattr(obj.author, 'profile') and obj.author.profile.avatar:
                return obj.author.profile.avatar.url
        except:
            pass
        return None

    def get_is_saved(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.saved_by.filter(id=request.user.id).exists()
        return False

    def get_tagged_users(self, obj):
        tags = obj.tags.select_related('tagged_user').all()
        return [{
            'id': tag.tagged_user.id,
            'username': tag.tagged_user.username,
            'avatar_url': tag.tagged_user.profile.avatar.url if hasattr(tag.tagged_user, 'profile') and tag.tagged_user.profile.avatar else None
        } for tag in tags]

class NotificationSerializer(serializers.ModelSerializer):
    sender_username = serializers.ReadOnlyField(source='sender.username')
    sender_avatar_url = serializers.SerializerMethodField()
    post_image = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ['id', 'recipient', 'sender', 'sender_username', 'sender_avatar_url', 'notification_type', 'post', 'post_image', 'is_read', 'created_at']

    def get_sender_avatar_url(self, obj):
        try:
            if obj.sender and hasattr(obj.sender, 'profile') and obj.sender.profile.avatar:
                return obj.sender.profile.avatar.url
        except:
            pass
        return None

    def get_post_image(self, obj):
        if obj.post and obj.post.image:
            return obj.post.image.url
        return None

class MessageReactionSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = MessageReaction
        fields = ['id', 'user', 'username', 'emoji', 'created_at']

class MessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.ReadOnlyField(source='sender.username')
    recipient_username = serializers.ReadOnlyField(source='recipient.username')
    sender_avatar_url = serializers.SerializerMethodField()
    recipient_avatar_url = serializers.SerializerMethodField()
    reactions = MessageReactionSerializer(many=True, read_only=True)
    reply_to_data = serializers.SerializerMethodField()
    forwarded_from_data = serializers.SerializerMethodField()
    shared_post_data = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ['id', 'sender', 'sender_username', 'sender_avatar_url', 
                  'recipient', 'recipient_username', 'recipient_avatar_url', 
                  'content', 'attachment', 'gif_url', 'is_read', 'created_at', 'reply_to', 
                  'reactions', 'reply_to_data', 'forwarded_from', 'forwarded_from_data', 'shared_post', 'shared_post_data']
        extra_kwargs = {'sender': {'read_only': True}}

    def get_sender_avatar_url(self, obj):
        try:
            if obj.sender and hasattr(obj.sender, 'profile') and obj.sender.profile.avatar:
                return obj.sender.profile.avatar.url
        except:
            pass
        return None

    def get_recipient_avatar_url(self, obj):
        try:
            if obj.recipient and hasattr(obj.recipient, 'profile') and obj.recipient.profile.avatar:
                return obj.recipient.profile.avatar.url
        except:
            pass
        return None

    def get_reply_to_data(self, obj):
        if obj.reply_to:
            return {
                'id': obj.reply_to.id,
                'content': obj.reply_to.content[:100] if obj.reply_to.content else None,
                'sender_username': obj.reply_to.sender.username,
            }
        return None

    def get_forwarded_from_data(self, obj):
        if obj.forwarded_from:
            return {
                'id': obj.forwarded_from.id,
                'content': obj.forwarded_from.content[:100] if obj.forwarded_from.content else None,
                'sender_username': obj.forwarded_from.sender.username,
            }
        return None

    def get_shared_post_data(self, obj):
        if obj.shared_post:
            post = obj.shared_post
            return {
                'id': post.id,
                'author_username': post.author.username,
                'author_avatar_url': post.author.profile.avatar.url if hasattr(post.author, 'profile') and post.author.profile.avatar else None,
                'image': post.image.url if post.image else None,
                'caption': post.caption[:100] if post.caption else None,
            }
        return None

