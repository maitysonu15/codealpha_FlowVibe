from django.contrib.auth.models import User
from rest_framework.authentication import SessionAuthentication, BaseAuthentication


def get_default_flowvibe_user():
    """
    Get or create the default active user for open backend access fallback.
    """
    user = User.objects.filter(is_active=True).first()
    if not user:
        user, _ = User.objects.get_or_create(
            username='flowvibe',
            defaults={
                'email': 'admin@flowvibe.io',
                'first_name': 'FlowVibe',
                'last_name': 'Admin',
                'is_staff': True,
                'is_superuser': True,
            }
        )
        from users.models import UserProfile
        UserProfile.objects.get_or_create(user=user)
    return user


class CsrfExemptSessionAuthentication(SessionAuthentication):
    """
    Session authentication that reads Django session cookies without enforcing CSRF,
    allowing open and flexible API calls while properly respecting login / logout states.
    """
    def enforce_csrf(self, request):
        return  # CSRF handled at client layer; prevents CSRF failures on API calls


class FlowVibeOpenAuthentication(BaseAuthentication):
    """
    Backwards-compatible authentication class.
    """
    def authenticate(self, request):
        http_request = getattr(request, '_request', request)
        user = getattr(http_request, 'user', None)
        if user and user.is_authenticated:
            return (user, None)
        return None
