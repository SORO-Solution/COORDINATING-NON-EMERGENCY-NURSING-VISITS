from django.db import models
from django.contrib.auth.models import AbstractUser

class CustomUser(AbstractUser):
    ROLE_CHOICES = [
        ('PATIENT', 'Patient'),
        ('NURSE', 'Nurse'),
        ('ADMIN', 'Admin'),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='PATIENT')
    city = models.CharField(max_length=100, blank=True, default='')

    def __str__(self):
        return f"{self.username} - {self.role}"

class NurseProfile(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='nurse_profile')
    specialisation = models.CharField(max_length=100)
    city = models.CharField(max_length=100, blank=True, default='')

    def __str__(self):
        return f"Nurse Profile: {self.user.username}"

class NurseAvailability(models.Model):
    nurse = models.ForeignKey(NurseProfile, on_delete=models.CASCADE, related_name='availabilities')
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_booked = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.nurse.user.username} available on {self.date} from {self.start_time} to {self.end_time}"

class Appointment(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('CONFIRMED', 'Confirmed'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]
    patient = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='patient_appointments')
    nurse = models.ForeignKey(NurseProfile, on_delete=models.CASCADE, related_name='nurse_appointments')
    date = models.DateField()
    start_time = models.TimeField()
    care_type = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Appointment: {self.patient.username} with {self.nurse.user.username} on {self.date}"

class SpecialisationChangeRequest(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]
    nurse = models.ForeignKey(NurseProfile, on_delete=models.CASCADE, related_name='spec_change_requests')
    current_specialisation = models.CharField(max_length=100)
    requested_specialisation = models.CharField(max_length=100)
    reason = models.TextField(blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    requested_at = models.DateTimeField(auto_now_add=True)
    reviewed_by = models.ForeignKey(
        CustomUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_spec_requests'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    admin_note = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['-requested_at']

    def __str__(self):
        return f"{self.nurse.user.username}: {self.current_specialisation} → {self.requested_specialisation} [{self.status}]"


class Message(models.Model):
    appointment = models.ForeignKey(Appointment, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='sent_messages')
    encrypted_content = models.TextField(blank=True, default='')
    media_url = models.CharField(max_length=500, blank=True, default='')
    media_type = models.CharField(max_length=10, blank=True, default='')  # 'image' or 'video'
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f"Message from {self.sender.username} at {self.timestamp}"
