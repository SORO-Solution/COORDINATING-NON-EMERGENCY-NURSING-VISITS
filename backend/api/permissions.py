from rest_framework.permissions import BasePermission


class IsAdminRole(BasePermission):
    """Allow access only to users with the ADMIN role."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'ADMIN'


class IsNurseRole(BasePermission):
    """Allow access only to users with the NURSE role."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'NURSE'


class IsPatientRole(BasePermission):
    """Allow access only to users with the PATIENT role."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'PATIENT'


class IsNurseOrAdmin(BasePermission):
    """Allow access to NURSE or ADMIN roles."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ('NURSE', 'ADMIN')


class IsOwnerOrAdmin(BasePermission):
    """Object-level: allow if user owns the object or is ADMIN."""
    def has_object_permission(self, request, view, obj):
        if request.user.role == 'ADMIN':
            return True
        if hasattr(obj, 'patient'):
            return obj.patient == request.user
        if hasattr(obj, 'sender'):
            return obj.sender == request.user
        return False
