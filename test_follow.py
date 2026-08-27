import os
import django
import sys

# Set up Django environment
sys.path.append(r'd:\Comment Moderation System\backend\gateway_django')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from posts.models import Profile

# Get two users
user1 = User.objects.first()
user2 = User.objects.last()

if not user1 or not user2 or user1 == user2:
    print("Need at least two different users to test following.")
    sys.exit()

profile1 = user1.profile
profile2 = user2.profile

print(f"Testing {user1.username} following {user2.username}")

# Check current status
print(f"Before: {user1.username} follows {user2.username}? {profile1.following.filter(id=profile2.id).exists()}")
print(f"Before: {user2.username} is followed by {user1.username}? {profile2.followers.filter(id=profile1.id).exists()}")

# Add follow
profile1.following.add(profile2)
print("Added follow.")

# Check after adding
print(f"After Add: {user1.username} follows {user2.username}? {profile1.following.filter(id=profile2.id).exists()}")
print(f"After Add: {user2.username} is followed by {user1.username}? {profile2.followers.filter(id=profile1.id).exists()}")

# Remove follow
profile1.following.remove(profile2)
print("Removed follow.")

# Check after removing
print(f"After Remove: {user1.username} follows {user2.username}? {profile1.following.filter(id=profile2.id).exists()}")
print(f"After Remove: {user2.username} is followed by {user1.username}? {profile2.followers.filter(id=profile1.id).exists()}")
