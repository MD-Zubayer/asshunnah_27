from django.urls import path
from .views import MosqueListCreateView

urlpatterns = [
    path('mosques/', MosqueListCreateView.as_view(), name='mosque-list-create'),
]
