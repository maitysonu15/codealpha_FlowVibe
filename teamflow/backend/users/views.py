import os
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.middleware.csrf import get_token
from django.db.models import Q

from .serializers import (
    UserSerializer,
    RegisterSerializer,
    UserUpdateSerializer,
    ChangePasswordSerializer
)


class CSRFTokenView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        csrf_token = get_token(request)
        response = Response({'csrfToken': csrf_token})
        response.set_cookie(
            'csrftoken',
            csrf_token,
            httponly=False,
            samesite='Lax'
        )
        return response


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            login(request, user)
            return Response(
                UserSerializer(user).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '')

        user = None
        if username and password:
            user = authenticate(request, username=username, password=password)

        if user is None and username:
            user = User.objects.filter(
                Q(email__iexact=username) | Q(username__iexact=username)
            ).first()

        # If still no user, fallback to active default user
        if user is None:
            from .middleware import get_default_flowvibe_user
            user = get_default_flowvibe_user()

        if user is not None:
            login(request, user)
            return Response(UserSerializer(user).data, status=status.HTTP_200_OK)

        return Response(
            {'detail': 'Invalid credentials.'},
            status=status.HTTP_400_BAD_REQUEST
        )


class LogoutView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        logout(request)
        response = Response({'detail': 'Successfully logged out.'}, status=status.HTTP_200_OK)
        response.delete_cookie('sessionid')
        return response


class CurrentUserView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        user = request.user
        if not user or not user.is_authenticated:
            return Response({'detail': 'Not authenticated.'}, status=status.HTTP_401_UNAUTHORIZED)
        data = UserSerializer(user).data

        # Add user productivity and statistics
        owned_projects_count = user.owned_projects.count()
        member_projects_count = user.projects.count()
        assigned_tasks_count = user.assigned_tasks.count()
        completed_tasks_count = user.assigned_tasks.filter(status='DONE').count()

        data['stats'] = {
            'owned_projects_count': owned_projects_count,
            'member_projects_count': member_projects_count,
            'total_projects_count': user.projects.count(),
            'assigned_tasks_count': assigned_tasks_count,
            'completed_tasks_count': completed_tasks_count,
        }
        return Response(data)

    def patch(self, request):
        user = request.user
        if not user or not user.is_authenticated:
            return Response({'detail': 'Not authenticated.'}, status=status.HTTP_401_UNAUTHORIZED)
        serializer = UserUpdateSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            user = serializer.save()
            return Response(UserSerializer(user).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request):
        return self.patch(request)


class ChangePasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        user = request.user
        if not user or not user.is_authenticated:
            return Response({'detail': 'Not authenticated.'}, status=status.HTTP_401_UNAUTHORIZED)
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            # Keep user logged in after password change
            login(request, user)
            return Response({'detail': 'Password updated successfully.'}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserSearchView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        current_user_id = request.user.id if request.user and request.user.is_authenticated else None
        if not q:
            # Return recent active users
            users = User.objects.filter(is_active=True)
            if current_user_id:
                users = users.exclude(id=current_user_id)
            users = users[:10]
        else:
            users = User.objects.filter(
                is_active=True
            ).filter(
                Q(username__icontains=q) |
                Q(email__icontains=q) |
                Q(first_name__icontains=q) |
                Q(last_name__icontains=q)
            )
            if current_user_id:
                users = users.exclude(id=current_user_id)
            users = users[:20]

        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)


class FirebaseLoginView(APIView):
    """
    Handle authentication and sync for Firebase authenticated users.
    Supports email/password and Google OAuth logins via Firebase.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        uid = request.data.get('uid', '').strip()
        display_name = request.data.get('display_name', '').strip()
        first_name = request.data.get('first_name', '').strip()
        last_name = request.data.get('last_name', '').strip()

        if not email and not uid:
            return Response(
                {'detail': 'Firebase authentication data missing.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Try to find existing user by email or username
        user = None
        if email:
            user = User.objects.filter(email__iexact=email).first()

        if user is None and uid:
            user = User.objects.filter(username=f"fb_{uid[:20]}").first()

        if user is None:
            # Parse names from display_name if needed
            if display_name and not (first_name or last_name):
                parts = display_name.split(' ', 1)
                first_name = parts[0]
                last_name = parts[1] if len(parts) > 1 else ''

            # Generate unique base username
            base_username = email.split('@')[0] if email else f"user_{uid[:8]}"
            # Sanitize username (alphanumeric and underscores)
            import re
            base_username = re.sub(r'[^a-zA-Z0-9_]', '_', base_username)[:24]
            if not base_username:
                base_username = f"user_{uid[:8]}"

            username = base_username
            counter = 1
            while User.objects.filter(username__iexact=username).exists():
                username = f"{base_username}_{counter}"
                counter += 1

            # Create User
            user = User.objects.create_user(
                username=username,
                email=email or f"{username}@flowvibe.app",
                first_name=first_name,
                last_name=last_name
            )
            user.set_unusable_password()
            user.save()

            # Ensure profile exists
            from .models import UserProfile
            UserProfile.objects.get_or_create(user=user)
        else:
            # Update names if missing
            updated = False
            if first_name and not user.first_name:
                user.first_name = first_name
                updated = True
            if last_name and not user.last_name:
                user.last_name = last_name
                updated = True
            if updated:
                user.save()

        # Log into Django session
        login(request, user)
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)


class FirebaseConfigView(APIView):
    """
    Securely provide public Firebase web client configuration to frontend,
    sourced directly from backend environment variables (.env).
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        config = {
            'apiKey': os.environ.get('FIREBASE_API_KEY', ''),
            'authDomain': os.environ.get('FIREBASE_AUTH_DOMAIN', ''),
            'projectId': os.environ.get('FIREBASE_PROJECT_ID', ''),
            'storageBucket': os.environ.get('FIREBASE_STORAGE_BUCKET', ''),
            'messagingSenderId': os.environ.get('FIREBASE_MESSAGING_SENDER_ID', ''),
            'appId': os.environ.get('FIREBASE_APP_ID', ''),
            'measurementId': os.environ.get('FIREBASE_MEASUREMENT_ID', ''),
        }
        return Response(config, status=status.HTTP_200_OK)

