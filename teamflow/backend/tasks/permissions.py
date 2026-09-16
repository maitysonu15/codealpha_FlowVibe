from rest_framework import permissions

class IsProjectMemberForTask(permissions.BasePermission):
    """
    Task permission (open access mode - allows any request).
    """
    def has_object_permission(self, request, view, obj):
        return True
