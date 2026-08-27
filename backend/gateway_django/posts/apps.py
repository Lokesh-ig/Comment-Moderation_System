from django.apps import AppConfig


class PostsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'posts'

    def ready(self):
        import threading
        from .ai_loader import load_ai_model
        threading.Thread(target=load_ai_model, daemon=True).start()
