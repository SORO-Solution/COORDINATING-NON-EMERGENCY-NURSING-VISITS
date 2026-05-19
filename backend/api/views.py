from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from django.db.models import Q, Max, Count
from django.utils import timezone
from datetime import date as date_cls, timedelta
import os

from .models import CustomUser, NurseProfile, NurseAvailability, Appointment, Message, SpecialisationChangeRequest
from .serializers import (
    CustomUserSerializer, NurseProfileSerializer,
    NurseAvailabilitySerializer, AppointmentSerializer, MessageSerializer,
    SpecialisationChangeRequestSerializer,
)
from .permissions import IsAdminRole, IsNurseRole, IsNurseOrAdmin
from .encryption import encrypt_message


# ── User management (admin only for write, authenticated for read) ──────────

class CustomUserViewSet(viewsets.ModelViewSet):
    queryset = CustomUser.objects.all()
    serializer_class = CustomUserSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAdminRole()]
        return [permissions.IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        data = request.data
        role = data.get('role', 'PATIENT')
        try:
            user = CustomUser.objects.create_user(
                username=data['username'],
                password=data.get('password', 'password123'),
                first_name=data.get('first_name', ''),
                last_name=data.get('last_name', ''),
                email=data.get('email', ''),
                role=role,
                city=data.get('city', ''),
            )
            if role == 'NURSE':
                NurseProfile.objects.create(
                    user=user,
                    specialisation=data.get('specialisation', 'General Care'),
                    city=data.get('city', ''),
                )
            return Response(CustomUserSerializer(user).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


# ── Nurse profiles ───────────────────────────────────────────────────────────

class NurseProfileViewSet(viewsets.ModelViewSet):
    queryset = NurseProfile.objects.select_related('user').all()
    serializer_class = NurseProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'], url_path='me')
    def me(self, request):
        """Return the NurseProfile for the currently authenticated nurse."""
        try:
            profile = NurseProfile.objects.get(user=request.user)
            return Response(NurseProfileSerializer(profile).data)
        except NurseProfile.DoesNotExist:
            return Response({'error': 'Nurse profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['patch'], url_path='set-specialisation', permission_classes=[IsAdminRole])
    def set_specialisation(self, request, pk=None):
        """Admin-only: directly assign a new specialisation to a nurse."""
        nurse = self.get_object()
        new_spec = request.data.get('specialisation', '').strip()
        if not new_spec:
            return Response({'error': 'specialisation is required.'}, status=status.HTTP_400_BAD_REQUEST)
        nurse.specialisation = new_spec
        nurse.save()
        # Auto-approve any pending requests for this nurse since admin just set it directly
        SpecialisationChangeRequest.objects.filter(nurse=nurse, status='PENDING').update(
            status='APPROVED',
            reviewed_by=request.user,
            reviewed_at=timezone.now(),
            admin_note='Resolved by direct admin assignment.',
        )
        return Response(NurseProfileSerializer(nurse).data)


# ── Availability ─────────────────────────────────────────────────────────────

class NurseAvailabilityViewSet(viewsets.ModelViewSet):
    queryset = NurseAvailability.objects.select_related('nurse__user').all()
    serializer_class = NurseAvailabilitySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = NurseAvailability.objects.select_related('nurse__user').all()

        if user.role == 'NURSE':
            try:
                profile = NurseProfile.objects.get(user=user)
                qs = qs.filter(nurse=profile)
            except NurseProfile.DoesNotExist:
                return NurseAvailability.objects.none()

        params = self.request.query_params
        nurse_id = params.get('nurse_id')
        date_from = params.get('date_from')
        date_to = params.get('date_to')
        slot_status = params.get('status')

        if nurse_id:
            qs = qs.filter(nurse_id=nurse_id)
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        if slot_status == 'open':
            qs = qs.filter(is_booked=False)
        elif slot_status == 'booked':
            qs = qs.filter(is_booked=True)

        return qs.order_by('date', 'start_time')

    def perform_create(self, serializer):
        if self.request.user.role == 'NURSE':
            try:
                profile = NurseProfile.objects.get(user=self.request.user)
                serializer.save(nurse=profile)
                return
            except NurseProfile.DoesNotExist:
                pass
        serializer.save()

    @action(detail=False, methods=['post'], url_path='bulk-create')
    def bulk_create(self, request):
        user = request.user
        date_from_str = request.data.get('date_from')
        date_to_str = request.data.get('date_to')
        time_slots = request.data.get('time_slots', [])
        days_of_week = request.data.get('days_of_week', [0, 1, 2, 3, 4])
        nurse_ids = request.data.get('nurse_ids', [])

        if not date_from_str or not date_to_str:
            return Response({'error': 'date_from and date_to are required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not time_slots:
            return Response({'error': 'At least one time slot is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            d_from = date_cls.fromisoformat(date_from_str)
            d_to = date_cls.fromisoformat(date_to_str)
        except ValueError:
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)

        if d_from > d_to:
            return Response({'error': 'date_from must be before date_to.'}, status=status.HTTP_400_BAD_REQUEST)

        if user.role == 'NURSE':
            try:
                nurse_profiles = [NurseProfile.objects.get(user=user)]
            except NurseProfile.DoesNotExist:
                return Response({'error': 'Nurse profile not found.'}, status=status.HTTP_404_NOT_FOUND)
        elif user.role == 'ADMIN' or user.is_superuser:
            if nurse_ids:
                nurse_profiles = list(NurseProfile.objects.filter(id__in=nurse_ids))
            else:
                nurse_profiles = list(NurseProfile.objects.all())
        else:
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        created_count = 0
        current = d_from
        while current <= d_to:
            if current.weekday() in days_of_week:
                for nurse in nurse_profiles:
                    for slot in time_slots:
                        start = slot.get('start_time')
                        end = slot.get('end_time')
                        if start and end:
                            _, created = NurseAvailability.objects.get_or_create(
                                nurse=nurse,
                                date=current,
                                start_time=start,
                                defaults={'end_time': end, 'is_booked': False},
                            )
                            if created:
                                created_count += 1
            current += timedelta(days=1)

        return Response(
            {'created': created_count, 'message': f'Created {created_count} new availability slots.'},
            status=status.HTTP_201_CREATED,
        )


# ── Appointments ─────────────────────────────────────────────────────────────

class AppointmentViewSet(viewsets.ModelViewSet):
    queryset = Appointment.objects.select_related('patient', 'nurse__user').all()
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'PATIENT':
            return Appointment.objects.filter(patient=user)
        elif user.role == 'NURSE':
            return Appointment.objects.filter(nurse__user=user)
        return super().get_queryset()

    def get_permissions(self):
        if self.action == 'destroy':
            return [IsAdminRole()]
        return [permissions.IsAuthenticated()]


# ── Smart nurse-matching endpoint ────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def request_visit(request):
    """
    Auto-assign the best-fit nurse to a new visit request.
    Constraints (in order): specialisation match → date availability → lowest workload.
    """
    care_type = request.data.get('care_type', '')
    date = request.data.get('date')
    notes = request.data.get('notes', '')

    if not date:
        return Response({'error': 'date is required.'}, status=status.HTTP_400_BAD_REQUEST)

    # 1 – Filter by specialisation (case-insensitive contains)
    candidates = NurseProfile.objects.filter(
        specialisation__icontains=care_type
    )
    if not candidates.exists():
        candidates = NurseProfile.objects.all()

    # 2 – Keep only nurses with an unbooked slot on the requested date
    available = []
    for nurse in candidates:
        slot = NurseAvailability.objects.filter(
            nurse=nurse, date=date, is_booked=False
        ).first()
        if slot:
            available.append((nurse, slot))

    if not available:
        return Response(
            {'error': 'No nurses are available for that date and care type. Please choose a different date.'},
            status=status.HTTP_404_NOT_FOUND
        )

    # 3 – Sort by current workload (fewest active appointments wins)
    available.sort(key=lambda ns: ns[0].nurse_appointments.filter(
        status__in=['PENDING', 'CONFIRMED']
    ).count())

    best_nurse, best_slot = available[0]

    # 4 – Create appointment and lock the slot
    appointment = Appointment.objects.create(
        patient=request.user,
        nurse=best_nurse,
        date=date,
        start_time=best_slot.start_time,
        care_type=care_type,
        status='PENDING',
        notes=notes,
    )
    best_slot.is_booked = True
    best_slot.save()

    return Response(AppointmentSerializer(appointment).data, status=status.HTTP_201_CREATED)


# ── Messages (REST fallback + history) ───────────────────────────────────────

class MessageViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET  /api/messages/?appointment=<id>  – fetch decrypted history for an appointment.
    """
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        appointment_id = self.request.query_params.get('appointment')
        user = self.request.user
        qs = Message.objects.select_related('sender', 'appointment')
        if appointment_id:
            qs = qs.filter(appointment_id=appointment_id)
        # Restrict: only parties of the appointment or admins can see messages
        if user.role != 'ADMIN':
            qs = qs.filter(
                Q(appointment__patient=user) | Q(appointment__nurse__user=user)
            )
        return qs


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def send_message(request):
    """
    POST /api/messages/send/
    Body: { appointment: <id>, content: "<plaintext>" }
    Encrypts content with AES-256-GCM and saves to DB.
    """
    appointment_id = request.data.get('appointment')
    content = request.data.get('content', '').strip()

    if not appointment_id or not content:
        return Response({'error': 'appointment and content are required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        appointment = Appointment.objects.get(pk=appointment_id)
    except Appointment.DoesNotExist:
        return Response({'error': 'Appointment not found.'}, status=status.HTTP_404_NOT_FOUND)

    # Verify the sender is party to this appointment
    user = request.user
    if user.role != 'ADMIN':
        is_patient = appointment.patient == user
        is_nurse = appointment.nurse.user == user
        if not (is_patient or is_nurse):
            return Response({'error': 'You are not a party to this appointment.'}, status=status.HTTP_403_FORBIDDEN)

    encrypted = encrypt_message(content)
    message = Message.objects.create(
        appointment=appointment,
        sender=user,
        encrypted_content=encrypted,
    )
    return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)


# ── Auth helpers ─────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def current_user(request):
    return Response(CustomUserSerializer(request.user).data)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register(request):
    data = request.data
    try:
        user = CustomUser.objects.create_user(
            username=data['username'],
            password=data['password'],
            first_name=data.get('first_name', ''),
            last_name=data.get('last_name', ''),
            role='PATIENT',
        )
        return Response({'message': 'User created successfully'}, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


# ── Media upload ─────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def upload_media(request):
    file = request.FILES.get('file')
    if not file:
        return Response({'error': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)

    content_type = file.content_type or ''
    if content_type.startswith('image/'):
        media_type = 'image'
        max_mb = 10
    elif content_type.startswith('video/'):
        media_type = 'video'
        max_mb = 100
    else:
        return Response({'error': 'Only image and video files are allowed.'}, status=status.HTTP_400_BAD_REQUEST)

    if file.size > max_mb * 1024 * 1024:
        return Response({'error': f'File too large. Maximum size is {max_mb} MB.'}, status=status.HTTP_400_BAD_REQUEST)

    from django.core.files.storage import default_storage
    from django.conf import settings as django_settings

    # Sanitise filename
    safe_name = os.path.basename(file.name).replace(' ', '_')
    save_path = f'chat_media/{safe_name}'
    path = default_storage.save(save_path, file)
    url = request.build_absolute_uri(django_settings.MEDIA_URL + path)

    return Response({'url': url, 'media_type': media_type}, status=status.HTTP_201_CREATED)


# ── Thread summary (unread notification support) ──────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def thread_summary(request):
    """
    Returns per-appointment last-message metadata so the frontend can
    calculate unread counts without fetching full message history.
    Response: { "<appt_id>": { last_message_at, last_sender_id, total_count } }
    """
    user = request.user
    if user.role == 'PATIENT':
        appt_ids = list(Appointment.objects.filter(patient=user).values_list('id', flat=True))
    elif user.role == 'NURSE':
        appt_ids = list(Appointment.objects.filter(nurse__user=user).values_list('id', flat=True))
    else:
        appt_ids = list(Appointment.objects.values_list('id', flat=True))

    # One query per thread for last message — acceptable at MVP scale
    result = {}
    threads = (
        Message.objects
        .filter(appointment_id__in=appt_ids)
        .values('appointment_id')
        .annotate(total_count=Count('id'), last_message_at=Max('timestamp'))
    )

    for thread in threads:
        appt_id = thread['appointment_id']
        last_msg = (
            Message.objects
            .filter(appointment_id=appt_id, timestamp=thread['last_message_at'])
            .values('sender_id')
            .first()
        )
        result[str(appt_id)] = {
            'last_message_at': thread['last_message_at'].isoformat() if thread['last_message_at'] else None,
            'last_sender_id': last_msg['sender_id'] if last_msg else None,
            'total_count': thread['total_count'],
        }

    return Response(result)


# ── Specialisation Change Requests ──────────────────────────────────────────

class SpecialisationChangeRequestViewSet(viewsets.ModelViewSet):
    serializer_class = SpecialisationChangeRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN' or user.is_superuser:
            return SpecialisationChangeRequest.objects.select_related('nurse__user', 'reviewed_by').all()
        # Nurse sees only their own requests
        try:
            profile = NurseProfile.objects.get(user=user)
            return SpecialisationChangeRequest.objects.filter(nurse=profile)
        except NurseProfile.DoesNotExist:
            return SpecialisationChangeRequest.objects.none()

    def perform_create(self, serializer):
        nurse = NurseProfile.objects.get(user=self.request.user)
        serializer.save(
            nurse=nurse,
            current_specialisation=nurse.specialisation,
        )

    def create(self, request, *args, **kwargs):
        if request.user.role != 'NURSE':
            return Response({'error': 'Only nurses can submit specialisation change requests.'}, status=status.HTTP_403_FORBIDDEN)
        # Block if there is already a pending request
        try:
            profile = NurseProfile.objects.get(user=request.user)
        except NurseProfile.DoesNotExist:
            return Response({'error': 'Nurse profile not found.'}, status=status.HTTP_404_NOT_FOUND)
        if SpecialisationChangeRequest.objects.filter(nurse=profile, status='PENDING').exists():
            return Response({'error': 'You already have a pending request. Wait for it to be reviewed.'}, status=status.HTTP_400_BAD_REQUEST)
        return super().create(request, *args, **kwargs)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminRole])
    def approve(self, request, pk=None):
        req = self.get_object()
        if req.status != 'PENDING':
            return Response({'error': 'This request has already been reviewed.'}, status=status.HTTP_400_BAD_REQUEST)
        req.status = 'APPROVED'
        req.reviewed_by = request.user
        req.reviewed_at = timezone.now()
        req.admin_note = request.data.get('admin_note', '')
        req.save()
        # Apply the new specialisation
        req.nurse.specialisation = req.requested_specialisation
        req.nurse.save()
        return Response(SpecialisationChangeRequestSerializer(req).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminRole])
    def reject(self, request, pk=None):
        req = self.get_object()
        if req.status != 'PENDING':
            return Response({'error': 'This request has already been reviewed.'}, status=status.HTTP_400_BAD_REQUEST)
        req.status = 'REJECTED'
        req.reviewed_by = request.user
        req.reviewed_at = timezone.now()
        req.admin_note = request.data.get('admin_note', '')
        req.save()
        return Response(SpecialisationChangeRequestSerializer(req).data)
