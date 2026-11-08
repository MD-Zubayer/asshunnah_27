from django.db import models
from django.conf import settings

class Mosque(models.Model):
    name = models.CharField(max_length=255)
    latitude = models.FloatField()
    longitude = models.FloatField()
    radius = models.IntegerField(default=50) # Geofencing radius in meters
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_mosques'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
