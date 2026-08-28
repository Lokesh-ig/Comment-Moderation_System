from rest_framework import status, permissions, generics, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth.models import User
from django.db.models import Q
from .models import Post, Comment, Profile, Story, Notification, PostTag, Message, MessageReaction, LoginActivity
from .serializers import (
    UserSerializer, PostSerializer, CommentSerializer, 
    ProfileSerializer, StorySerializer, NotificationSerializer,
    MessageSerializer, LoginActivitySerializer
)
import requests
import os
from .moderation_utils import fallback_moderate, MODERATE_BAD_WORDS_PATTERN, SEVERE_BAD_WORDS_PATTERN

class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        # Profile object has a 'user' field, Post has 'author'
        if hasattr(obj, 'user'):
            return obj.user == request.user
        if hasattr(obj, 'author'):
            return obj.author == request.user
        return False

AI_SERVICE_URL = os.environ.get("AI_SERVICE_URL", "http://127.0.0.1:5000/predict")

# Auth Views
class RegisterView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            try:
                user = serializer.save()
                return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# Profile & Story Views
class ProfileViewSet(viewsets.ModelViewSet):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    lookup_field = 'user__username'

    def get_object(self):
        if self.kwargs.get('user__username') == 'me' or self.kwargs.get('user__username') == self.request.user.username:
            profile, created = Profile.objects.get_or_create(user=self.request.user)
            return profile
        return super().get_object()

    def get_permissions(self):
        if self.action in ['follow', 'followers', 'following']:
            return [permissions.IsAuthenticated()]
        return super().get_permissions()

    @action(detail=True, methods=['POST'])
    def follow(self, request, user__username=None):
        profile_to_follow = self.get_object()
        user_profile = request.user.profile
        
        if profile_to_follow == user_profile:
            return Response({"error": "You cannot follow yourself"}, status=status.HTTP_400_BAD_REQUEST)

        if user_profile.following.filter(id=profile_to_follow.id).exists():
            user_profile.following.remove(profile_to_follow)
            followed = False
        else:
            user_profile.following.add(profile_to_follow)
            followed = True
            # Trigger notification
            Notification.objects.create(
                recipient=profile_to_follow.user,
                sender=request.user,
                notification_type='follow'
            )
        
        return Response({"followed": followed, "followers_count": profile_to_follow.followers.count()})

    @action(detail=True, methods=['GET'])
    def followers(self, request, user__username=None):
        profile = self.get_object()
        followers = profile.followers.all()
        serializer = self.get_serializer(followers, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['GET'])
    def following(self, request, user__username=None):
        profile = self.get_object()
        following = profile.following.all()
        serializer = self.get_serializer(following, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['GET'])
    def me(self, request):
        profile, created = Profile.objects.get_or_create(user=request.user)
        serializer = self.get_serializer(profile)
        return Response(serializer.data)

    @action(detail=False, methods=['POST'])
    def change_password(self, request):
        user = request.user
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')

        if not old_password or not new_password:
            return Response({"error": "Both old and new password are required."}, status=status.HTTP_400_BAD_REQUEST)

        if not user.check_password(old_password):
            return Response({"error": "Incorrect old password."}, status=status.HTTP_400_BAD_REQUEST)

        if len(new_password) < 8:
            return Response({"error": "New password must be at least 8 characters long."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        return Response({"message": "Password updated successfully."})

class StoryViewSet(viewsets.ModelViewSet):
    serializer_class = StorySerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]

    def get_queryset(self):
        from django.utils import timezone
        from datetime import timedelta
        time_threshold = timezone.now() - timedelta(hours=24)
        
        user = self.request.user
        if hasattr(user, 'profile'):
            following_ids = user.profile.following.values_list('user_id', flat=True)
            return Story.objects.filter(
                (Q(user_id__in=following_ids) | Q(user_id=user.id)),
                created_at__gte=time_threshold
            )
        return Story.objects.filter(user=user, created_at__gte=time_threshold)

    def get_permissions(self):
        if self.action in ['like', 'reply']:
            return [permissions.IsAuthenticated()]
        return super().get_permissions()

    def perform_create(self, serializer):
        from .moderation_utils import fallback_moderate
        caption = self.request.data.get('caption', '')
        
        # Moderate caption if present
        status_val = 'allowed'
        scores = {"toxic": 0.0, "severe_toxic": 0.0, "obscene": 0.0, "threat": 0.0, "insult": 0.0, "identity_hate": 0.0}
        
        if caption:
            try:
                # Use AI_SERVICE_URL relative to where it's defined (usually at top of views.py)
                response = requests.post(AI_SERVICE_URL, json={"text": caption}, timeout=5)
                if response.status_code == 200:
                    scores = response.json()
                    toxic_score = scores.get("toxic", 0.0)
                    status_val = "deleted" if toxic_score > 0.7 else "flagged" if toxic_score > 0.4 else "allowed"
                else:
                    status_val, scores = fallback_moderate(caption)
            except Exception:
                status_val, scores = fallback_moderate(caption)
        
        if status_val == 'deleted':
             raise serializers.ValidationError({"caption": "This caption contains offensive content and cannot be posted."})

        story = serializer.save(user=self.request.user)

        # Tagged users logic (restored)
        tagged_usernames = self.request.data.get('tagged_users', '')
        if tagged_usernames:
            import json
            try:
                usernames = json.loads(tagged_usernames) if isinstance(tagged_usernames, str) else tagged_usernames
            except (json.JSONDecodeError, TypeError):
                usernames = [u.strip() for u in tagged_usernames.split(',') if u.strip()]
            for username in usernames:
                try:
                    tagged_user = User.objects.get(username=username)
                    story.tagged_users.add(tagged_user)
                    if tagged_user != self.request.user:
                        Notification.objects.create(
                            recipient=tagged_user,
                            sender=self.request.user,
                            notification_type='tag',
                            story=story
                        )
                except User.DoesNotExist:
                    pass

    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        story = self.get_object()
        user = request.user
        if story.likes.filter(id=user.id).exists():
            story.likes.remove(user)
            liked = False
        else:
            story.likes.add(user)
            liked = True
            if story.user != user:
                Notification.objects.create(
                    recipient=story.user,
                    sender=user,
                    notification_type='story_like',
                    story=story
                )
        return Response({'liked': liked, 'likes_count': story.likes.count()})

    @action(detail=True, methods=['post'])
    def reply(self, request, pk=None):
        story = self.get_object()
        user = request.user
        content = request.data.get('content')
        if not content:
            return Response({'error': 'Content is required'}, status=400)
            
        # Create a message as a reply to the story
        message = Message.objects.create(
            sender=user,
            recipient=story.user,
            content=content,
            story_reply=story
        )
        
        # Notify the story owner
        Notification.objects.create(
            recipient=story.user,
            sender=user,
            notification_type='story_reply',
            story=story
        )
        
        return Response({'status': 'reply sent', 'message_id': message.id})

class UserSearchView(generics.ListAPIView):
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        query = self.request.query_params.get('q', '').strip()
        if query:
            return Profile.objects.filter(
                Q(user__username__icontains=query) | Q(user__email__icontains=query)
            ).exclude(user=self.request.user)
        # If no query provided, return all registered user accounts
        return Profile.objects.exclude(user=self.request.user).order_by('-user__date_joined')

# Post Views
class PostListView(generics.ListCreateAPIView):
    serializer_class = PostSerializer
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated:
            if hasattr(user, 'profile'):
                following_ids = user.profile.following.values_list('user_id', flat=True)
                # Show posts from following OR own posts
                return Post.objects.filter(Q(author_id__in=following_ids) | Q(author_id=user.id)).order_by('-created_at')
            return Post.objects.filter(author=user).order_by('-created_at')
        return Post.objects.all().order_by('-created_at')

    def perform_create(self, serializer):
        post = serializer.save(author=self.request.user)
        # Handle tagged users
        tagged_usernames = self.request.data.get('tagged_users', '')
        if tagged_usernames:
            import json
            try:
                usernames = json.loads(tagged_usernames) if isinstance(tagged_usernames, str) else tagged_usernames
            except (json.JSONDecodeError, TypeError):
                usernames = [u.strip() for u in tagged_usernames.split(',') if u.strip()]
            for username in usernames:
                try:
                    tagged_user = User.objects.get(username=username)
                    PostTag.objects.get_or_create(post=post, tagged_user=tagged_user)
                    # Send notification
                    if tagged_user != self.request.user:
                        Notification.objects.create(
                            recipient=tagged_user,
                            sender=self.request.user,
                            notification_type='tag',
                            post=post
                        )
                except User.DoesNotExist:
                    pass

# Comment Views (keeping existing logic)
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_comment(request):
    text = request.data.get("text")
    post_id = request.data.get("post_id") 
    parent_id = request.data.get("parent_id")
    
    if not text:
        return Response({"error": "Text is required"}, status=status.HTTP_400_BAD_REQUEST)

    if not post_id:
        return Response({"error": "Post ID is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        post = Post.objects.get(id=post_id)
    except Post.DoesNotExist:
        return Response({"error": "Post not found"}, status=status.HTTP_404_NOT_FOUND)

    parent_comment = None
    if parent_id:
        try:
            parent_comment = Comment.objects.get(id=parent_id)
        except Comment.DoesNotExist:
            return Response({"error": "Parent comment not found"}, status=status.HTTP_404_NOT_FOUND)

    # 1. Try direct in-process PyTorch model prediction first
    from .ai_loader import get_direct_prediction
    scores = get_direct_prediction(text)
    
    # 2. Fallback to HTTP endpoints if direct prediction unavailable
    if not scores:
        service_urls = [
            os.environ.get("AI_SERVICE_URL"),
            "http://127.0.0.1:5000/predict",
            "http://localhost:5000/predict",
            "https://comment-moderationsystem-production.up.railway.app/predict",
            "http://comment-moderationsystem.railway.internal:5000/predict",
            "https://lokesh1525-comment-moderation-api.hf.space/predict",
            "https://lokesh1525-comment-moderation-api.hf.space/api/predict"
        ]
        for url in service_urls:
            if not url:
                continue
            try:
                if "hf.space" in url:
                    target_url = url if ("/call/predict" in url or "/api/predict" in url) else f"{url.rstrip('/')}/api/predict"
                    resp = requests.post(target_url, json={"data": [text]}, timeout=5)
                    res_json = resp.json()
                    if isinstance(res_json, dict):
                        data = res_json.get("data", [])
                        if isinstance(data, list) and len(data) > 0:
                            scores = data[0] if isinstance(data[0], dict) else res_json
                        else:
                            scores = res_json
                else:
                    resp = requests.post(url, json={"text": text}, timeout=5)
                    if resp.status_code == 200:
                        scores = resp.json()
                if scores and isinstance(scores, dict) and "toxic" in scores:
                    break
            except Exception:
                continue

    fallback_status, fallback_scores = fallback_moderate(text)

    if not scores or not isinstance(scores, dict):
        scores = fallback_scores
        status_val = fallback_status
    else:
        scores_list = [
            float(scores.get("toxic", 0.0)),
            float(scores.get("severe_toxic", 0.0)),
            float(scores.get("obscene", 0.0)),
            float(scores.get("threat", 0.0)),
            float(scores.get("insult", 0.0)),
            float(scores.get("identity_hate", 0.0))
        ]
        max_score = max(scores_list)
        
        if fallback_status == "deleted" or max_score >= 0.7:
            status_val = "deleted"
        elif fallback_status == "flagged" or max_score >= 0.4:
            status_val = "flagged"
        else:
            status_val = "allowed"

    comment = Comment.objects.create(
        text=text, user=request.user, post=post, status=status_val,
        parent=parent_comment,
        toxic=scores.get("toxic", 0.0), severe_toxic=scores.get("severe_toxic", 0.0),
        obscene=scores.get("obscene", 0.0), threat=scores.get("threat", 0.0),
        insult=scores.get("insult", 0.0), identity_hate=scores.get("identity_hate", 0.0)
    )

    # Trigger notification if not own post
    if post.author != request.user:
        Notification.objects.create(
            recipient=post.author,
            sender=request.user,
            notification_type='comment',
            post=post
        )
    
    # Trigger notification for parent comment author if it exists and is a different person
    if parent_comment and parent_comment.user and parent_comment.user != request.user:
        Notification.objects.create(
            recipient=parent_comment.user,
            sender=request.user,
            notification_type='comment',
            post=post
        )

    return Response({"message": "Comment processed", "status": status_val, "scores": scores, "comment": CommentSerializer(comment).data})

@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def delete_own_comment(request, pk):
    try:
        comment = Comment.objects.get(pk=pk)
    except Comment.DoesNotExist:
        return Response({"error": "Comment not found"}, status=status.HTTP_404_NOT_FOUND)

    # Allow: comment author, post author, or staff
    if comment.user != request.user and comment.post.author != request.user and not request.user.is_staff:
        return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)

    comment.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['GET'])
def get_allowed_comments(request):
    comments = Comment.objects.filter(status='allowed').order_by('-created_at')
    return Response(CommentSerializer(comments, many=True).data)

@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def get_flagged_comments(request):
    comments = Comment.objects.filter(status='flagged').order_by('-created_at')
    return Response(CommentSerializer(comments, many=True).data)

@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def get_all_comments(request):
    comments = Comment.objects.all().order_by('-created_at')
    return Response(CommentSerializer(comments, many=True).data)

@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def get_all_users(request):
    users = User.objects.all().order_by('-date_joined')
    return Response(UserSerializer(users, many=True).data)

@api_view(['PATCH', 'DELETE'])
@permission_classes([permissions.IsAdminUser])
def manage_user(request, pk):
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist: return Response(status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'PATCH':
        if 'is_active' in request.data:
            user.is_active = request.data['is_active']
        if 'is_staff' in request.data:
            user.is_staff = request.data['is_staff']
        user.save()
        return Response(UserSerializer(user).data)
    elif request.method == 'DELETE':
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def moderation_stats(request):
    total = Comment.objects.count()
    allowed = Comment.objects.filter(status='allowed').count()
    flagged = Comment.objects.filter(status='flagged').count()
    deleted = Comment.objects.filter(status='deleted').count()
    
    return Response({
        "total": total,
        "allowed": allowed,
        "flagged": flagged,
        "deleted": deleted,
        "distribution": [
            {"name": "Allowed", "value": allowed, "color": "#10b981"},
            {"name": "Flagged", "value": flagged, "color": "#f59e0b"},
            {"name": "Deleted", "value": deleted, "color": "#ef4444"},
        ]
    })

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def toggle_like(request, pk):
    try:
        post = Post.objects.get(pk=pk)
    except Post.DoesNotExist: return Response(status=status.HTTP_404_NOT_FOUND)
    if post.likes.filter(id=request.user.id).exists():
        post.likes.remove(request.user); liked = False
    else:
        post.likes.add(request.user); liked = True
        # Trigger notification if not own post
        if post.author != request.user:
            Notification.objects.create(
                recipient=post.author,
                sender=request.user,
                notification_type='like',
                post=post
            )
    return Response({"liked": liked, "likes_count": post.likes.count()})

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def toggle_comment_like(request, pk):
    try:
        comment = Comment.objects.get(pk=pk)
    except Comment.DoesNotExist: return Response(status=status.HTTP_404_NOT_FOUND)
    if comment.likes.filter(id=request.user.id).exists():
        comment.likes.remove(request.user); liked = False
    else:
        comment.likes.add(request.user); liked = True
    return Response({"liked": liked, "likes_count": comment.likes.count()})

@api_view(['PATCH', 'DELETE'])
@permission_classes([permissions.IsAdminUser])
def manage_comment(request, pk):
    try:
        comment = Comment.objects.get(pk=pk)
    except Comment.DoesNotExist: return Response(status=status.HTTP_404_NOT_FOUND)
    if request.method == 'PATCH':
        new_status = request.data.get('status')
        if new_status in ['allowed', 'flagged', 'deleted']:
            comment.status = new_status; comment.save()
            return Response(CommentSerializer(comment).data)
        return Response({"error": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST)
    elif request.method == 'DELETE':
        comment.delete(); return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def delete_post(request, pk):
    try:
        post = Post.objects.get(pk=pk)
    except Post.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    
    # Strict check: must be author OR staff
    if post.author != request.user and not request.user.is_staff:
        return Response(
            {"error": "Permission denied. You are not the author of this post."}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    post.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def toggle_save(request, pk):
    try:
        post = Post.objects.get(pk=pk)
    except Post.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    if post.saved_by.filter(id=request.user.id).exists():
        post.saved_by.remove(request.user)
        saved = False
    else:
        post.saved_by.add(request.user)
        saved = True
    return Response({"saved": saved})

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_saved_posts(request):
    posts = Post.objects.filter(saved_by=request.user).order_by('-created_at')
    serializer = PostSerializer(posts, many=True, context={'request': request})
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_tagged_posts(request, username):
    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response({'detail': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
    posts = Post.objects.filter(tags__tagged_user=user).order_by('-created_at')
    serializer = PostSerializer(posts, many=True, context={'request': request})
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_notifications(request):
    notifications = Notification.objects.filter(recipient=request.user)
    serializer = NotificationSerializer(notifications, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def mark_notification_read(request, pk):
    try:
        notification = Notification.objects.get(pk=pk, recipient=request.user)
        notification.is_read = True
        notification.save()
        return Response({"status": "read"})
    except Notification.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_unread_count(request):
    count = Notification.objects.filter(recipient=request.user, is_read=False).count()
    return Response({"unread_count": count})

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def mark_all_notifications_read(request):
    Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
    return Response({"status": "all_read"})

# Messaging Views
from django.db.models import Max
from .models import Message
from .serializers import MessageSerializer

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_conversations(request):
    user = request.user
    # Get all users the current user has exchanged messages with
    messages = Message.objects.filter(Q(sender=user) | Q(recipient=user))
    
    contacts = set()
    for msg in messages:
        if msg.sender == user:
            contacts.add(msg.recipient)
        else:
            contacts.add(msg.sender)
            
    # Also include followed users as potential contacts
    if hasattr(user, 'profile'):
        for followed in user.profile.following.all():
            contacts.add(followed.user)
            
    conversations = []
    for contact in contacts:
        # Get latest message
        latest_msg = Message.objects.filter(
            (Q(sender=user, recipient=contact) | Q(sender=contact, recipient=user))
        ).order_by('-created_at').first()
        
        unread_count = Message.objects.filter(sender=contact, recipient=user, is_read=False).count()
        
        contact_data = {
            'id': contact.id,
            'username': contact.username,
            'avatar_url': contact.profile.avatar.url if hasattr(contact, 'profile') and contact.profile.avatar else None,
            'latest_message': MessageSerializer(latest_msg).data if latest_msg else None,
            'unread_count': unread_count
        }
        conversations.append(contact_data)
        
    # Sort by latest message date (or fallback)
    conversations.sort(
        key=lambda x: x['latest_message']['created_at'] if x['latest_message'] else '1970-01-01T00:00:00Z', 
        reverse=True
    )
    
    return Response(conversations)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_messages(request, username):
    try:
        contact = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
        
    user = request.user
    
    # Check if they follow each other (or at least one way depending on policy, we allow if following)
    # If the user wants to DM followers/following, we can enforce it here
    if hasattr(user, 'profile'):
        follows_contact = user.profile.following.filter(user=contact).exists()
        contact_follows_user = contact.profile.following.filter(user=user).exists() if hasattr(contact, 'profile') else False
        
        if not follows_contact and not contact_follows_user:
            return Response({"error": "You must follow each other to send messages."}, status=status.HTTP_403_FORBIDDEN)
            
    messages = Message.objects.filter(
        (Q(sender=user, recipient=contact) | Q(sender=contact, recipient=user))
    ).order_by('created_at')
    
    # Mark as read
    Message.objects.filter(sender=contact, recipient=user, is_read=False).update(is_read=True)
    
    serializer = MessageSerializer(messages, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def send_message(request, username):
    try:
        recipient = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
        
    content = request.data.get('content')
    attachment = request.FILES.get('attachment')
    gif_url = request.data.get('gif_url')
    shared_post_id = request.data.get('shared_post_id')
    
    if not content and not attachment and not gif_url and not shared_post_id:
        return Response({"error": "Content, attachment, GIF, or shared post is required"}, status=status.HTTP_400_BAD_REQUEST)
        
    user = request.user
    
    if hasattr(user, 'profile'):
        follows_contact = user.profile.following.filter(user=recipient).exists()
        contact_follows_user = recipient.profile.following.filter(user=user).exists() if hasattr(recipient, 'profile') else False
        
        if not follows_contact and not contact_follows_user:
            return Response({"error": "You must follow each other to send messages."}, status=status.HTTP_403_FORBIDDEN)
            
    message = Message.objects.create(
        sender=user,
        recipient=recipient,
        content=content,
        attachment=attachment,
        gif_url=gif_url,
        reply_to_id=request.data.get('reply_to'),
        shared_post_id=shared_post_id
    )
    
    # Create a notification for the recipient
    Notification.objects.create(
        recipient=recipient,
        sender=user,
        notification_type='message'
    )
    
    return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)

from .models import MessageReaction

@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def delete_message(request, pk):
    try:
        message = Message.objects.get(id=pk)
        
        # Ensure the user deleting the message is the one who sent it
        if message.sender != request.user:
            return Response({"error": "You can only delete your own messages."}, status=status.HTTP_403_FORBIDDEN)
            
        message.delete()
        return Response({"status": "message deleted"}, status=status.HTTP_200_OK)
        
    except Message.DoesNotExist:
        return Response({"error": "Message not found."}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def react_to_message(request, pk):
    try:
        message = Message.objects.get(pk=pk)
    except Message.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    
    emoji = request.data.get('emoji')
    if not emoji:
        return Response({"error": "Emoji is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    # Toggle: if reaction exists, remove it; otherwise add it
    existing = MessageReaction.objects.filter(message=message, user=request.user, emoji=emoji).first()
    if existing:
        existing.delete()
        return Response({"status": "removed", "emoji": emoji})
    else:
        MessageReaction.objects.create(message=message, user=request.user, emoji=emoji)
        return Response({"status": "added", "emoji": emoji})

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def forward_message(request, pk):
    try:
        original_message = Message.objects.get(pk=pk)
    except Message.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    
    target_username = request.data.get('username')
    if not target_username:
        return Response({"error": "Target username is required"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        target_user = User.objects.get(username=target_username)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
    
    forwarded_msg = Message.objects.create(
        sender=request.user,
        recipient=target_user,
        content=original_message.content,
        forwarded_from=original_message
    )
    
    Notification.objects.create(
        recipient=target_user,
        sender=request.user,
        notification_type='message'
    )
    
    return Response(MessageSerializer(forwarded_msg).data, status=status.HTTP_201_CREATED)

@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def delete_conversation(request, username):
    try:
        contact = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    Message.objects.filter(
        (Q(sender=request.user, recipient=contact) | Q(sender=contact, recipient=request.user))
    ).delete()
    return Response({"status": "deleted"})

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def mark_conversation_unread(request, username):
    try:
        contact = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    # Mark the last message from contact as unread
    last_msg = Message.objects.filter(sender=contact, recipient=request.user).order_by('-created_at').first()
    if last_msg:
        last_msg.is_read = False
        last_msg.save()
    return Response({"status": "marked_unread"})

class LoginActivityListView(generics.ListAPIView):
    serializer_class = LoginActivitySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return LoginActivity.objects.filter(user=self.request.user).order_by('-timestamp')

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def logout_view(request):
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    ip_address = request.META.get('REMOTE_ADDR')
    
    LoginActivity.objects.create(
        user=request.user,
        ip_address=ip_address,
        user_agent=user_agent,
        event_type='logout'
    )
    return Response({"message": "Logout recorded"})
