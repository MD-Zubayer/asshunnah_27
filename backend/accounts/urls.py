from django.urls import path
from .views import (
    TakmilStudentSignupView,
    NonTakmilStudentSignupView,
    LoginView,
    UserProfileView,
    LogoutView,
)

urlpatterns = [
    # Authentication endpoints
    path('auth/signup/takmil/', TakmilStudentSignupView.as_view(), name='takmil_signup'),
    path('auth/signup/non-takmil/', NonTakmilStudentSignupView.as_view(), name='non_takmil_signup'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/profile/', UserProfileView.as_view(), name='profile'),
]
