from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import TakmilStudentProfile, NonTakmilStudentProfile

User = get_user_model()


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

    def validate(self, data):
        if data['password'] != data.pop('password_confirm'):
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        return data

    def create(self, validated_data):
        # Extract profile-specific fields
        dakhila_number = validated_data.pop('dakhila_number')
        blood_group = validated_data.pop('blood_group')
        period_of_education = validated_data.pop('period_of_education')
        password = validated_data.pop('password')

        # Create user
        user = User.objects.create(
            email=validated_data['email'],
            first_name=validated_data['first_name'],
            father_name=validated_data.get('father_name', ''),
            phone_number=validated_data['phone_number'],
            district=validated_data['district'],
            upazila=validated_data['upazila'],
            profile_type='takmil_student',
            profile_completed=True
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


class UserSerializer(serializers.ModelSerializer):
    takmil_profile = serializers.SerializerMethodField()
    non_takmil_profile = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'father_name', 'phone_number',
                  'district', 'upazila', 'profile_type', 'profile_completed', 'takmil_profile', 'non_takmil_profile']

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
