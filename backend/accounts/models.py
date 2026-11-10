from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError(_('The Email field must be set'))
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError(_('Superuser must have is_staff=True.'))
        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_('Superuser must have is_superuser=True.'))

        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(_('email address'), unique=True)
    first_name = models.CharField(_('first name'), max_length=150, blank=True)
    last_name = models.CharField(_('last name'), max_length=150, blank=True)
    father_name = models.CharField(_('father name'), max_length=150, blank=True)
    phone_number = models.CharField(_('phone number'), max_length=20, blank=True, unique=True)
    
    # Address fields
    district = models.CharField(_('district'), max_length=100, blank=True)
    upazila = models.CharField(_('upazila'), max_length=100, blank=True)
    
    # Profile type: jamia_faregin, current_student, jamia_ustad, general_user (also legacy takmil_student, non_takmil_student)
    profile_type = models.CharField(
        _('profile type'),
        max_length=30,
        choices=[
            ('jamia_faregin', _('Jamia Faregin')),
            ('current_student', _('Current Student')),
            ('jamia_ustad', _('Jamia Ustad')),
            ('general_user', _('General User')),
            ('takmil_student', _('Takmil Student')),
            ('non_takmil_student', _('Non-Takmil Student')),
        ],
        blank=True,
        null=True
    )
    
    # Specific fields for different user types
    jamat = models.CharField(_('jamat'), max_length=100, blank=True, null=True, help_text=_('Class/Jamat for current students'))
    designation = models.CharField(_('designation'), max_length=150, blank=True, null=True, help_text=_('Designation for Ustads'))
    department = models.CharField(_('department'), max_length=150, blank=True, null=True, help_text=_('Department for Ustads'))
    dakhila_number = models.CharField(_('dakhila number'), max_length=50, blank=True, null=True)
    blood_group = models.CharField(_('blood group'), max_length=10, blank=True, null=True)
    occupation = models.CharField(_('occupation'), max_length=100, blank=True, null=True)
    
    profile_image = models.CharField(_('profile image'), max_length=500, blank=True, null=True)
    cover_image = models.CharField(_('cover image'), max_length=500, blank=True, null=True)
    bio = models.TextField(_('bio'), max_length=500, blank=True)
    
    # Link to Fuzalaye Jamia list (for Takmil students)
    fuzalaye_jamia_name = models.CharField(
        _('fuzalaye jamia name'),
        max_length=255,
        blank=True,
        null=True,
        unique=True,
        help_text=_('Exact name from Fuzalaye Jamia list, used to link user profile')
    )
    
    jamia_graduate = models.ForeignKey(
        'JamiaGraduate',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='users',
        verbose_name=_('jamia graduate')
    )
    takmil_year_type = models.CharField(
        _('takmil year type'),
        max_length=20,
        choices=[('26_27', '26-27'), ('other', 'Other')],
        default='26_27'
    )
    custom_graduation_year = models.CharField(
        _('custom graduation year'),
        max_length=10,
        blank=True,
        null=True
    )
    
    is_staff = models.BooleanField(_('staff status'), default=False)
    is_active = models.BooleanField(_('active'), default=True)
    date_joined = models.DateTimeField(_('date joined'), default=timezone.now)
    profile_completed = models.BooleanField(_('profile completed'), default=False)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    class Meta:
        verbose_name = _('user')
        verbose_name_plural = _('users')

    def get_full_name(self):
        return f'{self.first_name} {self.last_name}'.strip()

    def get_short_name(self):
        return self.first_name or self.email


class TakmilStudentProfile(models.Model):
    """Profile for Takmil students"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='takmil_profile')
    dakhila_number = models.CharField(_('dakhila number'), max_length=50, blank=True)
    blood_group = models.CharField(
        _('blood group'),
        max_length=5,
        choices=[
            ('O+', 'O+'),
            ('O-', 'O-'),
            ('A+', 'A+'),
            ('A-', 'A-'),
            ('B+', 'B+'),
            ('B-', 'B-'),
            ('AB+', 'AB+'),
            ('AB-', 'AB-'),
        ],
        blank=True
    )
    period_of_education = models.CharField(
        _('period of education'),
        max_length=100,
        blank=True,
        help_text=_('e.g., 5 years, 7 years, etc.')
    )
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('takmil student profile')
        verbose_name_plural = _('takmil student profiles')

    def __str__(self):
        return f"Takmil Profile - {self.user.email}"


class NonTakmilStudentProfile(models.Model):
    """Profile for non-Takmil students"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='non_takmil_profile')
    occupation = models.CharField(_('occupation'), max_length=100, blank=True)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('non-takmil student profile')
        verbose_name_plural = _('non-takmil student profiles')

    def __str__(self):
        return f"Non-Takmil Profile - {self.user.email}"


class Dua(models.Model):
    title = models.CharField(_('title'), max_length=255)
    icon = models.CharField(_('icon'), max_length=64, blank=True, default='hand-left-outline')
    arabic = models.TextField(_('arabic text'))
    pronunciation = models.TextField(_('pronunciation'), blank=True)
    meaning = models.TextField(_('meaning'), blank=True)
    pronunciation_audio = models.FileField(_('pronunciation audio'), upload_to='duas/pronunciations/', blank=True, null=True)
    recitation_audio = models.FileField(_('recitation audio'), upload_to='duas/recitations/', blank=True, null=True)
    audio = models.FileField(_('audio'), upload_to='duas/audio/', blank=True, null=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='uploaded_duas')
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('dua')
        verbose_name_plural = _('duas')

    def __str__(self):
        return self.title


class AppSettings(models.Model):
    """Singleton model for app-wide settings"""
    hijri_date = models.CharField(_('hijri date'), max_length=100, blank=True, default='')
    hijri_date_updated_at = models.DateTimeField(_('hijri date updated at'), null=True, blank=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='settings_updated')

    class Meta:
        verbose_name = _('app settings')
        verbose_name_plural = _('app settings')

    def save(self, *args, **kwargs):
        # Ensure only one instance exists (singleton)
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return f"App Settings (Hijri: {self.hijri_date})"


# ============================================
# Prayer Alert Models
# ============================================

PRAYER_NAME_CHOICES = [
    ('fajr', 'ফজর'),
    ('dhuhr', 'যোহর'),
    ('asr', 'আসর'),
    ('maghrib', 'মাগরিব'),
    ('isha', 'এশা'),
]


class GlobalPrayerAlertConfig(models.Model):
    """Admin-controlled global alert configuration per prayer."""
    prayer_name = models.CharField(
        _('prayer name'),
        max_length=20,
        choices=PRAYER_NAME_CHOICES,
        unique=True
    )
    is_globally_enabled = models.BooleanField(
        _('globally enabled'),
        default=True,
        help_text=_('Global on/off switch for this prayer alert')
    )
    default_offset_minutes = models.IntegerField(
        _('default offset (minutes)'),
        default=0,
        help_text=_('Minutes before prayer time to send alert (negative = after)')
    )
    notification_title_template = models.CharField(
        _('notification title template'),
        max_length=255,
        blank=True,
        default='নামাজের সময় হয়েছে ({prayer_name})',
        help_text=_('Use {prayer_name} as placeholder')
    )
    notification_body_template = models.TextField(
        _('notification body template'),
        blank=True,
        default='হালকা বিরতি নিন এবং নামাজের জন্য প্রস্তুতি নিন। এখন {prayer_name}-এর ওয়াক্ত।',
        help_text=_('Use {prayer_name} as placeholder')
    )
    adhan_audio = models.FileField(
        _('adhan audio'),
        upload_to='alerts/adhan/',
        blank=True,
        null=True
    )
    is_adhan_enabled = models.BooleanField(
        _('adhan enabled'),
        default=False,
        help_text=_('Play adhan audio with notification')
    )
    updated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='alert_configs_updated'
    )
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('global prayer alert config')
        verbose_name_plural = _('global prayer alert configs')

    def __str__(self):
        return f"Alert Config - {self.get_prayer_name_display()}"


class PrayerAlertSetting(models.Model):
    """Per-user prayer alert preferences."""
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='prayer_alert_settings'
    )
    prayer_name = models.CharField(
        _('prayer name'),
        max_length=20,
        choices=PRAYER_NAME_CHOICES
    )
    is_enabled = models.BooleanField(
        _('enabled'),
        default=True,
        help_text=_('User-level on/off for this prayer alert')
    )
    offset_minutes = models.IntegerField(
        _('offset (minutes)'),
        default=0,
        help_text=_('Personal offset: minutes before prayer time (negative = after)')
    )
    is_silent = models.BooleanField(
        _('silent mode'),
        default=False,
        help_text=_('Vibrate only, no sound')
    )
    use_custom_adhan = models.BooleanField(
        _('use custom adhan'),
        default=False
    )
    custom_adhan_audio = models.FileField(
        _('custom adhan audio'),
        upload_to='alerts/user_adhan/',
        blank=True,
        null=True
    )
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('prayer alert setting')
        verbose_name_plural = _('prayer alert settings')
        unique_together = ['user', 'prayer_name']

    def __str__(self):
        return f"{self.user.email} - {self.get_prayer_name_display()} Alert"


class PrayerAlertLog(models.Model):
    """Track alert delivery for analytics."""
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='prayer_alert_logs'
    )
    prayer_name = models.CharField(
        _('prayer name'),
        max_length=20,
        choices=PRAYER_NAME_CHOICES
    )
    scheduled_time = models.DateTimeField(
        _('scheduled time'),
        help_text=_('When the alert was scheduled for')
    )
    delivered_at = models.DateTimeField(
        _('delivered at'),
        null=True,
        blank=True,
        help_text=_('When the alert was actually delivered')
    )
    is_read = models.BooleanField(
        _('is read'),
        default=False
    )
    read_at = models.DateTimeField(
        _('read at'),
        null=True,
        blank=True
    )
    location_used = models.CharField(
        _('location used'),
        max_length=255,
        blank=True,
        default=''
    )
    calculation_method = models.CharField(
        _('calculation method'),
        max_length=50,
        blank=True,
        default=''
    )
    notification_type = models.CharField(
        _('notification type'),
        max_length=20,
        choices=[
            ('local', 'Local'),
            ('push', 'Push (FCM)'),
            ('sms', 'SMS'),
        ],
        default='local'
    )
    device_token = models.CharField(
        _('device token'),
        max_length=500,
        blank=True,
        default='',
        help_text=_('FCM device token for push notifications')
    )
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)

    class Meta:
        verbose_name = _('prayer alert log')
        verbose_name_plural = _('prayer alert logs')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} - {self.get_prayer_name_display()} @ {self.scheduled_time}"


class Follow(models.Model):
    """Follow relationship between users."""
    follower = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='following'
    )
    following = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='followers'
    )
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)

    class Meta:
        verbose_name = _('follow')
        verbose_name_plural = _('follows')
        unique_together = ['follower', 'following']
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.follower.email} follows {self.following.email}"


class DeviceToken(models.Model):
    """Store FCM device tokens for push notifications."""
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='device_tokens'
    )
    token = models.CharField(
        _('FCM token'),
        max_length=500,
        unique=True
    )
    device_type = models.CharField(
        _('device type'),
        max_length=20,
        choices=[
            ('android', 'Android'),
            ('ios', 'iOS'),
            ('web', 'Web'),
        ],
        default='android'
    )
    is_active = models.BooleanField(
        _('is active'),
        default=True,
        help_text=_('Inactive tokens are skipped during push')
    )
    last_used_at = models.DateTimeField(
        _('last used at'),
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('device token')
        verbose_name_plural = _('device tokens')

    def __str__(self):
        return f"{self.user.email} - {self.device_type}"


# ============================================
# Diary Model
# ============================================

class Diary(models.Model):
    """Personal diary entries for users."""
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='diaries'
    )
    title = models.CharField(_('title'), max_length=200)
    content = models.TextField(_('content'))
    tag = models.CharField(_('tag'), max_length=50, blank=True, default='সাধারণ')
    emoji = models.CharField(_('emoji'), max_length=10, blank=True, default='📝')
    entry_date = models.DateField(_('entry date'), null=True, blank=True)
    hijri_date = models.CharField(_('hijri date'), max_length=100, blank=True, default='')
    mood = models.CharField(_('mood'), max_length=50, blank=True, default='')
    weather = models.CharField(_('weather'), max_length=50, blank=True, default='')
    paper_theme = models.CharField(_('paper theme'), max_length=30, blank=True, default='cream')
    font_family = models.CharField(_('font family'), max_length=40, blank=True, default='handwriting')
    is_pinned = models.BooleanField(_('is pinned'), default=False)
    page_number = models.PositiveIntegerField(_('page number'), null=True, blank=True)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('diary')
        verbose_name_plural = _('diaries')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} - {self.title}"


# ============================================
# Jamia Graduate (Sokol Faregin) Model
# ============================================

class JamiaGraduate(models.Model):
    """Graduates list where users can view and enter new data."""
    name = models.CharField(_('name'), max_length=255)
    father_name = models.CharField(_('father name'), max_length=255)
    village = models.CharField(_('village'), max_length=255, blank=True)
    post_office = models.CharField(_('post office'), max_length=255, blank=True)
    thana = models.CharField(_('thana'), max_length=255)
    district = models.CharField(_('district'), max_length=255)
    mobile = models.CharField(_('mobile'), max_length=255, blank=True)
    blood_group = models.CharField(_('blood group'), max_length=10, blank=True)
    graduation_year = models.CharField(_('graduation year'), max_length=10)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_graduates',
        verbose_name=_('created by')
    )
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('jamia graduate')
        verbose_name_plural = _('jamia graduates')
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.graduation_year})"
