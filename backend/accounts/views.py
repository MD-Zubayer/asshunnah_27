import os
import uuid
import json
import io
from django.db import IntegrityError
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.parsers import MultiPartParser, FormParser
from django.contrib.auth import get_user_model, authenticate
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.authtoken.models import Token
from django.db.models import Count, Q, Avg
from django.db.models.functions import TruncDate
from django.http import StreamingHttpResponse
from minio import Minio

from django.utils import timezone
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
)
from .models import (
    Dua, AppSettings,
    GlobalPrayerAlertConfig, PrayerAlertSetting, PrayerAlertLog, DeviceToken, Follow,
    Diary, JamiaGraduate,
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
    """API view to get current user profile"""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

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

        # For now, log the notification (FCM integration will be added in Phase 4)
        # Store as alert logs for tracking
        target_users = User.objects.all()
        if target == 'takmil':
            target_users = target_users.filter(profile_type='takmil_student')
        elif target == 'non_takmil':
            target_users = target_users.filter(profile_type='non_takmil_student')

        # Create a log entry for each target user (placeholder for FCM)
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
            'message': f'পুশ নোটিফিকেশন পাঠানোর প্রস্তুত হয়েছে',
            'data': {
                'title': title,
                'body': body,
                'target': target,
                'tokens_count': len(tokens),
                'note': 'FCM integration pending - notifications logged for tracking'
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
    """Serve media files from MinIO through Django."""
    permission_classes = [AllowAny]

    def get(self, request, object_name):
        """Fetch object from MinIO and return as streaming response."""
        try:
            client = get_minio_client()
            bucket = os.getenv('MINIO_BUCKET', 'media')

            response = client.get_object(bucket, object_name)
            content_type = response.headers.get('Content-Type', 'application/octet-stream')

            return StreamingHttpResponse(
                io.BytesIO(response.read()),
                content_type=content_type
            )
        except Exception:
            from django.conf import settings
            import os as local_os
            from django.http import FileResponse, HttpResponseNotFound

            local_path = local_os.path.join(settings.MEDIA_ROOT, object_name)
            if local_os.path.exists(local_path):
                # Guess mime type if possible
                import mimetypes
                content_type, _ = mimetypes.guess_type(local_path)
                content_type = content_type or 'application/octet-stream'
                return FileResponse(open(local_path, 'rb'), content_type=content_type)

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
            queryset = queryset.filter(graduation_year=graduation_year)
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
