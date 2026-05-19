from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    CustomUserViewSet, NurseProfileViewSet, NurseAvailabilityViewSet,
    AppointmentViewSet, MessageViewSet, SpecialisationChangeRequestViewSet,
    current_user, register, request_visit, send_message,
    upload_media, thread_summary,
)
from .reports import (
    admin_appointments_csv, admin_appointments_pdf,
    admin_workload_pdf, admin_users_csv, admin_availability_csv,
    nurse_schedule_csv, nurse_schedule_pdf, nurse_availability_csv,
)

router = DefaultRouter()
router.register(r'users', CustomUserViewSet)
router.register(r'nurses', NurseProfileViewSet)
router.register(r'availabilities', NurseAvailabilityViewSet)
router.register(r'appointments', AppointmentViewSet)
router.register(r'messages', MessageViewSet, basename='message')
router.register(r'spec-requests', SpecialisationChangeRequestViewSet, basename='spec-request')

# Custom endpoints BEFORE router so /<pk>/ patterns don't shadow them.
urlpatterns = [
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', current_user, name='current_user'),
    path('register/', register, name='register'),
    path('appointments/request/', request_visit, name='request_visit'),
    path('messages/send/', send_message, name='send_message'),
    path('messages/upload-media/', upload_media, name='upload_media'),
    path('messages/thread-summary/', thread_summary, name='thread_summary'),

    # Admin reports
    path('reports/admin/appointments/csv/', admin_appointments_csv, name='report_admin_appts_csv'),
    path('reports/admin/appointments/pdf/', admin_appointments_pdf, name='report_admin_appts_pdf'),
    path('reports/admin/workload/pdf/', admin_workload_pdf, name='report_admin_workload_pdf'),
    path('reports/admin/users/csv/', admin_users_csv, name='report_admin_users_csv'),
    path('reports/admin/availability/csv/', admin_availability_csv, name='report_admin_avail_csv'),

    # Nurse reports
    path('reports/nurse/schedule/csv/', nurse_schedule_csv, name='report_nurse_sched_csv'),
    path('reports/nurse/schedule/pdf/', nurse_schedule_pdf, name='report_nurse_sched_pdf'),
    path('reports/nurse/availability/csv/', nurse_availability_csv, name='report_nurse_avail_csv'),

    path('', include(router.urls)),
]
