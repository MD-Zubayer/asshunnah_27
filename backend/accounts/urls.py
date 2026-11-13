from django.urls import path
from .views import (
    TakmilStudentSignupView,
    NonTakmilStudentSignupView,
    UniversalSignupView,
    LoginView,
    UserProfileView,
    SwitchProfileTypeView,
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
    UserPrayerAlertPreferencesView,
    UserPrayerAlertSingleView,
    UserPrayerAlertTodayView,
    PrayerAlertLogCreateView,
    PrayerAlertMarkReadView,
    UserPrayerAlertLogsView,
    DeviceTokenRegisterView,
    AdminGlobalAlertConfigView,
    AdminGlobalAlertConfigSingleView,
    AdminAlertAnalyticsView,
    AdminAlertUserStatsView,
    AdminSendPushNotificationView,
    AdminAdhanUploadView,
    AdminAlertToggleGlobalView,
    PasswordResetRequestView,
    PasswordResetVerifyView,
    PasswordResetConfirmView,
    EmailVerificationSendView,
    EmailVerificationConfirmView,
    ChangePasswordView,
)

urlpatterns = [
    # Authentication endpoints
    path('auth/signup/', UniversalSignupView.as_view(), name='universal_signup'),
    path('auth/signup/takmil/', TakmilStudentSignupView.as_view(), name='takmil_signup'),
    path('auth/signup/non-takmil/', NonTakmilStudentSignupView.as_view(), name='non_takmil_signup'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/profile/', UserProfileView.as_view(), name='profile'),
    path('auth/switch-profile-type/', SwitchProfileTypeView.as_view(), name='switch_profile_type'),
    path('auth/profile/upload-photo/', UploadProfilePhotoView.as_view(), name='upload_profile_photo'),
    path('auth/profile/upload-cover/', UploadCoverPhotoView.as_view(), name='upload_cover_photo'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='change_password'),

    # Password Reset endpoints (with & without auth/ prefix for maximum frontend compatibility)
    path('auth/password-reset/request/', PasswordResetRequestView.as_view(), name='auth_password_reset_request'),
    path('auth/password-reset/verify/', PasswordResetVerifyView.as_view(), name='auth_password_reset_verify'),
    path('auth/password-reset/confirm/', PasswordResetConfirmView.as_view(), name='auth_password_reset_confirm'),
    path('password-reset/request/', PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('password-reset/verify/', PasswordResetVerifyView.as_view(), name='password_reset_verify'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),

    # Email Verification endpoints
    path('auth/email-verify/send/', EmailVerificationSendView.as_view(), name='auth_email_verify_send'),
    path('auth/email-verify/confirm/', EmailVerificationConfirmView.as_view(), name='auth_email_verify_confirm'),
    path('auth/verify-email/send/', EmailVerificationSendView.as_view(), name='auth_verify_email_send'),
    path('auth/verify-email/confirm/', EmailVerificationConfirmView.as_view(), name='auth_verify_email_confirm'),

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

    # Prayer Alerts (User)
    path('alerts/preferences/', UserPrayerAlertPreferencesView.as_view(), name='alert_preferences'),
    path('alerts/preferences/<str:prayer_name>/', UserPrayerAlertSingleView.as_view(), name='alert_preference_single'),
    path('alerts/today/', UserPrayerAlertTodayView.as_view(), name='alert_today'),
    path('alerts/logs/', UserPrayerAlertLogsView.as_view(), name='alert_logs'),
    path('alerts/logs/create/', PrayerAlertLogCreateView.as_view(), name='alert_log_create'),
    path('alerts/logs/<int:log_id>/read/', PrayerAlertMarkReadView.as_view(), name='alert_log_mark_read'),

    # Device Token (Push Notifications)
    path('device-token/', DeviceTokenRegisterView.as_view(), name='device_token'),

    # Prayer Alerts (Admin)
    path('admin/alerts/global-config/', AdminGlobalAlertConfigView.as_view(), name='admin_alert_global_config'),
    path('admin/alerts/global-config/<str:prayer_name>/', AdminGlobalAlertConfigSingleView.as_view(), name='admin_alert_global_single'),
    path('admin/alerts/analytics/', AdminAlertAnalyticsView.as_view(), name='admin_alert_analytics'),
    path('admin/alerts/user-stats/', AdminAlertUserStatsView.as_view(), name='admin_alert_user_stats'),
    path('admin/alerts/send-push/', AdminSendPushNotificationView.as_view(), name='admin_alert_send_push'),
    path('admin/alerts/toggle-global/', AdminAlertToggleGlobalView.as_view(), name='admin_alert_toggle_global'),
    path('admin/alerts/upload-adhan/<str:prayer_name>/', AdminAdhanUploadView.as_view(), name='admin_alert_upload_adhan'),
]
