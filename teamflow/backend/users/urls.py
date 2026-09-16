from django.urls import path
from .views import (
    CSRFTokenView,
    RegisterView,
    LoginView,
    LogoutView,
    CurrentUserView,
    ChangePasswordView,
    UserSearchView,
    FirebaseLoginView,
    FirebaseConfigView
)

urlpatterns = [
    path('csrf/', CSRFTokenView.as_view(), name='auth_csrf'),
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('login/', LoginView.as_view(), name='auth_login'),
    path('logout/', LogoutView.as_view(), name='auth_logout'),
    path('firebase/', FirebaseLoginView.as_view(), name='auth_firebase'),
    path('firebase/config/', FirebaseConfigView.as_view(), name='auth_firebase_config'),
    path('user/', CurrentUserView.as_view(), name='auth_user'),
    path('password/', ChangePasswordView.as_view(), name='auth_password'),
    path('users/search/', UserSearchView.as_view(), name='users_search'),
]
