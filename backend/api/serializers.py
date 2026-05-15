from rest_framework import serializers
from .models import CustomUser, NurseProfile, NurseAvailability, Appointment

class CustomUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'role', 'first_name', 'last_name']

class NurseProfileSerializer(serializers.ModelSerializer):
    user = CustomUserSerializer(read_only=True)
    class Meta:
        model = NurseProfile
        fields = ['id', 'user', 'specialisation']

class NurseAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = NurseAvailability
        fields = ['id', 'nurse', 'date', 'start_time', 'end_time', 'is_booked']

class AppointmentSerializer(serializers.ModelSerializer):
    patient_details = CustomUserSerializer(source='patient', read_only=True)
    nurse_details = NurseProfileSerializer(source='nurse', read_only=True)

    class Meta:
        model = Appointment
        fields = ['id', 'patient', 'patient_details', 'nurse', 'nurse_details', 'date', 'start_time', 'care_type', 'status', 'notes']
