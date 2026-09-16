from rest_framework import permissions

class IsProjectOwner(permissions.BasePermission):
    """
    Project owner permission (open access mode - allows any request).
    """
    def has_object_permission(self, request, view, obj):
        return True


class IsProjectMemberOrOwner(permissions.BasePermission):
    """
    Project member/owner permission (open access mode - allows any request).
    """
    def has_object_permission(self, request, view, obj):
        return True
