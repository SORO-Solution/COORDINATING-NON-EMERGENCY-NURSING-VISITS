from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CustomUserViewSet, NurseProfileViewSet, NurseAvailabilityViewSet, AppointmentViewSet, current_user, register
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

router = DefaultRouter()
router.register(r'users', CustomUserViewSet)
router.register(r'nurses', NurseProfileViewSet)
router.register(r'availabilities', NurseAvailabilityViewSet)
router.register(r'appointments', AppointmentViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', current_user, name='current_user'),
    path('register/', register, name='register'),
]
