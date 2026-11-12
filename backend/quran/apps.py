from django.apps import AppConfig
from django.db.models.signals import post_migrate


class QuranConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'quran'
    verbose_name = 'Quran Studies & Lughat'

    def ready(self):
        from .signals import auto_seed_kitabs_handler
        post_migrate.connect(auto_seed_kitabs_handler, sender=self)
