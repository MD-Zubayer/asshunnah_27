import os
import uuid
import json
import io
import secrets
from datetime import timedelta
from django.db import IntegrityError
from django.conf import settings
from django.core.mail import send_mail
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.contrib.auth import get_user_model, authenticate
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.authtoken.models import Token
from django.db.models import Count, Q, Avg
from django.db.models.functions import TruncDate
from django.http import StreamingHttpResponse
from minio import Minio

from django.utils import timezone
from django.shortcuts import render
from .serializers import (
    TakmilStudentSignupSerializer,
    NonTakmilStudentSignupSerializer,
    UniversalSignupSerializer,
    UserSerializer,
    LoginSerializer,
    DuaSerializer,
    AppSettingsSerializer,
    GlobalPrayerAlertConfigSerializer,
    PrayerAlertSettingSerializer,
    PrayerAlertSettingBulkSerializer,
    PrayerAlertLogSerializer,
    PrayerAlertLogCreateSerializer,
    DeviceTokenSerializer,
    DeviceTokenRegisterSerializer,
    AdminPushNotificationSerializer,
    FollowSerializer,
    FollowingSerializer,
    FollowStatusSerializer,
    DiarySerializer,
    JamiaGraduateSerializer,
    PasswordResetRequestSerializer,
    PasswordResetVerifySerializer,
    PasswordResetConfirmSerializer,
    EmailVerifyRequestSerializer,
    EmailVerifyConfirmSerializer,
    ChangePasswordSerializer,
    ContentReportSerializer,
)
from .models import (
    Dua, AppSettings,
    GlobalPrayerAlertConfig, PrayerAlertSetting, PrayerAlertLog, DeviceToken, Follow,
    Diary, JamiaGraduate,
    PasswordResetOTP, EmailVerificationOTP, ContentReport,
)

User = get_user_model()


class TakmilStudentSignupView(APIView):
    """API view for Takmil Student signup"""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = TakmilStudentSignupSerializer(data=request.data)
        if serializer.is_valid():
            try:
                user = serializer.save()
                token, created = Token.objects.get_or_create(user=user)
                return Response({
                    'message': 'Takmil Student registered successfully',
                    'user': UserSerializer(user).data,
                    'token': token.key
                }, status=status.HTTP_201_CREATED)
            except IntegrityError as e:
                err_str = str(e).lower()
                if 'email' in err_str:
                    return Response({'email': ['এই ইমেইল দিয়ে ইতোমধ্যে একটি অ্যাকাউন্ট রয়েছে।']}, status=status.HTTP_400_BAD_REQUEST)
                if 'phone_number' in err_str:
                    return Response({'phone_number': ['এই মোবাইল নম্বর দিয়ে ইতোমধ্যে একটি অ্যাকাউন্ট রয়েছে।']}, status=status.HTTP_400_BAD_REQUEST)
                return Response({'detail': 'এই তথ্যে ইতোমধ্যে একটি অ্যাকাউন্ট রয়েছে। নতুন তথ্য দিন।'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class NonTakmilStudentSignupView(APIView):
    """API view for Non-Takmil Student signup"""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = NonTakmilStudentSignupSerializer(data=request.data)
        if serializer.is_valid():
            try:
                user = serializer.save()
                token, created = Token.objects.get_or_create(user=user)
                return Response({
                    'message': 'Non-Takmil Student registered successfully',
                    'user': UserSerializer(user).data,
                    'token': token.key
                }, status=status.HTTP_201_CREATED)
            except IntegrityError as e:
                err_str = str(e).lower()
                if 'email' in err_str:
                    return Response({'email': ['এই ইমেইল দিয়ে ইতোমধ্যে একটি অ্যাকাউন্ট রয়েছে।']}, status=status.HTTP_400_BAD_REQUEST)
                if 'phone_number' in err_str:
                    return Response({'phone_number': ['এই মোবাইল নম্বর দিয়ে ইতোমধ্যে একটি অ্যাকাউন্ট রয়েছে।']}, status=status.HTTP_400_BAD_REQUEST)
                return Response({'detail': 'এই তথ্যে ইতোমধ্যে একটি অ্যাকাউন্ট রয়েছে। নতুন তথ্য দিন।'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UniversalSignupView(APIView):
    """API view for all signup types (Jamia Faregin, Current Students, Ustads, Others)"""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UniversalSignupSerializer(data=request.data)
        if serializer.is_valid():
            try:
                user = serializer.save()
                token, created = Token.objects.get_or_create(user=user)
                return Response({
                    'message': 'অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে।',
                    'user': UserSerializer(user).data,
                    'token': token.key
                }, status=status.HTTP_201_CREATED)
            except IntegrityError as e:
                err_str = str(e).lower()
                if 'email' in err_str:
                    return Response({'email': ['এই ইমেইল দিয়ে ইতোমধ্যে একটি অ্যাকাউন্ট রয়েছে।']}, status=status.HTTP_400_BAD_REQUEST)
                if 'phone_number' in err_str:
                    return Response({'phone_number': ['এই মোবাইল নম্বর দিয়ে ইতোমধ্যে একটি অ্যাকাউন্ট রয়েছে।']}, status=status.HTTP_400_BAD_REQUEST)
                return Response({'detail': 'এই তথ্যে ইতোমধ্যে একটি অ্যাকাউন্ট রয়েছে। নতুন তথ্য দিন।'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    """API view for user login"""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data.get('email')
            password = serializer.validated_data.get('password')

            user = authenticate(username=email, password=password)
            if user is not None:
                token, created = Token.objects.get_or_create(user=user)
                return Response({
                    'message': 'Login successful',
                    'user': UserSerializer(user).data,
                    'token': token.key
                }, status=status.HTTP_200_OK)
            else:
                return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserProfileView(APIView):
    """API view to get or update current user profile"""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        user = request.user
        serializer = UserSerializer(user, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        user = request.user
        serializer = UserSerializer(user, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request):
        return self.put(request)


class SwitchProfileTypeView(APIView):
    """Switch the authenticated user's account/profile type while keeping all account data intact."""
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    ALLOWED_TYPES = {'jamia_faregin', 'current_student', 'jamia_ustad', 'general_user'}

    def post(self, request):
        return self._handle_switch(request)

    def patch(self, request):
        return self._handle_switch(request)

    def _handle_switch(self, request):
        user = request.user
        data = request.data
        new_type = data.get('profile_type')

        if new_type not in self.ALLOWED_TYPES:
            return Response(
                {'error': 'সঠিক অ্যাকাউন্ট টাইপ নির্বাচন করুন।'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Role-specific validation
        if new_type == 'current_student':
            jamat = (data.get('jamat') or user.jamat or '').strip()
            dakhila = (data.get('dakhila_number') or user.dakhila_number or '').strip()
            if not jamat:
                return Response({'error': 'ছাত্র অ্যাকাউন্টের জন্য জামাত নির্বাচন করুন।'}, status=status.HTTP_400_BAD_REQUEST)
            if not dakhila:
                return Response({'error': 'দাখিলা নম্বর দিন।'}, status=status.HTTP_400_BAD_REQUEST)
            user.jamat = jamat
            user.dakhila_number = dakhila

        elif new_type == 'jamia_faregin':
            dakhila = (data.get('dakhila_number') or user.dakhila_number or '').strip()
            if not dakhila:
                return Response({'error': 'ফারেগীন অ্যাকাউন্টের জন্য দাখিলা নম্বর আবশ্যক।'}, status=status.HTTP_400_BAD_REQUEST)
            user.dakhila_number = dakhila
            if 'blood_group' in data and data.get('blood_group') is not None:
                user.blood_group = str(data.get('blood_group')).strip()
            if 'takmil_year_type' in data and data.get('takmil_year_type'):
                user.takmil_year_type = data.get('takmil_year_type')
            if 'custom_graduation_year' in data:
                user.custom_graduation_year = (data.get('custom_graduation_year') or '').strip() or None
            if 'fuzalaye_jamia_name' in data:
                f_name = (data.get('fuzalaye_jamia_name') or '').strip()
                user.fuzalaye_jamia_name = f_name if f_name else None

            TakmilStudentProfile.objects.update_or_create(
                user=user,
                defaults={
                    'dakhila_number': dakhila,
                    'blood_group': user.blood_group or '',
                }
            )

        elif new_type == 'jamia_ustad':
            designation = (data.get('designation') or user.designation or '').strip()
            department = (data.get('department') or user.department or '').strip()
            if not designation:
                return Response({'error': 'উস্তাদ অ্যাকাউন্টের জন্য পদবী লিখুন।'}, status=status.HTTP_400_BAD_REQUEST)
            user.designation = designation
            if department:
                user.department = department

        elif new_type == 'general_user':
            occupation = (data.get('occupation') or user.occupation or '').strip()
            if occupation:
                user.occupation = occupation
            NonTakmilStudentProfile.objects.update_or_create(
                user=user,
                defaults={'occupation': user.occupation or ''}
            )

        user.profile_type = new_type
        user.profile_completed = True
        try:
            user.save()
        except IntegrityError:
            return Response(
                {'error': 'এই ফুজালায়ে জামিয়া নাম ইতোমধ্যে অন্য অ্যাকাউন্টে ব্যবহৃত হয়েছে।'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = UserSerializer(user, context={'request': request})
        return Response({
            'message': 'অ্যাকাউন্টের ধরন সফলভাবে পরিবর্তন করা হয়েছে!',
            'user': serializer.data,
        }, status=status.HTTP_200_OK)



@method_decorator(csrf_exempt, name='dispatch')
class LogoutView(APIView):
    """API view for user logout"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            # Delete the token used for authentication
            if request.auth:
                request.auth.delete()
            return Response({'message': 'Logout successful'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': f'Logout failed: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)


class DuaListCreateView(APIView):
    """API view for listing and uploading duas."""
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        dua_qs = Dua.objects.all().order_by('-created_at')
        serializer = DuaSerializer(dua_qs, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        if not request.user.is_authenticated:
            return Response({'detail': 'Authentication credentials were not provided.'}, status=status.HTTP_401_UNAUTHORIZED)
        if not request.user.is_staff:
            return Response({'detail': 'You must be staff to upload duas.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = DuaSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save(created_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AppSettingsView(APIView):
    """API view for app settings (Hijri date)."""

    def get(self, request):
        """Get current app settings (public)"""
        settings = AppSettings.load()
        serializer = AppSettingsSerializer(settings)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        """Update Hijri date (staff only)"""
        if not request.user.is_authenticated:
            return Response({'detail': 'Authentication credentials were not provided.'}, status=status.HTTP_401_UNAUTHORIZED)
        if not request.user.is_staff:
            return Response({'detail': 'Only staff can update app settings.'}, status=status.HTTP_403_FORBIDDEN)

        settings = AppSettings.load()
        hijri_date = request.data.get('hijri_date', '')

        if not hijri_date:
            return Response({'detail': 'hijri_date is required.'}, status=status.HTTP_400_BAD_REQUEST)

        settings.hijri_date = hijri_date
        settings.hijri_date_updated_at = timezone.now()
        settings.updated_by = request.user
        settings.save()

        serializer = AppSettingsSerializer(settings)
        return Response({
            'message': 'হিজরি তারিখ আপডেট করা হয়েছে',
            'data': serializer.data
        }, status=status.HTTP_200_OK)


# ============================================
# User Prayer Alert Views
# ============================================

class UserPrayerAlertPreferencesView(APIView):
    """Get or bulk-update user's prayer alert preferences."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get all prayer alert preferences for the current user."""
        settings = PrayerAlertSetting.objects.filter(user=request.user)
        serializer = PrayerAlertSettingSerializer(settings, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        """Bulk create/update prayer alert preferences."""
        serializer = PrayerAlertSettingBulkSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        settings_data = serializer.validated_data['settings']
        created_settings = []

        for setting_data in settings_data:
            obj, created = PrayerAlertSetting.objects.update_or_create(
                user=request.user,
                prayer_name=setting_data['prayer_name'],
                defaults={
                    'is_enabled': setting_data.get('is_enabled', True),
                    'offset_minutes': setting_data.get('offset_minutes', 0),
                    'is_silent': setting_data.get('is_silent', False),
                    'use_custom_adhan': setting_data.get('use_custom_adhan', False),
                }
            )
            created_settings.append(obj)

        result_serializer = PrayerAlertSettingSerializer(created_settings, many=True)
        return Response({
            'message': 'অ্যালার্ট সেটিংস সেভ করা হয়েছে',
            'data': result_serializer.data
        }, status=status.HTTP_200_OK)


class UserPrayerAlertSingleView(APIView):
    """Update a single prayer alert setting."""
    permission_classes = [IsAuthenticated]

    def put(self, request, prayer_name):
        """Update a specific prayer alert setting."""
        valid_prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']
        if prayer_name not in valid_prayers:
            return Response(
                {'error': f'Invalid prayer name. Must be one of: {", ".join(valid_prayers)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        setting, created = PrayerAlertSetting.objects.get_or_create(
            user=request.user,
            prayer_name=prayer_name,
            defaults={'is_enabled': True, 'offset_minutes': 0}
        )

        serializer = PrayerAlertSettingSerializer(setting, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                'message': f'{setting.get_prayer_name_display()} অ্যালার্ট আপডেট করা হয়েছে',
                'data': serializer.data
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserPrayerAlertTodayView(APIView):
    """Get today's alert schedule for the current user."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get today's prayer alert schedule with user preferences applied."""
        settings = PrayerAlertSetting.objects.filter(user=request.user, is_enabled=True)
        global_configs = GlobalPrayerAlertConfig.objects.all()

        # Build a map of global configs
        global_map = {gc.prayer_name: gc for gc in global_configs}

        today_alerts = []
        for setting in settings:
            gc = global_map.get(setting.prayer_name)

            # Skip if globally disabled
            if gc and not gc.is_globally_enabled:
                continue

            # Calculate effective offset (user offset + global default offset)
            effective_offset = setting.offset_minutes
            if gc:
                effective_offset += gc.default_offset_minutes

            today_alerts.append({
                'prayer_name': setting.prayer_name,
                'prayer_name_display': setting.get_prayer_name_display(),
                'is_enabled': setting.is_enabled,
                'offset_minutes': effective_offset,
                'is_silent': setting.is_silent,
                'is_adhan_enabled': gc.is_adhan_enabled if gc else False,
                'notification_title_template': gc.notification_title_template if gc else '',
                'notification_body_template': gc.notification_body_template if gc else '',
            })

        return Response(today_alerts, status=status.HTTP_200_OK)


class PrayerAlertLogCreateView(APIView):
    """Log alert delivery events from the client."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Create an alert log entry."""
        serializer = PrayerAlertLogCreateSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response({'message': 'Alert logged'}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PrayerAlertMarkReadView(APIView):
    """Mark an alert log as read."""
    permission_classes = [IsAuthenticated]

    def post(self, request, log_id):
        """Mark a specific alert log as read."""
        try:
            log = PrayerAlertLog.objects.get(id=log_id, user=request.user)
            log.is_read = True
            log.read_at = timezone.now()
            log.save()
            return Response({'message': 'Alert marked as read'}, status=status.HTTP_200_OK)
        except PrayerAlertLog.DoesNotExist:
            return Response({'error': 'Alert log not found'}, status=status.HTTP_404_NOT_FOUND)


class UserPrayerAlertLogsView(APIView):
    """Get user's alert delivery history."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get alert logs for the current user."""
        days = int(request.query_params.get('days', 7))
        since = timezone.now() - timezone.timedelta(days=days)
        logs = PrayerAlertLog.objects.filter(
            user=request.user,
            created_at__gte=since
        ).order_by('-created_at')[:100]
        serializer = PrayerAlertLogSerializer(logs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


# ============================================
# Device Token Views
# ============================================

class DeviceTokenRegisterView(APIView):
    """Register or update FCM device token for push notifications."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Register a device token."""
        serializer = DeviceTokenRegisterSerializer(data=request.data)
        if serializer.is_valid():
            token_value = serializer.validated_data['token']
            device_type = serializer.validated_data['device_type']

            # Update or create
            obj, created = DeviceToken.objects.update_or_create(
                token=token_value,
                defaults={
                    'user': request.user,
                    'device_type': device_type,
                    'is_active': True,
                    'last_used_at': timezone.now(),
                }
            )
            result = DeviceTokenSerializer(obj)
            return Response({
                'message': 'Device token registered',
                'data': result.data
            }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        """Deactivate a device token."""
        token_value = request.data.get('token', '')
        if not token_value:
            return Response({'error': 'token is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            dt = DeviceToken.objects.get(token=token_value, user=request.user)
            dt.is_active = False
            dt.save()
            return Response({'message': 'Device token deactivated'}, status=status.HTTP_200_OK)
        except DeviceToken.DoesNotExist:
            return Response({'error': 'Device token not found'}, status=status.HTTP_404_NOT_FOUND)


# ============================================
# Admin Prayer Alert Views
# ============================================

class AdminGlobalAlertConfigView(APIView):
    """Admin: Get or update global prayer alert configurations."""
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        """Get all global prayer alert configs."""
        configs = GlobalPrayerAlertConfig.objects.all().order_by('prayer_name')
        serializer = GlobalPrayerAlertConfigSerializer(configs, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        """Create or update global prayer alert configs (bulk)."""
        configs_data = request.data.get('configs', [])
        if not configs_data:
            # Single config update
            prayer_name = request.data.get('prayer_name')
            if not prayer_name:
                return Response({'error': 'prayer_name is required'}, status=status.HTTP_400_BAD_REQUEST)
            configs_data = [request.data]

        updated_configs = []
        for config_data in configs_data:
            prayer_name = config_data.get('prayer_name')
            if not prayer_name:
                continue

            config, created = GlobalPrayerAlertConfig.objects.update_or_create(
                prayer_name=prayer_name,
                defaults={
                    'is_globally_enabled': config_data.get('is_globally_enabled', True),
                    'default_offset_minutes': config_data.get('default_offset_minutes', 0),
                    'notification_title_template': config_data.get(
                        'notification_title_template',
                        'নামাজের সময় হয়েছে ({prayer_name})'
                    ),
                    'notification_body_template': config_data.get(
                        'notification_body_template',
                        'হালকা বিরতি নিন এবং নামাজের জন্য প্রস্তুতি নিন। এখন {prayer_name}-এর ওয়াক্ত।'
                    ),
                    'is_adhan_enabled': config_data.get('is_adhan_enabled', False),
                    'updated_by': request.user,
                }
            )
            updated_configs.append(config)

        serializer = GlobalPrayerAlertConfigSerializer(
            updated_configs, many=True, context={'request': request}
        )
        return Response({
            'message': 'গ্লোবাল অ্যালার্ট কনফিগ আপডেট করা হয়েছে',
            'data': serializer.data
        }, status=status.HTTP_200_OK)


class AdminGlobalAlertConfigSingleView(APIView):
    """Admin: Get or update a single global prayer alert config."""
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request, prayer_name):
        """Get a single global config."""
        try:
            config = GlobalPrayerAlertConfig.objects.get(prayer_name=prayer_name)
            serializer = GlobalPrayerAlertConfigSerializer(config, context={'request': request})
            return Response(serializer.data, status=status.HTTP_200_OK)
        except GlobalPrayerAlertConfig.DoesNotExist:
            return Response({'error': 'Config not found'}, status=status.HTTP_404_NOT_FOUND)

    def put(self, request, prayer_name):
        """Update a single global config."""
        config, created = GlobalPrayerAlertConfig.objects.get_or_create(
            prayer_name=prayer_name,
            defaults={'updated_by': request.user}
        )
        serializer = GlobalPrayerAlertConfigSerializer(config, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save(updated_by=request.user)
            return Response({
                'message': f'{config.get_prayer_name_display()} অ্যালার্ট কনফিগ আপডেট করা হয়েছে',
                'data': serializer.data
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminAlertAnalyticsView(APIView):
    """Admin: View alert delivery analytics."""
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        """Get alert analytics overview."""
        days = int(request.query_params.get('days', 30))
        since = timezone.now() - timezone.timedelta(days=days)

        # Total logs in period
        total_logs = PrayerAlertLog.objects.filter(created_at__gte=since).count()
        delivered_logs = PrayerAlertLog.objects.filter(
            created_at__gte=since, delivered_at__isnull=False
        ).count()
        read_logs = PrayerAlertLog.objects.filter(
            created_at__gte=since, is_read=True
        ).count()

        # Per-prayer breakdown
        prayer_stats = PrayerAlertLog.objects.filter(
            created_at__gte=since
        ).values('prayer_name').annotate(
            total=Count('id'),
            delivered=Count('id', filter=Q(delivered_at__isnull=False)),
            read=Count('id', filter=Q(is_read=True)),
        ).order_by('prayer_name')

        # Daily trend
        daily_trend = PrayerAlertLog.objects.filter(
            created_at__gte=since
        ).annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            total=Count('id'),
            delivered=Count('id', filter=Q(delivered_at__isnull=False)),
        ).order_by('date')

        # Notification type breakdown
        type_stats = PrayerAlertLog.objects.filter(
            created_at__gte=since
        ).values('notification_type').annotate(
            total=Count('id')
        ).order_by('notification_type')

        return Response({
            'period_days': days,
            'summary': {
                'total_alerts': total_logs,
                'delivered': delivered_logs,
                'read': read_logs,
                'delivery_rate': round((delivered_logs / total_logs * 100), 2) if total_logs > 0 else 0,
                'read_rate': round((read_logs / total_logs * 100), 2) if total_logs > 0 else 0,
            },
            'prayer_breakdown': prayer_stats,
            'daily_trend': daily_trend,
            'notification_types': type_stats,
        }, status=status.HTTP_200_OK)


class AdminAlertUserStatsView(APIView):
    """Admin: View per-user alert statistics."""
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        """Get per-user alert stats."""
        days = int(request.query_params.get('days', 30))
        since = timezone.now() - timezone.timedelta(days=days)

        user_stats = PrayerAlertLog.objects.filter(
            created_at__gte=since
        ).values(
            'user__id', 'user__email', 'user__first_name', 'user__last_name'
        ).annotate(
            total_alerts=Count('id'),
            delivered=Count('id', filter=Q(delivered_at__isnull=False)),
            read=Count('id', filter=Q(is_read=True)),
        ).order_by('-total_alerts')[:50]

        return Response(user_stats, status=status.HTTP_200_OK)


class AdminSendPushNotificationView(APIView):
    """Admin: Send custom push notification to users."""
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request):
        """Send push notification to target users."""
        serializer = AdminPushNotificationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        title = serializer.validated_data['title']
        body = serializer.validated_data['body']
        target = serializer.validated_data['target']
        sound = serializer.validated_data.get('sound', True)
        data = serializer.validated_data.get('data', {})

        # Get target device tokens
        tokens_qs = DeviceToken.objects.filter(is_active=True)

        if target == 'takmil':
            tokens_qs = tokens_qs.filter(user__profile_type='takmil_student')
        elif target == 'non_takmil':
            tokens_qs = tokens_qs.filter(user__profile_type='non_takmil_student')

        tokens = list(tokens_qs.values_list('token', flat=True))

        # Send notifications to tokens (supporting Expo Push Service if tokens are present)
        expo_tokens = [t for t in tokens if t.startswith('ExponentPushToken[') or t.startswith('ExpoPushToken[')]
        delivered_count = 0
        if expo_tokens:
            import urllib.request
            import json as py_json
            payload = [{
                'to': token,
                'title': title,
                'body': body,
                'sound': 'default' if sound else None,
                'data': data,
            } for token in expo_tokens[:100]]
            try:
                req = urllib.request.Request(
                    'https://exp.host/--/api/v2/push/send',
                    data=py_json.dumps(payload).encode('utf-8'),
                    headers={'Content-Type': 'application/json', 'Accept': 'application/json'},
                    method='POST'
                )
                with urllib.request.urlopen(req, timeout=5) as resp:
                    if resp.status == 200:
                        delivered_count = len(payload)
            except Exception as e:
                print(f"[AdminSendPushNotificationView] Push delivery error: {e}")

        # Store as alert logs for tracking
        target_users = User.objects.all()
        if target == 'takmil':
            target_users = target_users.filter(profile_type='takmil_student')
        elif target == 'non_takmil':
            target_users = target_users.filter(profile_type='non_takmil_student')

        # Create a log entry for each target user
        notification_logs = []
        for user in target_users[:500]:  # Limit to avoid performance issues
            log = PrayerAlertLog(
                user=user,
                prayer_name='custom',
                scheduled_time=timezone.now(),
                delivered_at=timezone.now(),
                notification_type='push',
                location_used='',
                calculation_method='',
            )
            notification_logs.append(log)

        PrayerAlertLog.objects.bulk_create(notification_logs, ignore_conflicts=True)

        return Response({
            'message': f'পুশ নোটিফিকেশন পাঠানো হয়েছে',
            'data': {
                'title': title,
                'body': body,
                'target': target,
                'tokens_count': len(tokens),
                'delivered_count': delivered_count,
            }
        }, status=status.HTTP_200_OK)


class AdminAdhanUploadView(APIView):
    """Admin: Upload adhan audio for a specific prayer."""
    permission_classes = [IsAuthenticated, IsAdminUser]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, prayer_name):
        """Upload adhan audio for a prayer."""
        valid_prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']
        if prayer_name not in valid_prayers:
            return Response(
                {'error': f'Invalid prayer name. Must be one of: {", ".join(valid_prayers)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        audio_file = request.FILES.get('adhan_audio')
        if not audio_file:
            return Response({'error': 'adhan_audio file is required'}, status=status.HTTP_400_BAD_REQUEST)

        config, created = GlobalPrayerAlertConfig.objects.get_or_create(
            prayer_name=prayer_name,
            defaults={'updated_by': request.user}
        )

        # Delete old file if exists
        if config.adhan_audio:
            config.adhan_audio.delete()

        config.adhan_audio = audio_file
        config.is_adhan_enabled = True
        config.updated_by = request.user
        config.save()

        serializer = GlobalPrayerAlertConfigSerializer(config, context={'request': request})
        return Response({
            'message': f'{config.get_prayer_name_display()} আজান আপলোড করা হয়েছে',
            'data': serializer.data
        }, status=status.HTTP_200_OK)


class AdminAlertToggleGlobalView(APIView):
    """Admin: Toggle all alerts on/off globally."""
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request):
        """Enable or disable all prayer alerts globally."""
        enable = request.data.get('enable', True)
        GlobalPrayerAlertConfig.objects.all().update(
            is_globally_enabled=enable,
            updated_by=request.user,
            updated_at=timezone.now()
        )
        status_text = 'সক্রিয়' if enable else 'নিষ্ক্রিয়'
        return Response({
            'message': f'সব অ্যালার্ট {status_text} করা হয়েছে',
            'enabled': enable
        }, status=status.HTTP_200_OK)


# ============================================
# MinIO Helper
# ============================================

def get_minio_client():
    """Get MinIO client instance."""
    return Minio(
        os.getenv('MINIO_ENDPOINT', 'minio:9000'),
        access_key=os.getenv('MINIO_ACCESS_KEY', ''),
        secret_key=os.getenv('MINIO_SECRET_KEY', ''),
        secure=False,
    )


def ensure_minio_bucket(client, bucket_name):
    """Ensure bucket exists with public read policy."""
    if not client.bucket_exists(bucket_name):
        client.make_bucket(bucket_name)
    # Set public read policy
    policy = {
        "Version": "2012-10-17",
        "Statement": [{
            "Effect": "Allow",
            "Principal": {"AWS": "*"},
            "Action": ["s3:GetObject"],
            "Resource": [f"arn:aws:s3:::{bucket_name}/*"]
        }]
    }
    client.set_bucket_policy(bucket_name, json.dumps(policy))


def get_minio_public_url(object_name):
    """Build public URL for a MinIO object."""
    # For external access via Cloudflare / public domain
    base = os.getenv('MINIO_PUBLIC_URL', '')
    if base:
        return f"{base.rstrip('/')}/{object_name}"
    # Fallback: use the API domain with /media/ prefix
    return f"/media/{object_name}"


# ============================================
# Profile Photo & Cover Photo Upload (MinIO)
# ============================================

class UploadProfilePhotoView(APIView):
    """Upload or replace profile photo to MinIO."""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        user = request.user
        image = request.FILES.get('profile_image')
        if not image:
            return Response({'error': 'profile_image file is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate file type
        allowed_types = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
        if image.content_type not in allowed_types:
            return Response(
                {'error': f'Invalid file type. Allowed: {", ".join(allowed_types)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate file size (max 5MB)
        max_size = 5 * 1024 * 1024
        if image.size > max_size:
            return Response({'error': 'File size must be under 5MB'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            client = get_minio_client()
            bucket = os.getenv('MINIO_BUCKET', 'media')
            ensure_minio_bucket(client, bucket)

            # Delete old photo from MinIO if exists
            if user.profile_image:
                try:
                    client.remove_object(bucket, user.profile_image)
                except Exception:
                    pass

            # Generate unique object name
            ext = image.name.rsplit('.', 1)[-1] if '.' in image.name else 'jpg'
            object_name = f"profiles/{uuid.uuid4()}.{ext}"

            # Upload to MinIO
            client.put_object(
                bucket, object_name,
                image, image.size,
                content_type=image.content_type
            )

            # Save object path to user
            user.profile_image = object_name
            user.save(update_fields=['profile_image'])

            serializer = UserSerializer(user, context={'request': request})
            return Response({
                'message': 'Profile photo updated',
                'data': serializer.data
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': f'Upload failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def delete(self, request):
        """Remove profile photo from MinIO."""
        user = request.user
        if user.profile_image:
            try:
                client = get_minio_client()
                bucket = os.getenv('MINIO_BUCKET', 'media')
                client.remove_object(bucket, user.profile_image)
            except Exception:
                pass
            user.profile_image = None
            user.save(update_fields=['profile_image'])
        serializer = UserSerializer(user, context={'request': request})
        return Response({
            'message': 'Profile photo removed',
            'data': serializer.data
        }, status=status.HTTP_200_OK)


# ============================================
# Follow/Unfollow Views
# ============================================

class FollowUserView(APIView):
    """Follow or unfollow a user."""
    permission_classes = [IsAuthenticated]

    def post(self, request, user_id):
        """Follow a user."""
        if int(user_id) == request.user.id:
            return Response({'error': 'নিজেকে follow করা যাবে না'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'ব্যবহারকারী পাওয়া যায়নি'}, status=status.HTTP_404_NOT_FOUND)

        follow, created = Follow.objects.get_or_create(
            follower=request.user,
            following=target_user
        )

        if created:
            return Response({'message': 'Follow করা হয়েছে', 'is_following': True}, status=status.HTTP_201_CREATED)
        return Response({'message': 'আগেই follow করা আছে', 'is_following': True}, status=status.HTTP_200_OK)

    def delete(self, request, user_id):
        """Unfollow a user."""
        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'ব্যবহারকারী পাওয়া যায়নি'}, status=status.HTTP_404_NOT_FOUND)

        deleted_count, _ = Follow.objects.filter(
            follower=request.user,
            following=target_user
        ).delete()

        if deleted_count:
            return Response({'message': 'Unfollow করা হয়েছে', 'is_following': False}, status=status.HTTP_200_OK)
        return Response({'message': 'আগেই unfollow করা আছে', 'is_following': False}, status=status.HTTP_200_OK)


class FollowStatusView(APIView):
    """Get follow status and counts for a user."""
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        """Get follow status for a specific user."""
        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'ব্যবহারকারী পাওয়া যায়নি'}, status=status.HTTP_404_NOT_FOUND)

        is_following = Follow.objects.filter(
            follower=request.user,
            following=target_user
        ).exists()

        follower_count = Follow.objects.filter(following=target_user).count()
        following_count = Follow.objects.filter(follower=target_user).count()

        serializer = UserSerializer(target_user, context={'request': request})

        return Response({
            'is_following': is_following,
            'follower_count': follower_count,
            'following_count': following_count,
            'user': serializer.data,
        }, status=status.HTTP_200_OK)


class UserFollowersView(APIView):
    """Get followers list for a user."""
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        """Get followers of a user."""
        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'ব্যবহারকারী পাওয়া যায়নি'}, status=status.HTTP_404_NOT_FOUND)

        follows = Follow.objects.filter(following=target_user).select_related('follower')
        serializer = FollowSerializer(follows, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class UserFollowingView(APIView):
    """Get following list for a user."""
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        """Get users that this user is following."""
        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'ব্যবহারকারী পাওয়া যায়নি'}, status=status.HTTP_404_NOT_FOUND)

        follows = Follow.objects.filter(follower=target_user).select_related('following')
        serializer = FollowingSerializer(follows, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class UploadCoverPhotoView(APIView):
    """Upload or replace cover photo to MinIO."""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        user = request.user
        image = request.FILES.get('cover_image')
        if not image:
            return Response({'error': 'cover_image file is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate file type
        allowed_types = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
        if image.content_type not in allowed_types:
            return Response(
                {'error': f'Invalid file type. Allowed: {", ".join(allowed_types)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate file size (max 10MB for cover)
        max_size = 10 * 1024 * 1024
        if image.size > max_size:
            return Response({'error': 'File size must be under 10MB'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            client = get_minio_client()
            bucket = os.getenv('MINIO_BUCKET', 'media')
            ensure_minio_bucket(client, bucket)

            # Delete old photo from MinIO if exists
            if user.cover_image:
                try:
                    client.remove_object(bucket, user.cover_image)
                except Exception:
                    pass

            # Generate unique object name
            ext = image.name.rsplit('.', 1)[-1] if '.' in image.name else 'jpg'
            object_name = f"covers/{uuid.uuid4()}.{ext}"

            # Upload to MinIO
            client.put_object(
                bucket, object_name,
                image, image.size,
                content_type=image.content_type
            )

            # Save object path to user
            user.cover_image = object_name
            user.save(update_fields=['cover_image'])

            serializer = UserSerializer(user, context={'request': request})
            return Response({
                'message': 'Cover photo updated',
                'data': serializer.data
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': f'Upload failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def delete(self, request):
        """Remove cover photo from MinIO."""
        user = request.user
        if user.cover_image:
            try:
                client = get_minio_client()
                bucket = os.getenv('MINIO_BUCKET', 'media')
                client.remove_object(bucket, user.cover_image)
            except Exception:
                pass
            user.cover_image = None
            user.save(update_fields=['cover_image'])
        serializer = UserSerializer(user, context={'request': request})
        return Response({
            'message': 'Cover photo removed',
            'data': serializer.data
        }, status=status.HTTP_200_OK)


# ============================================
# MinIO Media Proxy View
# ============================================

class MinIOMediaView(APIView):
    """Serve media files from MinIO through Django with CORS and Range (206) support."""
    permission_classes = [AllowAny]

    def _add_cors_headers(self, response):
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Methods"] = "GET, HEAD, OPTIONS"
        response["Access-Control-Allow-Headers"] = "*"
        response["Access-Control-Expose-Headers"] = "Content-Length, Content-Range, Accept-Ranges, Content-Type"
        return response

    def options(self, request, *args, **kwargs):
        from django.http import HttpResponse
        response = HttpResponse()
        return self._add_cors_headers(response)

    def head(self, request, object_name):
        from django.http import HttpResponse, HttpResponseNotFound
        try:
            client = get_minio_client()
            bucket = os.getenv('MINIO_BUCKET', 'media')
            stat = client.stat_object(bucket, object_name)
            content_type = stat.content_type or 'application/octet-stream'

            response = HttpResponse(content_type=content_type)
            response["Content-Length"] = str(stat.size)
            response["Accept-Ranges"] = "bytes"
            return self._add_cors_headers(response)
        except Exception:
            return HttpResponseNotFound('File not found')

    def get(self, request, object_name):
        """Fetch object from MinIO and return as streaming response with Range support."""
        try:
            client = get_minio_client()
            bucket = os.getenv('MINIO_BUCKET', 'media')

            stat = client.stat_object(bucket, object_name)
            total_size = stat.size
            content_type = stat.content_type or 'application/octet-stream'

            # Check HTTP Range header
            range_header = request.META.get('HTTP_RANGE', '').strip()
            if range_header.startswith('bytes='):
                range_str = range_header[6:].strip()
                parts = range_str.split('-')
                start = int(parts[0]) if parts[0] else 0
                end = int(parts[1]) if len(parts) > 1 and parts[1] else total_size - 1

                if start >= total_size or end >= total_size or start > end:
                    from django.http import HttpResponse
                    resp = HttpResponse(status=416)
                    resp["Content-Range"] = f"bytes */{total_size}"
                    return self._add_cors_headers(resp)

                length = end - start + 1
                response_data = client.get_object(bucket, object_name, offset=start, length=length)
                resp = StreamingHttpResponse(
                    io.BytesIO(response_data.read()),
                    content_type=content_type,
                    status=206
                )
                resp["Content-Range"] = f"bytes {start}-{end}/{total_size}"
                resp["Content-Length"] = str(length)
                resp["Accept-Ranges"] = "bytes"
                return self._add_cors_headers(resp)

            # Full file request
            response_data = client.get_object(bucket, object_name)
            resp = StreamingHttpResponse(
                io.BytesIO(response_data.read()),
                content_type=content_type
            )
            resp["Content-Length"] = str(total_size)
            resp["Accept-Ranges"] = "bytes"
            return self._add_cors_headers(resp)

        except Exception:
            from django.conf import settings
            import os as local_os
            from django.http import FileResponse, HttpResponseNotFound

            local_path = local_os.path.join(settings.MEDIA_ROOT, object_name)
            if local_os.path.exists(local_path):
                import mimetypes
                content_type, _ = mimetypes.guess_type(local_path)
                content_type = content_type or 'application/octet-stream'
                resp = FileResponse(open(local_path, 'rb'), content_type=content_type)
                resp["Accept-Ranges"] = "bytes"
                return self._add_cors_headers(resp)

            return HttpResponseNotFound('File not found')


# ============================================
# Delete Account View
# ============================================

class DeleteAccountView(APIView):
    """Delete user account permanently."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Delete the authenticated user's account."""
        user = request.user
        password = request.data.get('password', '')

        # Verify password
        if not user.check_password(password):
            return Response(
                {'error': 'ভুল পাসওয়ার্ড। অ্যাকাউন্ট ডিলিট করতে সঠিক পাসওয়ার্ড দিন।'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Delete user's MinIO files
        try:
            client = get_minio_client()
            bucket = os.getenv('MINIO_BUCKET', 'media')

            # Delete profile image
            if user.profile_image:
                try:
                    client.remove_object(bucket, user.profile_image)
                except Exception:
                    pass

            # Delete cover image
            if user.cover_image:
                try:
                    client.remove_object(bucket, user.cover_image)
                except Exception:
                    pass
        except Exception:
            pass

        # Delete auth token
        Token.objects.filter(user=user).delete()

        # Delete user
        user_email = user.email
        user.delete()

        return Response({
            'message': f'{user_email} অ্যাকাউন্ট সফলভাবে ডিলিট করা হয়েছে।'
        }, status=status.HTTP_200_OK)


# ============================================
# Fuzalaye Jamia Views
# ============================================

class FuzalayeJamiaListView(APIView):
    """Get Fuzalaye Jamia list (from static JSON data)."""
    permission_classes = [AllowAny]

    def get(self, request):
        """Return the full Fuzalaye Jamia list."""
        import json
        import os
        from django.conf import settings

        # Path to the JSON data file
        json_path = os.path.join(settings.BASE_DIR, '..', 'android', 'assunnah_27', 'src', 'data', 'fuzalaye-jamia-data.json')

        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return Response(data, status=status.HTTP_200_OK)
        except FileNotFoundError:
            return Response({'error': 'Fuzalaye Jamia data file not found'}, status=status.HTTP_404_NOT_FOUND)
        except json.JSONDecodeError:
            return Response({'error': 'Invalid JSON data'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UserByFuzalayeNameView(APIView):
    """Get user profile by their Fuzalaye Jamia name."""
    permission_classes = [AllowAny]

    def get(self, request, name):
        """Find a user by their fuzalaye_jamia_name or jamia_graduate name (case-insensitive)."""
        try:
            user = User.objects.filter(fuzalaye_jamia_name__iexact=name).first()
            if not user:
                user = User.objects.filter(jamia_graduate__name__iexact=name).first()
            
            if user:
                serializer = UserSerializer(user, context={'request': request})
                return Response({
                    'found': True,
                    'user': serializer.data
                }, status=status.HTTP_200_OK)
            else:
                raise User.DoesNotExist
        except User.DoesNotExist:
            return Response({
                'found': False,
                'message': 'এই নামে কোনো ব্যবহারকারী পাওয়া যায়নি'
            }, status=status.HTTP_404_NOT_FOUND)


# ============================================
# Diary Views
# ============================================

class DiaryListCreateView(APIView):
    """List user's diary entries or create a new one."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get all diary entries for the current user."""
        diaries = Diary.objects.filter(user=request.user)
        serializer = DiarySerializer(diaries, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        """Create a new diary entry."""
        serializer = DiarySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DiaryDetailView(APIView):
    """Get, update, or delete a single diary entry."""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        """Get a single diary entry."""
        try:
            diary = Diary.objects.get(pk=pk, user=request.user)
        except Diary.DoesNotExist:
            return Response({'error': 'ডায়েরি পাওয়া যায়নি'}, status=status.HTTP_404_NOT_FOUND)
        serializer = DiarySerializer(diary)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        """Partially update a diary entry."""
        try:
            diary = Diary.objects.get(pk=pk, user=request.user)
        except Diary.DoesNotExist:
            return Response({'error': 'ডায়েরি পাওয়া যায়নি'}, status=status.HTTP_404_NOT_FOUND)
        serializer = DiarySerializer(diary, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, pk):
        """Update a diary entry."""
        return self.patch(request, pk)

    def delete(self, request, pk):
        """Delete a diary entry."""
        try:
            diary = Diary.objects.get(pk=pk, user=request.user)
        except Diary.DoesNotExist:
            return Response({'error': 'ডায়েরি পাওয়া যায়নি'}, status=status.HTTP_404_NOT_FOUND)
        diary.delete()
        return Response({'message': 'ডায়েরি মুছে ফেলা হয়েছে'}, status=status.HTTP_200_OK)


# ============================================
# User Stats View (Home Page Progress Cards)
# ============================================

class UserStatsView(APIView):
    """Get aggregated user statistics for home page progress cards."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Return dynamic stats for the current user."""
        user = request.user
        today = timezone.now().date()
        week_ago = timezone.now() - timezone.timedelta(days=7)

        # --- Diary Stats ---
        diary_count = Diary.objects.filter(user=user).count()
        weekly_diary_count = Diary.objects.filter(
            user=user, created_at__gte=week_ago
        ).count()

        # Most used tag
        tag_stats = Diary.objects.filter(user=user).values('tag').annotate(
            count=Count('id')
        ).order_by('-count')
        most_used_tag = tag_stats[0]['tag'] if tag_stats else 'সাধারণ'

        # Diary streak (consecutive days with at least one entry)
        diary_dates = Diary.objects.filter(user=user).annotate(
            date=TruncDate('created_at')
        ).values_list('date', flat=True).distinct().order_by('-date')

        diary_streak = 0
        if diary_dates:
            check_date = today
            for d in diary_dates:
                if d == check_date:
                    diary_streak += 1
                    check_date = check_date - timezone.timedelta(days=1)
                elif d < check_date:
                    break

        from articles.models import Article, ArticleReaction, ArticleComment, ArticleView, ArticleShare

        articles_read = ArticleView.objects.filter(user=user).count()
        articles_liked = ArticleReaction.objects.filter(user=user).count()
        articles_commented = ArticleComment.objects.filter(user=user).count()
        articles_shared = ArticleShare.objects.filter(user=user).count()
        articles_written = Article.objects.filter(user=user).count()

        # --- Prayer Stats ---
        from .models import PrayerAlertLog
        today_prayers = PrayerAlertLog.objects.filter(
            user=user,
            created_at__date=today,
            delivered_at__isnull=False
        ).count()

        # Prayer streak (consecutive days with at least one prayer logged)
        prayer_dates = PrayerAlertLog.objects.filter(
            user=user, delivered_at__isnull=False
        ).annotate(
            date=TruncDate('created_at')
        ).values_list('date', flat=True).distinct().order_by('-date')

        prayer_streak = 0
        if prayer_dates:
            check_date = today
            for d in prayer_dates:
                if d == check_date:
                    prayer_streak += 1
                    check_date = check_date - timezone.timedelta(days=1)
                elif d < check_date:
                    break

        # --- Social Stats ---
        from .models import Follow
        followers_count = Follow.objects.filter(following=user).count()
        following_count = Follow.objects.filter(follower=user).count()

        return Response({
            'diary': {
                'total': diary_count,
                'weekly': weekly_diary_count,
                'most_used_tag': most_used_tag,
                'streak': diary_streak,
            },
            'article': {
                'read': articles_read,
                'liked': articles_liked,
                'commented': articles_commented,
                'shared': articles_shared,
                'written': articles_written,
            },
            'prayer': {
                'today': today_prayers,
                'streak': prayer_streak,
            },
            'social': {
                'followers': followers_count,
                'following': following_count,
            },
        }, status=status.HTTP_200_OK)


# ============================================
# Jamia Graduate (Sokol Faregin) ViewSet
# ============================================

class JamiaGraduateViewSet(viewsets.ModelViewSet):
    """ViewSet for viewing and entering Jamia Graduates."""
    queryset = JamiaGraduate.objects.all()
    serializer_class = JamiaGraduateSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = JamiaGraduate.objects.all()
        district = self.request.query_params.get('district')
        graduation_year = self.request.query_params.get('graduation_year')
        search = self.request.query_params.get('search')

        if district:
            queryset = queryset.filter(district__iexact=district)
        if graduation_year:
            graduation_year_str = str(graduation_year).strip()
            bn_to_en = str.maketrans('০১২৩৪৫৬৭৮৯', '0123456789')
            en_to_bn = str.maketrans('0123456789', '০১২৩৪৫৬৭৮৯')
            en_year = graduation_year_str.translate(bn_to_en)
            bn_year = graduation_year_str.translate(en_to_bn)
            queryset = queryset.filter(
                Q(graduation_year__iexact=graduation_year_str) |
                Q(graduation_year__iexact=en_year) |
                Q(graduation_year__iexact=bn_year)
            )
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | 
                Q(father_name__icontains=search) |
                Q(thana__icontains=search) |
                Q(district__icontains=search)
            )
        return queryset.order_by('name')

    def perform_create(self, serializer):
        graduate = serializer.save(
            created_by=self.request.user if self.request.user.is_authenticated else None
        )
        # Auto-link if a registered User has the same phone number (mobile)
        mobile = graduate.mobile
        if mobile:
            query_mobiles = [mobile]
            if mobile.startswith('+880'):
                query_mobiles.append(mobile[3:])
            elif mobile.startswith('0'):
                query_mobiles.append('+88' + mobile)
                if mobile.startswith('01'):
                    # also support +880...
                    query_mobiles.append('+880' + mobile[1:])
            
            user = User.objects.filter(phone_number__in=query_mobiles).first()
            if user:
                user.jamia_graduate = graduate
                user.takmil_year_type = 'other'
                user.custom_graduation_year = graduate.graduation_year
                user.save()


# ============================================
# Password Reset & Email Verification Views
# ============================================

def _send_otp_email(user, otp_code, purpose="password_reset"):
    name = user.get_full_name() or "সম্মানিত ব্যবহারকারী"
    if purpose == "password_reset":
        subject = "আস-সুন্নাহ জামিয়া: পাসওয়ার্ড রিসেট ভেরিফিকেশন কোড"
        desc = "আপনার অ্যাকাউন্টের পাসওয়ার্ড রিসেট করার জন্য ৬ ডিজিটের ওটিপি কোডটি নিচে দেওয়া হলো:"
        note = "এই ওটিপি কোডটির মেয়াদ ১০ মিনিট। আপনি যদি এই পাসওয়ার্ড রিসেট অনুরোধ না করে থাকেন, তবে কারো সাথে এই কোড শেয়ার করবেন না।"
    else:
        subject = "আস-সুন্নাহ জামিয়া: ইমেইল ভেরিফিকেশন কোড"
        desc = "আপনার ইমেইল ঠিকানাটি নিশ্চিত করতে ৬ ডিজিটের ওটিপি কোডটি নিচে দেওয়া হলো:"
        note = "এই ওটিপি কোডটির মেয়াদ ১০ মিনিট। কোডটি অ্যাপে প্রবেশ করিয়ে আপনার ইমেইল ভেরিফাই সম্পন্ন করুন।"

    plain_message = f"""আসসালামু আলাইকুম {name},

{desc}

    {otp_code}

{note}

ধন্যবাদ,
আস-সুন্নাহ জামিয়া টিম
"""
    html_message = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #059669; margin: 0; font-size: 24px;">আস-সুন্নাহ জামিয়া</h2>
            <p style="color: #64748b; font-size: 14px; margin-top: 4px;">দ্বীনি শিক্ষার এক অনন্য প্রতিষ্ঠান</p>
        </div>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
        <p style="font-size: 15px; color: #334155;">আসসালামু আলাইকুম <strong>{name}</strong>,</p>
        <p style="font-size: 15px; color: #334155;">{desc}</p>
        <div style="text-align: center; margin: 28px 0;">
            <span style="display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 10px; color: #059669; background: #ecfdf5; padding: 14px 28px; border-radius: 10px; border: 2px dashed #059669;">
                {otp_code}
            </span>
        </div>
        <p style="color: #64748b; font-size: 13px; line-height: 1.6;">{note}</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">© আস-সুন্নাহ জামিয়া। সর্বস্বত্ব সংরক্ষিত।</p>
    </div>
    """
    try:
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        return True
    except Exception as exc:
        print(f"[OTP Email Error] Failed to send email to {user.email}: {exc}")
        return False


class PasswordResetRequestView(APIView):
    """Generates and sends a 6-digit OTP code to the user's email."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response({
                'email': ['এই ইমেইল দিয়ে কোনো অ্যাকাউন্ট পাওয়া যায়নি।']
            }, status=status.HTTP_404_NOT_FOUND)

        # Rate-limiting: check if an OTP was created in the last 60 seconds
        recent_otp = PasswordResetOTP.objects.filter(
            user=user,
            created_at__gte=timezone.now() - timedelta(seconds=60)
        ).first()
        if recent_otp:
            return Response({
                'detail': 'ইতিমধ্যে একটি ওটিপি পাঠানো হয়েছে। অনুগ্রহ করে নতুন কোড চাওয়ার পূর্বে ১ মিনিট অপেক্ষা করুন।'
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)

        # Invalidate old unused OTPs
        PasswordResetOTP.objects.filter(user=user, is_used=False).update(is_used=True)

        otp_code = f"{secrets.randbelow(900000) + 100000}"
        expires_at = timezone.now() + timedelta(minutes=10)
        PasswordResetOTP.objects.create(
            user=user,
            email=user.email,
            otp_code=otp_code,
            expires_at=expires_at,
        )

        _send_otp_email(user, otp_code, purpose="password_reset")

        resp_data = {
            'success': True,
            'message': 'আপনার ইমেইলে ৬ ডিজিটের ওটিপি ভেরিফিকেশন কোড পাঠানো হয়েছে।',
        }
        return Response(resp_data, status=status.HTTP_200_OK)


class PasswordResetVerifyView(APIView):
    """Verifies the 6-digit OTP code before setting new password."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetVerifySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        otp = serializer.validated_data['otp']

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response({
                'email': ['এই ইমেইল দিয়ে কোনো অ্যাকাউন্ট পাওয়া যায়নি।']
            }, status=status.HTTP_404_NOT_FOUND)

        reset_otp = PasswordResetOTP.objects.filter(user=user, is_used=False).order_by('-created_at').first()
        if not reset_otp or timezone.now() > reset_otp.expires_at:
            return Response({
                'otp': ['ওটিপির মেয়াদ শেষ হয়ে গেছে। অনুগ্রহ করে আবার নতুন ওটিপি পাঠান।']
            }, status=status.HTTP_400_BAD_REQUEST)

        if reset_otp.attempts >= 5:
            return Response({
                'otp': ['সর্বোচ্চ ভুল প্রচেষ্টার সীমা অতিক্রম করেছে। অনুগ্রহ করে নতুন ওটিপি চেয়ে নিন।']
            }, status=status.HTTP_400_BAD_REQUEST)

        if reset_otp.otp_code != otp:
            reset_otp.attempts += 1
            reset_otp.save(update_fields=['attempts'])
            remaining = max(0, 5 - reset_otp.attempts)
            return Response({
                'otp': [f'ভুল ওটিপি প্রদান করেছেন। বাকি প্রচেষ্টা: {remaining} বার।']
            }, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'success': True,
            'message': 'ওটিপি সফলভাবে যাচাই করা হয়েছে। এবার নতুন পাসওয়ার্ড নির্ধারণ করুন।'
        }, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    """Sets a new password after verifying the OTP."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        otp = serializer.validated_data['otp']
        password = serializer.validated_data['password']

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response({
                'email': ['এই ইমেইল দিয়ে কোনো অ্যাকাউন্ট পাওয়া যায়নি।']
            }, status=status.HTTP_404_NOT_FOUND)

        reset_otp = PasswordResetOTP.objects.filter(user=user, is_used=False).order_by('-created_at').first()
        if not reset_otp or timezone.now() > reset_otp.expires_at:
            return Response({
                'otp': ['ওটিপির মেয়াদ শেষ হয়ে গেছে বা এটি ব্যবহার করা হয়েছে।']
            }, status=status.HTTP_400_BAD_REQUEST)

        if reset_otp.otp_code != otp:
            return Response({
                'otp': ['ভুল ওটিপি কোড।']
            }, status=status.HTTP_400_BAD_REQUEST)

        # Set new password
        user.set_password(password)
        user.save()

        # Mark OTP as used
        reset_otp.is_used = True
        reset_otp.save(update_fields=['is_used'])

        return Response({
            'success': True,
            'message': 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে। এখন নতুন পাসওয়ার্ড দিয়ে লগইন করুন।'
        }, status=status.HTTP_200_OK)


class EmailVerificationSendView(APIView):
    """Sends a 6-digit OTP code to verify the user's email."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = EmailVerifyRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data.get('email')
        if request.user.is_authenticated:
            user = request.user
        elif email:
            user = User.objects.filter(email__iexact=email).first()
        else:
            return Response({
                'email': ['ইমেইল এড্রেস প্রদান করুন।']
            }, status=status.HTTP_400_BAD_REQUEST)

        if not user:
            return Response({
                'email': ['ব্যবহারকারী পাওয়া যায়নি।']
            }, status=status.HTTP_404_NOT_FOUND)

        if user.is_email_verified:
            return Response({
                'success': True,
                'already_verified': True,
                'message': 'এই ইমেইলটি ইতোমধ্যে ভেরিফাইড।'
            }, status=status.HTTP_200_OK)

        # Rate-limiting: 60s
        recent_otp = EmailVerificationOTP.objects.filter(
            user=user,
            created_at__gte=timezone.now() - timedelta(seconds=60)
        ).first()
        if recent_otp:
            return Response({
                'detail': 'ইতিমধ্যে একটি কোড পাঠানো হয়েছে। অনুগ্রহ করে নতুন কোড চাওয়ার পূর্বে ১ মিনিট অপেক্ষা করুন।'
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)

        # Invalidate old unused OTPs
        EmailVerificationOTP.objects.filter(user=user, is_used=False).update(is_used=True)

        otp_code = f"{secrets.randbelow(900000) + 100000}"
        expires_at = timezone.now() + timedelta(minutes=10)
        EmailVerificationOTP.objects.create(
            user=user,
            email=user.email,
            otp_code=otp_code,
            expires_at=expires_at,
        )

        _send_otp_email(user, otp_code, purpose="email_verification")

        resp_data = {
            'success': True,
            'message': 'আপনার ইমেইলে ভেরিফিকেশন কোড পাঠানো হয়েছে।',
        }
        return Response(resp_data, status=status.HTTP_200_OK)


class EmailVerificationConfirmView(APIView):
    """Verifies the email verification OTP and marks user as verified."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = EmailVerifyConfirmSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data.get('email')
        otp = serializer.validated_data['otp']

        if request.user.is_authenticated:
            user = request.user
        elif email:
            user = User.objects.filter(email__iexact=email).first()
        else:
            return Response({
                'email': ['ইমেইল এড্রেস প্রদান করুন।']
            }, status=status.HTTP_400_BAD_REQUEST)

        if not user:
            return Response({
                'email': ['ব্যবহারকারী পাওয়া যায়নি।']
            }, status=status.HTTP_404_NOT_FOUND)

        email_otp = EmailVerificationOTP.objects.filter(user=user, is_used=False).order_by('-created_at').first()
        if not email_otp or timezone.now() > email_otp.expires_at:
            return Response({
                'otp': ['ওটিপির মেয়াদ শেষ হয়ে গেছে। অনুগ্রহ করে আবার নতুন কোড নিন।']
            }, status=status.HTTP_400_BAD_REQUEST)

        if email_otp.attempts >= 5:
            return Response({
                'otp': ['সর্বোচ্চ ভুল প্রচেষ্টার সীমা অতিক্রম করেছে। অনুগ্রহ করে নতুন ওটিপি চেয়ে নিন।']
            }, status=status.HTTP_400_BAD_REQUEST)

        if email_otp.otp_code != otp:
            email_otp.attempts += 1
            email_otp.save(update_fields=['attempts'])
            remaining = max(0, 5 - email_otp.attempts)
            return Response({
                'otp': [f'ভুল ওটিপি কোড। বাকি প্রচেষ্টা: {remaining} বার।']
            }, status=status.HTTP_400_BAD_REQUEST)

        user.is_email_verified = True
        user.save(update_fields=['is_email_verified'])

        email_otp.is_used = True
        email_otp.save(update_fields=['is_used'])

        return Response({
            'success': True,
            'message': 'ইমেইল সফলভাবে ভেরিফাই করা হয়েছে!',
            'user': UserSerializer(user, context={'request': request}).data
        }, status=status.HTTP_200_OK)


class ChangePasswordView(APIView):
    """Allows an authenticated user to change their password."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        old_password = serializer.validated_data['old_password']
        new_password = serializer.validated_data['new_password']

        if not request.user.check_password(old_password):
            return Response({
                'old_password': ['বর্তমান পাসওয়ার্ডটি সঠিক নয়।']
            }, status=status.HTTP_400_BAD_REQUEST)

        request.user.set_password(new_password)
        request.user.save()

        return Response({
            'success': True,
            'message': 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে।'
        }, status=status.HTTP_200_OK)


def privacy_policy_view(request):
    """Public HTML Privacy Policy view for Google Play Store compliance."""
    return render(request, 'accounts/privacy_policy.html')


def delete_account_view(request):
    """Public HTML Account Deletion Request view for Google Play Data Safety compliance."""
    success = False
    if request.method == 'POST':
        email = request.POST.get('email', '').strip()
        reason = request.POST.get('reason', '').strip()
        if email:
            success = True
    return render(request, 'accounts/delete_account.html', {'success': success})


class ReportCreateView(APIView):
    """Allows users to submit abuse, harassment, or objectionable content reports."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ContentReportSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        reporter = request.user if request.user and request.user.is_authenticated else None
        report = serializer.save(reporter=reporter)
        return Response({
            'success': True,
            'message': 'আপনার রিপোর্টটি সফলভাবে গ্রহণ করা হয়েছে। মডারেশন টিম ২৪ ঘণ্টার মধ্যে পর্যালোচনা করে প্রয়োজনীয় ব্যবস্থা গ্রহণ করবে।',
            'report_id': report.id
        }, status=status.HTTP_201_CREATED)



