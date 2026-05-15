import os
import django
import random

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import CustomUser, NurseProfile, NurseAvailability, Appointment
from datetime import date, time, timedelta

def create_samples():
    print("Clearing existing data...")
    Appointment.objects.all().delete()
    NurseAvailability.objects.all().delete()
    NurseProfile.objects.all().delete()
    CustomUser.objects.all().delete()

    print("Creating Admin...")
    admin = CustomUser.objects.create_superuser(
        username='admin',
        email='admin@nurseconnect.com',
        password='password123',
        role='ADMIN',
        first_name='System',
        last_name='Admin'
    )

    print("Creating Nurses...")
    nurse1_user = CustomUser.objects.create_user(
        username='nurse1', email='nurse1@nurseconnect.com', password='password123',
        role='NURSE', first_name='Sarah', last_name='Jenkins'
    )
    nurse1_profile = NurseProfile.objects.create(user=nurse1_user, specialisation='Wound Care & IV Therapy')

    nurse2_user = CustomUser.objects.create_user(
        username='nurse2', email='nurse2@nurseconnect.com', password='password123',
        role='NURSE', first_name='David', last_name='Chen'
    )
    nurse2_profile = NurseProfile.objects.create(user=nurse2_user, specialisation='Pediatrics & General Care')

    nurses = [nurse1_profile, nurse2_profile]

    print("Creating 6 Patients...")
    patients_data = [
        ('patient1', 'Alex', 'Johnson'),
        ('patient2', 'Maria', 'Garcia'),
        ('patient3', 'James', 'Smith'),
        ('patient4', 'Linda', 'Williams'),
        ('patient5', 'Robert', 'Brown'),
        ('patient6', 'Patricia', 'Jones'),
    ]

    patients = []
    for username, fname, lname in patients_data:
        p = CustomUser.objects.create_user(
            username=username, email=f'{username}@nurseconnect.com', password='password123',
            role='PATIENT', first_name=fname, last_name=lname
        )
        patients.append(p)

    print("Creating Mock Appointments...")
    today = date.today()
    care_types = ['Wound Care', 'IV Therapy', 'General Checkup', 'Pediatrics']
    statuses = ['PENDING', 'CONFIRMED', 'COMPLETED']
    
    for i, p in enumerate(patients):
        Appointment.objects.create(
            patient=p,
            nurse=random.choice(nurses),
            date=today + timedelta(days=random.randint(1, 5)),
            start_time=time(random.randint(9, 16), 0),
            care_type=random.choice(care_types),
            status=random.choice(statuses),
            notes='Patient needs routine care.'
        )

    print("Sample accounts created successfully!")
    print("Admin: admin / password123")
    print("Nurses: nurse1, nurse2 / password123")
    print("Patients: patient1 to patient6 / password123")

if __name__ == '__main__':
    create_samples()
