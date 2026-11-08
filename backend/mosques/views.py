from rest_framework import generics, permissions
from django.db.models import F
from django.db.models.functions import ACos, Cos, Radians, Sin
from .models import Mosque
from .serializers import MosqueSerializer

class MosqueListCreateView(generics.ListCreateAPIView):
    queryset = Mosque.objects.all()
    serializer_class = MosqueSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        if self.request.user and self.request.user.is_authenticated:
            serializer.save(created_by=self.request.user)
        else:
            serializer.save()

    def get_queryset(self):
        queryset = Mosque.objects.all()
        lat = self.request.query_params.get('latitude')
        lng = self.request.query_params.get('longitude')
        radius = self.request.query_params.get('radius')

        if lat is not None and lng is not None:
            try:
                lat = float(lat)
                lng = float(lng)
                search_radius = float(radius) if radius else 5000.0

                radlat = Radians(lat)
                radlng = Radians(lng)
                rad_lat_db = Radians(F('latitude'))
                rad_lng_db = Radians(F('longitude'))

                # Haversine distance calculation in meters
                distance_formula = 6371000 * ACos(
                    Cos(radlat) * Cos(rad_lat_db) * Cos(rad_lng_db - radlng) +
                    Sin(radlat) * Sin(rad_lat_db)
                )

                queryset = queryset.annotate(distance=distance_formula).filter(distance__lte=search_radius).order_by('distance')
            except (ValueError, TypeError):
                pass

        return queryset
