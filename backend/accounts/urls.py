from django.urls import path
from .views import (
    TakmilStudentSignupView,
    NonTakmilStudentSignupView,
    LoginView,
    UserProfileView,
    LogoutView,
    DuaListCreateView,
    UploadProfilePhotoView,
    UploadCoverPhotoView,
    FollowUserView,
    FollowStatusView,
    UserFollowersView,
    UserFollowingView,
    DeleteAccountView,
    FuzalayeJamiaListView,
    UserByFuzalayeNameView,
    DiaryListCreateView,
    DiaryDetailView,
    UserStatsView,
    JamiaGraduateViewSet,
)

urlpatterns = [
    # Authentication endpoints
    path('auth/signup/takmil/', TakmilStudentSignupView.as_view(), name='takmil_signup'),
    path('auth/signup/non-takmil/', NonTakmilStudentSignupView.as_view(), name='non_takmil_signup'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/profile/', UserProfileView.as_view(), name='profile'),
    path('auth/profile/upload-photo/', UploadProfilePhotoView.as_view(), name='upload_profile_photo'),
    path('auth/profile/upload-cover/', UploadCoverPhotoView.as_view(), name='upload_cover_photo'),
    path('duas/', DuaListCreateView.as_view(), name='duas'),
    
    # Follow endpoints
    path('follow/<int:user_id>/', FollowUserView.as_view(), name='follow_user'),
    path('follow/<int:user_id>/status/', FollowStatusView.as_view(), name='follow_status'),
    path('follow/<int:user_id>/followers/', UserFollowersView.as_view(), name='user_followers'),
    path('follow/<int:user_id>/following/', UserFollowingView.as_view(), name='user_following'),
    
    # Account deletion
    path('auth/delete-account/', DeleteAccountView.as_view(), name='delete_account'),
    
    # Fuzalaye Jamia endpoints
    path('fuzalaye-jamia/', FuzalayeJamiaListView.as_view(), name='fuzalaye_jamia_list'),
    path('user/by-name/<str:name>/', UserByFuzalayeNameView.as_view(), name='user_by_fuzalaye_name'),
    
    # Diary endpoints
    path('diaries/', DiaryListCreateView.as_view(), name='diary_list_create'),
    path('diaries/<int:pk>/', DiaryDetailView.as_view(), name='diary_detail'),
    
    # User Stats endpoint (Home page progress cards)
    path('user-stats/', UserStatsView.as_view(), name='user_stats'),

    # Jamia Graduates (Sokol Faregin) endpoints
    path('jamia-graduates/', JamiaGraduateViewSet.as_view({'get': 'list', 'post': 'create'}), name='jamia_graduate_list_create'),
    path('jamia-graduates/<int:pk>/', JamiaGraduateViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='jamia_graduate_detail'),
]
