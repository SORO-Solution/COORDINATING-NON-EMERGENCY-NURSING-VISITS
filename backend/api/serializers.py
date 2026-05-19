from rest_framework import serializers
from .models import CustomUser, NurseProfile, NurseAvailability, Appointment, Message, SpecialisationChangeRequest
from .encryption import decrypt_message


class CustomUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'role', 'first_name', 'last_name', 'city', 'is_superuser']


class NurseProfileSerializer(serializers.ModelSerializer):
    user = CustomUserSerializer(read_only=True)
    active_appointments = serializers.SerializerMethodField()

    class Meta:
        model = NurseProfile
        fields = ['id', 'user', 'specialisation', 'city', 'active_appointments']

    def get_active_appointments(self, obj):
        return obj.nurse_appointments.filter(status__in=['PENDING', 'CONFIRMED']).count()


class NurseAvailabilitySerializer(serializers.ModelSerializer):
    nurse_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = NurseAvailability
        fields = ['id', 'nurse', 'nurse_name', 'date', 'start_time', 'end_time', 'is_booked']
        extra_kwargs = {'nurse': {'required': False}}

    def get_nurse_name(self, obj):
        return f'{obj.nurse.user.first_name} {obj.nurse.user.last_name}'


class AppointmentSerializer(serializers.ModelSerializer):
    patient_details = CustomUserSerializer(source='patient', read_only=True)
    nurse_details = NurseProfileSerializer(source='nurse', read_only=True)

    class Meta:
        model = Appointment
        fields = [
            'id', 'patient', 'patient_details', 'nurse', 'nurse_details',
            'date', 'start_time', 'care_type', 'status', 'notes'
        ]


class MessageSerializer(serializers.ModelSerializer):
    sender_details = CustomUserSerializer(source='sender', read_only=True)
    content = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            'id', 'appointment', 'sender', 'sender_details',
            'content', 'media_url', 'media_type', 'timestamp',
        ]
        read_only_fields = ['sender', 'timestamp']

    def get_content(self, obj):
        if not obj.encrypted_content:
            return ''
        try:
            return decrypt_message(obj.encrypted_content)
        except Exception:
            return '[Message could not be decrypted]'


class SpecialisationChangeRequestSerializer(serializers.ModelSerializer):
    nurse_details = NurseProfileSerializer(source='nurse', read_only=True)
    reviewed_by_details = CustomUserSerializer(source='reviewed_by', read_only=True)

    class Meta:
        model = SpecialisationChangeRequest
        fields = [
            'id', 'nurse', 'nurse_details', 'current_specialisation',
            'requested_specialisation', 'reason', 'status',
            'requested_at', 'reviewed_by', 'reviewed_by_details',
            'reviewed_at', 'admin_note',
        ]
        read_only_fields = ['status', 'reviewed_by', 'reviewed_at', 'current_specialisation', 'requested_at', 'nurse']
