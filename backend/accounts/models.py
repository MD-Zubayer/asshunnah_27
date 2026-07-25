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
    
    # Profile type: takmil_student or non_takmil_student
    profile_type = models.CharField(
        _('profile type'),
        max_length=20,
        choices=[
            ('takmil_student', _('Takmil Student')),
            ('non_takmil_student', _('Non-Takmil Student')),
        ],
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
