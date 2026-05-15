from django.db import models
from django.contrib.auth.models import AbstractUser

class CustomUser(AbstractUser):
    ROLE_CHOICES = [
        ('PATIENT', 'Patient'),
        ('NURSE', 'Nurse'),
        ('ADMIN', 'Admin'),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='PATIENT')

    def __str__(self):
        return f"{self.username} - {self.role}"

class NurseProfile(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='nurse_profile')
    specialisation = models.CharField(max_length=100)
    
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
