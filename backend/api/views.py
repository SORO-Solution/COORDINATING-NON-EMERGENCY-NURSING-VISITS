from rest_framework import viewsets, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import CustomUser, NurseProfile, NurseAvailability, Appointment
from .serializers import CustomUserSerializer, NurseProfileSerializer, NurseAvailabilitySerializer, AppointmentSerializer

class CustomUserViewSet(viewsets.ModelViewSet):
    queryset = CustomUser.objects.all()
    serializer_class = CustomUserSerializer
    permission_classes = [permissions.IsAuthenticated]

class NurseProfileViewSet(viewsets.ModelViewSet):
    queryset = NurseProfile.objects.all()
    serializer_class = NurseProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

class NurseAvailabilityViewSet(viewsets.ModelViewSet):
    queryset = NurseAvailability.objects.all()
    serializer_class = NurseAvailabilitySerializer
    permission_classes = [permissions.IsAuthenticated]

class AppointmentViewSet(viewsets.ModelViewSet):
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'PATIENT':
            return Appointment.objects.filter(patient=user)
        elif user.role == 'NURSE':
            return Appointment.objects.filter(nurse__user=user)
        return super().get_queryset()

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def current_user(request):
    serializer = CustomUserSerializer(request.user)
    return Response(serializer.data)

from rest_framework import status
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
            role='PATIENT'
        )
        return Response({"message": "User created successfully"}, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

