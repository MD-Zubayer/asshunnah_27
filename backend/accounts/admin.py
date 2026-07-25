from django import forms
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import ReadOnlyPasswordHashField
from django.utils.translation import gettext_lazy as _

from .models import User, TakmilStudentProfile, NonTakmilStudentProfile


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
    list_display = ('email', 'first_name', 'last_name', 'profile_type', 'is_staff', 'is_active')
    list_filter = ('is_staff', 'is_active', 'is_superuser', 'profile_type')
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


admin.site.register(User, UserAdmin)
admin.site.register(TakmilStudentProfile, TakmilStudentProfileAdmin)
admin.site.register(NonTakmilStudentProfile, NonTakmilStudentProfileAdmin)
