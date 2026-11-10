import os

from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    TakmilStudentProfile, NonTakmilStudentProfile, Dua, AppSettings,
    GlobalPrayerAlertConfig, PrayerAlertSetting, PrayerAlertLog, DeviceToken,
    Follow, Diary, JamiaGraduate
)

User = get_user_model()


def _build_minio_url(object_name):
    """Build public URL for a MinIO object."""
    if not object_name:
        return None
    base = os.getenv('MINIO_PUBLIC_URL', '')
    if base:
        return f"{base.rstrip('/')}/{object_name}"
    # Fallback: relative path through nginx /api/ proxy
    return f"/media/{object_name}"


class TakmilStudentSignupSerializer(serializers.Serializer):
    """Serializer for Takmil Student signup"""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField(max_length=150)
    father_name = serializers.CharField(max_length=150)
    phone_number = serializers.CharField(max_length=20)
    district = serializers.CharField(max_length=100)
    upazila = serializers.CharField(max_length=100)
    dakhila_number = serializers.CharField(max_length=50)
    blood_group = serializers.ChoiceField(
        choices=['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']
    )
    period_of_education = serializers.CharField(max_length=100)
    fuzalaye_jamia_name = serializers.CharField(max_length=255, required=False, allow_blank=True, allow_null=True)
    takmil_year_type = serializers.ChoiceField(choices=['26_27', 'other'], default='26_27', required=False)
    custom_graduation_year = serializers.CharField(max_length=10, required=False, allow_blank=True, allow_null=True)
    jamia_graduate_id = serializers.IntegerField(required=False, allow_null=True)

    def validate(self, data):
        if data['password'] != data.pop('password_confirm'):
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        
        email = data.get('email')
        if email and User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError({'email': 'এই ইমেইল দিয়ে ইতোমধ্যে একটি অ্যাকাউন্ট রয়েছে।'})
            
        phone_number = data.get('phone_number')
        if phone_number and User.objects.filter(phone_number=phone_number).exists():
            raise serializers.ValidationError({'phone_number': 'এই মোবাইল নম্বর দিয়ে ইতোমধ্যে একটি অ্যাকাউন্ট রয়েছে।'})

        return data

    def create(self, validated_data):
        # Extract profile-specific fields
        dakhila_number = validated_data.pop('dakhila_number')
        blood_group = validated_data.pop('blood_group')
        period_of_education = validated_data.pop('period_of_education')
        password = validated_data.pop('password')
        fuzalaye_jamia_name = validated_data.pop('fuzalaye_jamia_name', None)
        takmil_year_type = validated_data.pop('takmil_year_type', '26_27')
        custom_graduation_year = validated_data.pop('custom_graduation_year', None)
        jamia_graduate_id = validated_data.pop('jamia_graduate_id', None)

        jamia_graduate = None
        if jamia_graduate_id:
            try:
                jamia_graduate = JamiaGraduate.objects.get(id=jamia_graduate_id)
            except JamiaGraduate.DoesNotExist:
                pass

        # Create user
        user = User.objects.create(
            email=validated_data['email'],
            first_name=validated_data['first_name'],
            father_name=validated_data.get('father_name', ''),
            phone_number=validated_data['phone_number'],
            district=validated_data['district'],
            upazila=validated_data['upazila'],
            profile_type='takmil_student',
            profile_completed=True,
            fuzalaye_jamia_name=fuzalaye_jamia_name or None,
            takmil_year_type=takmil_year_type,
            custom_graduation_year=custom_graduation_year or None,
            jamia_graduate=jamia_graduate
        )
        user.set_password(password)
        user.save()

        # Create Takmil Student Profile
        TakmilStudentProfile.objects.create(
            user=user,
            dakhila_number=dakhila_number,
            blood_group=blood_group,
            period_of_education=period_of_education
        )

        return user


class NonTakmilStudentSignupSerializer(serializers.Serializer):
    """Serializer for Non-Takmil Student signup"""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField(max_length=150)
    father_name = serializers.CharField(max_length=150)
    phone_number = serializers.CharField(max_length=20)
    district = serializers.CharField(max_length=100)
    upazila = serializers.CharField(max_length=100)
    occupation = serializers.CharField(max_length=100, required=False, allow_blank=True)

    def validate(self, data):
        if data['password'] != data.pop('password_confirm'):
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        
        email = data.get('email')
        if email and User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError({'email': 'এই ইমেইল দিয়ে ইতোমধ্যে একটি অ্যাকাউন্ট রয়েছে।'})
            
        phone_number = data.get('phone_number')
        if phone_number and User.objects.filter(phone_number=phone_number).exists():
            raise serializers.ValidationError({'phone_number': 'এই মোবাইল নম্বর দিয়ে ইতোমধ্যে একটি অ্যাকাউন্ট রয়েছে।'})

        return data

    def create(self, validated_data):
        # Extract profile-specific fields
        occupation = validated_data.pop('occupation', '')
        password = validated_data.pop('password')

        # Create user
        user = User.objects.create(
            email=validated_data['email'],
            first_name=validated_data['first_name'],
            father_name=validated_data.get('father_name', ''),
            phone_number=validated_data['phone_number'],
            district=validated_data['district'],
            upazila=validated_data['upazila'],
            profile_type='non_takmil_student',
            profile_completed=True
        )
        user.set_password(password)
        user.save()

        # Create Non-Takmil Student Profile
        NonTakmilStudentProfile.objects.create(
            user=user,
            occupation=occupation
        )

        return user


class UniversalSignupSerializer(serializers.Serializer):
    """Universal Serializer handling all 4 signup types:
       - jamia_faregin (Takmil / Faregin)
       - current_student (Jamiar Bortoman Chatro)
       - jamia_ustad (Jamiar Ustadgon)
       - general_user (Onanno)
    """
    profile_type = serializers.ChoiceField(
        choices=['jamia_faregin', 'current_student', 'jamia_ustad', 'general_user', 'takmil_student', 'non_takmil_student']
    )
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField(max_length=150)
    father_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    phone_number = serializers.CharField(max_length=20)
    district = serializers.CharField(max_length=100, required=False, allow_blank=True)
    upazila = serializers.CharField(max_length=100, required=False, allow_blank=True)

    # Faregin specific fields
    dakhila_number = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True)
    blood_group = serializers.CharField(max_length=10, required=False, allow_blank=True, allow_null=True)
    period_of_education = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    fuzalaye_jamia_name = serializers.CharField(max_length=255, required=False, allow_blank=True, allow_null=True)
    takmil_year_type = serializers.CharField(max_length=20, required=False, allow_blank=True, allow_null=True)
    custom_graduation_year = serializers.CharField(max_length=10, required=False, allow_blank=True, allow_null=True)
    jamia_graduate_id = serializers.IntegerField(required=False, allow_null=True)

    # Current Student specific fields
    jamat = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)

    # Ustad specific fields
    designation = serializers.CharField(max_length=150, required=False, allow_blank=True, allow_null=True)
    department = serializers.CharField(max_length=150, required=False, allow_blank=True, allow_null=True)

    # General User specific fields
    occupation = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)

    def validate(self, data):
        if data.get('password') != data.pop('password_confirm', None):
            raise serializers.ValidationError({'password': 'পাসওয়ার্ড মিলছে না।'})

        email = data.get('email')
        if email and User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError({'email': 'এই ইমেইল দিয়ে ইতোমধ্যে একটি অ্যাকাউন্ট রয়েছে।'})

        phone_number = data.get('phone_number')
        if phone_number and User.objects.filter(phone_number=phone_number).exists():
            raise serializers.ValidationError({'phone_number': 'এই মোবাইল নম্বর দিয়ে ইতোমধ্যে একটি অ্যাকাউন্ট রয়েছে।'})

        profile_type = data.get('profile_type')
        if profile_type in ['jamia_faregin', 'takmil_student']:
            if not data.get('dakhila_number'):
                raise serializers.ValidationError({'dakhila_number': 'দাখিলা নম্বর আবশ্যক।'})
        elif profile_type == 'current_student':
            if not data.get('jamat'):
                raise serializers.ValidationError({'jamat': 'জামাত নির্বাচন করুন।'})
            if not data.get('dakhila_number'):
                raise serializers.ValidationError({'dakhila_number': 'দাখিলা নম্বর দিন।'})

        return data

    def create(self, validated_data):
        profile_type = validated_data.get('profile_type')
        password = validated_data.pop('password')
        dakhila_number = validated_data.pop('dakhila_number', None)
        blood_group = validated_data.pop('blood_group', None)
        period_of_education = validated_data.pop('period_of_education', None)
        fuzalaye_jamia_name = validated_data.pop('fuzalaye_jamia_name', None)
        takmil_year_type = validated_data.pop('takmil_year_type', '26_27')
        custom_graduation_year = validated_data.pop('custom_graduation_year', None)
        jamia_graduate_id = validated_data.pop('jamia_graduate_id', None)
        jamat = validated_data.pop('jamat', None)
        designation = validated_data.pop('designation', None)
        department = validated_data.pop('department', None)
        occupation = validated_data.pop('occupation', None)

        jamia_graduate = None
        if jamia_graduate_id:
            try:
                jamia_graduate = JamiaGraduate.objects.get(id=jamia_graduate_id)
            except JamiaGraduate.DoesNotExist:
                pass

        user = User.objects.create(
            email=validated_data['email'],
            first_name=validated_data['first_name'],
            father_name=validated_data.get('father_name', ''),
            phone_number=validated_data['phone_number'],
            district=validated_data.get('district', ''),
            upazila=validated_data.get('upazila', ''),
            profile_type=profile_type,
            profile_completed=True,
            dakhila_number=dakhila_number,
            blood_group=blood_group,
            jamat=jamat,
            designation=designation,
            department=department,
            occupation=occupation,
            fuzalaye_jamia_name=fuzalaye_jamia_name,
            takmil_year_type=takmil_year_type or '26_27',
            custom_graduation_year=custom_graduation_year,
            jamia_graduate=jamia_graduate
        )
        user.set_password(password)
        user.save()

        # Legacy profiles for backward compatibility
        if profile_type in ['jamia_faregin', 'takmil_student']:
            TakmilStudentProfile.objects.create(
                user=user,
                dakhila_number=dakhila_number or '',
                blood_group=blood_group or 'O+',
                period_of_education=period_of_education or ''
            )
        else:
            NonTakmilStudentProfile.objects.create(
                user=user,
                occupation=occupation or designation or ''
            )

        return user


class UserSerializer(serializers.ModelSerializer):
    takmil_profile = serializers.SerializerMethodField()
    non_takmil_profile = serializers.SerializerMethodField()
    profile_image = serializers.SerializerMethodField()
    cover_image = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'father_name', 'phone_number',
                  'district', 'upazila', 'profile_type', 'profile_completed', 'profile_image',
                  'cover_image', 'bio', 'jamat', 'designation', 'department', 'dakhila_number',
                  'blood_group', 'occupation', 'takmil_year_type', 'custom_graduation_year',
                  'takmil_profile', 'non_takmil_profile']

    def get_profile_image(self, obj):
        if obj.profile_image:
            url = _build_minio_url(obj.profile_image)
            request = self.context.get('request')
            if request and url and url.startswith('/'):
                return request.build_absolute_uri(url)
            return url
        return None

    def get_cover_image(self, obj):
        if obj.cover_image:
            url = _build_minio_url(obj.cover_image)
            request = self.context.get('request')
            if request and url and url.startswith('/'):
                return request.build_absolute_uri(url)
            return url
        return None

    def get_takmil_profile(self, obj):
        try:
            profile = obj.takmil_profile
            return {
                'dakhila_number': profile.dakhila_number,
                'blood_group': profile.blood_group,
                'period_of_education': profile.period_of_education,
            }
        except:
            return None

    def get_non_takmil_profile(self, obj):
        try:
            profile = obj.non_takmil_profile
            return {
                'occupation': profile.occupation,
            }
        except:
            return None


class LoginSerializer(serializers.Serializer):
    """Serializer for login"""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class DuaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dua
        fields = [
            'id',
            'title',
            'icon',
            'arabic',
            'pronunciation',
            'meaning',
            'pronunciation_audio',
            'recitation_audio',
            'audio',
            'created_by',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']


class AppSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppSettings
        fields = ['hijri_date', 'hijri_date_updated_at', 'updated_by']
        read_only_fields = ['hijri_date_updated_at', 'updated_by']


# ============================================
# Prayer Alert Serializers
# ============================================

class GlobalPrayerAlertConfigSerializer(serializers.ModelSerializer):
    prayer_name_display = serializers.CharField(source='get_prayer_name_display', read_only=True)
    adhan_audio_url = serializers.SerializerMethodField()

    class Meta:
        model = GlobalPrayerAlertConfig
        fields = [
            'id', 'prayer_name', 'prayer_name_display',
            'is_globally_enabled', 'default_offset_minutes',
            'notification_title_template', 'notification_body_template',
            'adhan_audio', 'adhan_audio_url', 'is_adhan_enabled',
            'updated_by', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'updated_by', 'created_at', 'updated_at']

    def get_adhan_audio_url(self, obj):
        request = self.context.get('request')
        if obj.adhan_audio:
            if request:
                return request.build_absolute_uri(obj.adhan_audio.url)
            return obj.adhan_audio.url
        return None


class PrayerAlertSettingSerializer(serializers.ModelSerializer):
    prayer_name_display = serializers.CharField(source='get_prayer_name_display', read_only=True)

    class Meta:
        model = PrayerAlertSetting
        fields = [
            'id', 'prayer_name', 'prayer_name_display',
            'is_enabled', 'offset_minutes', 'is_silent',
            'use_custom_adhan', 'custom_adhan_audio',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PrayerAlertSettingBulkSerializer(serializers.Serializer):
    """Bulk update/create prayer alert settings for a user."""
    settings = PrayerAlertSettingSerializer(many=True)

    def validate_settings(self, value):
        prayer_names = [s['prayer_name'] for s in value]
        valid_names = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']
        for name in prayer_names:
            if name not in valid_names:
                raise serializers.ValidationError(f'Invalid prayer name: {name}')
        if len(set(prayer_names)) != len(prayer_names):
            raise serializers.ValidationError('Duplicate prayer names not allowed')
        return value


class PrayerAlertLogSerializer(serializers.ModelSerializer):
    prayer_name_display = serializers.CharField(source='get_prayer_name_display', read_only=True)

    class Meta:
        model = PrayerAlertLog
        fields = [
            'id', 'prayer_name', 'prayer_name_display',
            'scheduled_time', 'delivered_at', 'is_read', 'read_at',
            'location_used', 'calculation_method', 'notification_type',
            'created_at',
        ]
        read_only_fields = fields


class PrayerAlertLogCreateSerializer(serializers.ModelSerializer):
    """For creating alert logs (mark delivered, mark read)."""

    class Meta:
        model = PrayerAlertLog
        fields = [
            'prayer_name', 'scheduled_time', 'delivered_at',
            'is_read', 'read_at', 'location_used',
            'calculation_method', 'notification_type', 'device_token',
        ]


class DeviceTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceToken
        fields = ['id', 'token', 'device_type', 'is_active', 'last_used_at', 'created_at']
        read_only_fields = ['id', 'last_used_at', 'created_at']


class DeviceTokenRegisterSerializer(serializers.Serializer):
    """Register or update FCM device token."""
    token = serializers.CharField(max_length=500)
    device_type = serializers.ChoiceField(
        choices=['android', 'ios', 'web'],
        default='android'
    )


class FollowSerializer(serializers.ModelSerializer):
    """Serializer for followers list - returns follower (the person who follows) info."""
    follower_name = serializers.SerializerMethodField()
    follower_image = serializers.SerializerMethodField()
    follower_email = serializers.SerializerMethodField()
    is_following_back = serializers.SerializerMethodField()

    class Meta:
        model = Follow
        fields = ['id', 'follower', 'follower_name', 'follower_image', 'follower_email', 'is_following_back', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_follower_name(self, obj):
        user = obj.follower
        name = f"{user.first_name or ''} {user.last_name or ''}".strip()
        return name or user.email

    def get_follower_image(self, obj):
        if obj.follower.profile_image:
            url = _build_minio_url(obj.follower.profile_image)
            request = self.context.get('request')
            if request and url and url.startswith('/'):
                return request.build_absolute_uri(url)
            return url
        return None

    def get_follower_email(self, obj):
        return obj.follower.email

    def get_is_following_back(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Follow.objects.filter(follower=request.user, following=obj.follower).exists()
        return False


class FollowingSerializer(serializers.ModelSerializer):
    """Serializer for following list - returns following (the person being followed) info."""
    following_name = serializers.SerializerMethodField()
    following_image = serializers.SerializerMethodField()
    following_email = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()

    class Meta:
        model = Follow
        fields = ['id', 'following', 'following_name', 'following_image', 'following_email', 'is_following', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_following_name(self, obj):
        user = obj.following
        name = f"{user.first_name or ''} {user.last_name or ''}".strip()
        return name or user.email

    def get_following_image(self, obj):
        if obj.following.profile_image:
            url = _build_minio_url(obj.following.profile_image)
            request = self.context.get('request')
            if request and url and url.startswith('/'):
                return request.build_absolute_uri(url)
            return url
        return None

    def get_following_email(self, obj):
        return obj.following.email

    def get_is_following(self, obj):
        """Check if the current user is following this person."""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Follow.objects.filter(follower=request.user, following=obj.following).exists()
        return False


class FollowStatusSerializer(serializers.Serializer):
    """Serializer for follow status response."""
    is_following = serializers.BooleanField()
    follower_count = serializers.IntegerField()
    following_count = serializers.IntegerField()


class DiarySerializer(serializers.ModelSerializer):
    """Serializer for personal diary entries."""
    date_display = serializers.SerializerMethodField()

    class Meta:
        model = Diary
        fields = [
            'id', 'title', 'content', 'tag', 'emoji',
            'entry_date', 'hijri_date', 'mood', 'weather',
            'paper_theme', 'font_family', 'is_pinned', 'page_number',
            'date_display', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'date_display', 'created_at', 'updated_at']

    def get_date_display(self, obj):
        """Format date in Bangla."""
        months = [
            'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
            'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
        ]
        d = obj.entry_date or obj.created_at
        digits = {'0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'}
        to_bn = lambda n: ''.join(digits.get(c, c) for c in str(n))
        return f"{to_bn(d.day)} {months[d.month - 1]}, {to_bn(d.year)}"


class AdminPushNotificationSerializer(serializers.Serializer):
    """Admin sends custom push notification to users."""
    title = serializers.CharField(max_length=255)
    body = serializers.CharField()
    target = serializers.ChoiceField(
        choices=['all', 'takmil', 'non_takmil'],
        default='all'
    )
    prayer_name = serializers.ChoiceField(
        choices=['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'custom'],
        default='custom',
        required=False
    )
    sound = serializers.BooleanField(default=True)
    data = serializers.JSONField(required=False, default=dict)


class JamiaGraduateSerializer(serializers.ModelSerializer):
    """Serializer for Jamia Graduate entries."""
    created_by_name = serializers.ReadOnlyField(source='created_by.get_full_name')
    registered_user_id = serializers.SerializerMethodField()

    class Meta:
        model = JamiaGraduate
        fields = [
            'id', 'name', 'father_name', 'village', 'post_office', 
            'thana', 'district', 'mobile', 'blood_group', 
            'graduation_year', 'created_by', 'created_by_name', 
            'registered_user_id', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_by_name', 'registered_user_id', 'created_at', 'updated_at']

    def get_registered_user_id(self, obj):
        user = obj.users.first()
        return user.id if user else None
