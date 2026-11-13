from django import forms
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import ReadOnlyPasswordHashField
from django.utils.translation import gettext_lazy as _

from .models import (
    User, TakmilStudentProfile, NonTakmilStudentProfile, Dua,
    GlobalPrayerAlertConfig, PrayerAlertSetting, PrayerAlertLog, DeviceToken,
    AppSettings, PasswordResetOTP, EmailVerificationOTP, ContentReport
)


class UserCreationForm(forms.ModelForm):
    password1 = forms.CharField(label=_('Password'), widget=forms.PasswordInput)
    password2 = forms.CharField(label=_('Password confirmation'), widget=forms.PasswordInput)

    class Meta:
        model = User
        fields = ('email', 'first_name', 'last_name')

    def clean_password2(self):
        password1 = self.cleaned_data.get('password1')
        password2 = self.cleaned_data.get('password2')
        if password1 and password2 and password1 != password2:
            raise forms.ValidationError(_('The two password fields didn’t match.'))
        return password2

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data['password1'])
        if commit:
            user.save()
        return user


class UserChangeForm(forms.ModelForm):
    password = ReadOnlyPasswordHashField(label=_('Password'))

    class Meta:
        model = User
        fields = ('email', 'password', 'first_name', 'last_name', 'is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')

    def clean_password(self):
        return self.initial['password']


class UserAdmin(BaseUserAdmin):
    form = UserChangeForm
    add_form = UserCreationForm
    model = User
    list_display = ('email', 'first_name', 'last_name', 'profile_type', 'is_email_verified', 'is_staff', 'is_active')
    list_filter = ('is_email_verified', 'is_staff', 'is_active', 'is_superuser', 'profile_type')
    search_fields = ('email', 'first_name', 'last_name', 'phone_number')
    ordering = ('email',)
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        (_('Personal info'), {'fields': ('first_name', 'last_name', 'father_name', 'phone_number')}),
        (_('Address'), {'fields': ('district', 'upazila')}),
        (_('Profile'), {'fields': ('profile_type', 'profile_completed')}),
        (_('Permissions'), {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        (_('Important dates'), {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2', 'first_name', 'last_name', 'father_name', 'phone_number', 'is_staff', 'is_active'),
        }),
    )


class TakmilStudentProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'dakhila_number', 'blood_group', 'period_of_education')
    list_filter = ('blood_group', 'created_at')
    search_fields = ('user__email', 'user__first_name', 'dakhila_number')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        (None, {'fields': ('user',)}),
        (_('Education'), {'fields': ('dakhila_number', 'period_of_education')}),
        (_('Medical'), {'fields': ('blood_group',)}),
        (_('Dates'), {'fields': ('created_at', 'updated_at')}),
    )


class NonTakmilStudentProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'occupation', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__email', 'user__first_name', 'occupation')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        (None, {'fields': ('user',)}),
        (_('Occupation'), {'fields': ('occupation',)}),
        (_('Dates'), {'fields': ('created_at', 'updated_at')}),
    )


class DuaAdmin(admin.ModelAdmin):
    list_display = ('title', 'created_by', 'created_at')
    list_filter = ('created_at', 'created_by')
    search_fields = ('title', 'arabic', 'meaning')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        (None, {'fields': ('title', 'icon', 'arabic', 'pronunciation', 'meaning')}),
        ('Audio', {'fields': ('audio', 'pronunciation_audio', 'recitation_audio')}),
        ('Metadata', {'fields': ('created_by', 'created_at', 'updated_at')}),
    )

# ============================================
# Prayer Alert Admin
# ============================================

class GlobalPrayerAlertConfigAdmin(admin.ModelAdmin):
    list_display = ('prayer_name', 'is_globally_enabled', 'default_offset_minutes', 'is_adhan_enabled', 'updated_by', 'updated_at')
    list_filter = ('is_globally_enabled', 'is_adhan_enabled', 'prayer_name')
    search_fields = ('prayer_name',)
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        (None, {'fields': ('prayer_name', 'is_globally_enabled', 'default_offset_minutes')}),
        (_('Notification Template'), {'fields': ('notification_title_template', 'notification_body_template')}),
        (_('Adhan'), {'fields': ('adhan_audio', 'is_adhan_enabled')}),
        (_('Metadata'), {'fields': ('updated_by', 'created_at', 'updated_at')}),
    )


class PrayerAlertSettingAdmin(admin.ModelAdmin):
    list_display = ('user', 'prayer_name', 'is_enabled', 'offset_minutes', 'is_silent', 'updated_at')
    list_filter = ('prayer_name', 'is_enabled', 'is_silent')
    search_fields = ('user__email', 'user__first_name', 'prayer_name')
    readonly_fields = ('created_at', 'updated_at')
    raw_id_fields = ('user',)


class PrayerAlertLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'prayer_name', 'scheduled_time', 'delivered_at', 'is_read', 'notification_type', 'created_at')
    list_filter = ('prayer_name', 'is_read', 'notification_type')
    search_fields = ('user__email', 'user__first_name', 'prayer_name')
    readonly_fields = ('created_at',)
    raw_id_fields = ('user',)
    date_hierarchy = 'scheduled_time'


class DeviceTokenAdmin(admin.ModelAdmin):
    list_display = ('user', 'device_type', 'is_active', 'last_used_at', 'created_at')
    list_filter = ('device_type', 'is_active')
    search_fields = ('user__email', 'user__first_name', 'token')
    readonly_fields = ('created_at', 'updated_at')
    raw_id_fields = ('user',)


class PasswordResetOTPAdmin(admin.ModelAdmin):
    list_display = ('email', 'user', 'otp_code', 'is_used', 'attempts', 'expires_at', 'created_at')
    list_filter = ('is_used', 'created_at')
    search_fields = ('email', 'user__email', 'otp_code')
    readonly_fields = ('created_at',)
    raw_id_fields = ('user',)


class EmailVerificationOTPAdmin(admin.ModelAdmin):
    list_display = ('email', 'user', 'otp_code', 'is_used', 'attempts', 'expires_at', 'created_at')
    list_filter = ('is_used', 'created_at')
    search_fields = ('email', 'user__email', 'otp_code')
    readonly_fields = ('created_at',)
    raw_id_fields = ('user',)


class ContentReportAdmin(admin.ModelAdmin):
    list_display = ('id', 'report_type', 'reporter', 'target_user', 'target_id', 'reason', 'status', 'created_at')
    list_filter = ('report_type', 'status', 'created_at')
    search_fields = ('reporter__email', 'reporter__first_name', 'target_user__email', 'target_user__first_name', 'reason', 'description', 'target_id')
    readonly_fields = ('created_at', 'updated_at')
    actions = ['mark_resolved', 'ban_target_user', 'dismiss_report']

    def mark_resolved(self, request, queryset):
        queryset.update(status='resolved')
        self.message_user(request, "রিপোর্টসমূহ 'Resolved' হিসেবে চিহ্নিত হয়েছে।")
    mark_resolved.short_description = "Mark as Resolved (সমাধানকৃত)"

    def ban_target_user(self, request, queryset):
        count = 0
        for report in queryset:
            if report.target_user and report.target_user.is_active:
                report.target_user.is_active = False
                report.target_user.save(update_fields=['is_active'])
                count += 1
        queryset.update(status='resolved', admin_notes="User suspended due to UGC policy violation.")
        self.message_user(request, f"{count} জন অভিযুক্ত ব্যবহারকারীকে ব্যান (deactivated) করা হয়েছে।")
    ban_target_user.short_description = "Ban/Suspend reported users (ইউজার ব্যান করুন)"

    def dismiss_report(self, request, queryset):
        queryset.update(status='dismissed')
        self.message_user(request, "রিপোর্টসমূহ 'Dismissed' করা হয়েছে।")
    dismiss_report.short_description = "Dismiss report (বাতিল করুন)"


admin.site.register(User, UserAdmin)
admin.site.register(TakmilStudentProfile, TakmilStudentProfileAdmin)
admin.site.register(NonTakmilStudentProfile, NonTakmilStudentProfileAdmin)
admin.site.register(Dua, DuaAdmin)
admin.site.register(GlobalPrayerAlertConfig, GlobalPrayerAlertConfigAdmin)
admin.site.register(PrayerAlertSetting, PrayerAlertSettingAdmin)
admin.site.register(PrayerAlertLog, PrayerAlertLogAdmin)
admin.site.register(DeviceToken, DeviceTokenAdmin)
admin.site.register(PasswordResetOTP, PasswordResetOTPAdmin)
admin.site.register(EmailVerificationOTP, EmailVerificationOTPAdmin)
admin.site.register(ContentReport, ContentReportAdmin)

