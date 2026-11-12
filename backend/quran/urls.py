from django.urls import path
from .views import KitabListView, WordLughatView, AyahStudyView

app_name = 'quran'

urlpatterns = [
    path('kitabs/', KitabListView.as_view(), name='kitab-list'),
    path('word-lughat/', WordLughatView.as_view(), name='word-lughat'),
    path('ayah-study/', AyahStudyView.as_view(), name='ayah-study'),
]
