from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    bio = models.TextField(max_length=500, blank=True)
    following = models.ManyToManyField('self', symmetrical=False, related_name='followers', blank=True)
    two_factor_enabled = models.BooleanField(default=False)

    def __str__(self):
        return self.user.username

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    instance.profile.save()

class Story(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='stories')
    image = models.ImageField(upload_to='stories/', null=True, blank=True)
    video = models.FileField(upload_to='stories/videos/', null=True, blank=True)
    is_video = models.BooleanField(default=False)
    caption = models.CharField(max_length=200, blank=True)
    caption_x = models.FloatField(default=0.5) # Center by default
    caption_y = models.FloatField(default=0.8) # Near bottom by default
    
    # New Interaction Field
    likes = models.ManyToManyField(User, related_name='liked_stories', blank=True)
    
    # Structured Music Data (iTunes API Integration)
    music_title = models.CharField(max_length=255, null=True, blank=True)
    music_artist = models.CharField(max_length=255, null=True, blank=True)
    music_url = models.URLField(max_length=1000, null=True, blank=True)
    music_coverart = models.URLField(max_length=1000, null=True, blank=True)
    music_start_time = models.FloatField(default=0.0) 
    music_duration = models.FloatField(default=15.0)
    
    tagged_users = models.ManyToManyField(User, related_name='tagged_in_stories', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username}'s Story - {self.created_at}"

class Post(models.Model):
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts')
    location = models.CharField(max_length=100, default='Community Feed', blank=True)
    caption = models.TextField(blank=True)
    image = models.ImageField(upload_to='posts/')
    
    # Music fields
    music_title = models.CharField(max_length=255, null=True, blank=True)
    music_artist = models.CharField(max_length=255, null=True, blank=True)
    music_url = models.URLField(max_length=1000, null=True, blank=True)
    music_coverart = models.URLField(max_length=1000, null=True, blank=True)
    music_start_time = models.FloatField(default=0.0)
    music_duration = models.FloatField(default=15.0)

    likes = models.ManyToManyField(User, related_name='liked_posts', blank=True)
    saved_by = models.ManyToManyField(User, related_name='saved_posts', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.author.username} - {self.created_at}"

class Comment(models.Model):
    text = models.TextField()
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comments', null=True, blank=True)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    
    # Toxicity scores
    toxic = models.FloatField(default=0.0)
    severe_toxic = models.FloatField(default=0.0)
    obscene = models.FloatField(default=0.0)
    threat = models.FloatField(default=0.0)
    insult = models.FloatField(default=0.0)
    identity_hate = models.FloatField(default=0.0)

    status = models.CharField(max_length=20, default='allowed') # allowed, flagged, deleted
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    likes = models.ManyToManyField(User, related_name='liked_comments', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username if self.user else 'Anon'}: {self.text[:20]}"

class Notification(models.Model):
    NOTIFICATION_TYPES = (
        ('like', 'Like'),
        ('follow', 'Follow'),
        ('comment', 'Comment'),
        ('message', 'Message'),
        ('tag', 'Tag'),
        ('story_like', 'Story Like'),
        ('story_reply', 'Story Reply'),
    )
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_notifications')
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, null=True, blank=True)
    story = models.ForeignKey(Story, on_delete=models.CASCADE, null=True, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.sender.username} → {self.recipient.username}: {self.notification_type}"

class Message(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_messages')
    content = models.TextField(null=True, blank=True)
    attachment = models.FileField(upload_to='message_attachments/', null=True, blank=True)
    gif_url = models.URLField(max_length=500, null=True, blank=True)
    story_reply = models.ForeignKey(Story, on_delete=models.SET_NULL, null=True, blank=True, related_name='replies')
    reply_to = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='replies_to_msg')
    forwarded_from = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='forwards')
    shared_post = models.ForeignKey(Post, on_delete=models.SET_NULL, null=True, blank=True, related_name='shared_in_messages')
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"From {self.sender.username} to {self.recipient.username}"

class MessageReaction(models.Model):
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='reactions')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='message_reactions')
    emoji = models.CharField(max_length=10)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['message', 'user', 'emoji']

    def __str__(self):
        return f"{self.user.username}: {self.emoji} on message {self.message.id}"

class PostTag(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='tags')
    tagged_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tagged_in_posts')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['post', 'tagged_user']

    def __str__(self):
        return f"{self.tagged_user.username} tagged in post {self.post.id}"

class LoginActivity(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='login_activities')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    browser = models.CharField(max_length=50, null=True, blank=True)
    os = models.CharField(max_length=50, null=True, blank=True)
    device = models.CharField(max_length=50, null=True, blank=True)
    location = models.CharField(max_length=255, default='Unknown')
    event_type = models.CharField(max_length=10, choices=(('login', 'Login'), ('logout', 'Logout')))
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user.username} - {self.event_type} at {self.timestamp}"

