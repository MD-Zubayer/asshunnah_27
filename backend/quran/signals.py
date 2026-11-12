import logging

logger = logging.getLogger(__name__)


def auto_seed_kitabs_handler(sender, **kwargs):
    """
    Automatically runs when 'python manage.py migrate' completes.
    Ensures that all authentic Kitabs (Lughat, Tafsir, Translation)
    are seeded in the database on any fresh or existing server.
    """
    if sender.name == 'quran':
        try:
            from django.core.management import call_command
            call_command('seed_quran_kitabs')
        except Exception as err:
            logger.warning(f"Auto-seed warning on post_migrate: {err}")
