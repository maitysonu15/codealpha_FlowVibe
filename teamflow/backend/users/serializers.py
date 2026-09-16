from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from .models import UserProfile

class UserSerializer(serializers.ModelSerializer):
    initials = serializers.SerializerMethodField()
    avatar_color = serializers.SerializerMethodField()
    bio = serializers.SerializerMethodField()
    role_title = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'initials', 'avatar_color', 'bio', 'role_title', 'date_joined']
        read_only_fields = ['id', 'date_joined']

    def get_initials(self, obj):
        if obj.first_name and obj.last_name:
            return f"{obj.first_name[0]}{obj.last_name[0]}".upper()
        elif obj.first_name:
            return obj.first_name[:2].upper()
        return obj.username[:2].upper()

    def get_avatar_color(self, obj):
        profile, _ = UserProfile.objects.get_or_create(user=obj)
        return profile.avatar_color

    def get_bio(self, obj):
        profile, _ = UserProfile.objects.get_or_create(user=obj)
        return profile.bio

    def get_role_title(self, obj):
        profile, _ = UserProfile.objects.get_or_create(user=obj)
        return profile.role_title


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'first_name', 'last_name']
        extra_kwargs = {
            'first_name': {'required': False, 'allow_blank': True},
            'last_name': {'required': False, 'allow_blank': True},
            'email': {'required': True},
        }

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email address already exists.")
        return value.lower()

    def validate(self, attrs):
        if 'password_confirm' in attrs and attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password_confirm": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm', None)
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        UserProfile.objects.get_or_create(user=user)
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    bio = serializers.CharField(required=False, allow_blank=True)
    role_title = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'bio', 'role_title']

    def update(self, instance, validated_data):
        bio = validated_data.pop('bio', None)
        role_title = validated_data.pop('role_title', None)

        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()

        profile, _ = UserProfile.objects.get_or_create(user=instance)
        if bio is not None:
            profile.bio = bio
        if role_title is not None:
            profile.role_title = role_title
        profile.save()

        return instance


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
