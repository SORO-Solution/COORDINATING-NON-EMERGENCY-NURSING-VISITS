import random
from datetime import date, timedelta, time
from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import CustomUser, NurseProfile, NurseAvailability, Appointment, Message
from api.encryption import encrypt_message

PASSWORD = 'password123'

SPECIALISATIONS = [
    'Wound Care', 'IV Therapy', 'General Care', 'Pediatrics',
    'Physiotherapy', 'Post-Op Care', 'Cardiac Care', 'Oncology',
    'Respiratory Care', 'Mental Health', 'Geriatric Care', 'Palliative Care',
    'Diabetes Management', 'Neurology', 'Orthopedics',
]

NURSE_DISTRIBUTION = [
    ('Wound Care', 2), ('IV Therapy', 2), ('General Care', 3),
    ('Pediatrics', 2), ('Physiotherapy', 2), ('Post-Op Care', 2),
    ('Cardiac Care', 2), ('Oncology', 2), ('Respiratory Care', 2),
    ('Mental Health', 2), ('Geriatric Care', 2), ('Palliative Care', 1),
    ('Diabetes Management', 1), ('Neurology', 1), ('Orthopedics', 1),
]  # total = 27, but we'll cap at 25

CITIES = [
    'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix',
    'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose',
    'Austin', 'Jacksonville', 'Fort Worth', 'Columbus', 'Charlotte',
]

MALE_NAMES = [
    'James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard',
    'Joseph', 'Thomas', 'Charles', 'Christopher', 'Daniel', 'Matthew',
    'Anthony', 'Mark', 'Donald', 'Steven', 'Paul', 'Andrew', 'Kenneth',
    'Kevin', 'Brian', 'George', 'Timothy', 'Ronald', 'Edward', 'Jason',
    'Jeffrey', 'Ryan', 'Jacob', 'Gary', 'Nicholas', 'Eric', 'Jonathan',
    'Stephen', 'Larry', 'Justin', 'Scott', 'Brandon', 'Benjamin',
    'Samuel', 'Raymond', 'Gregory', 'Frank', 'Alexander', 'Patrick',
    'Jack', 'Dennis', 'Jerry', 'Tyler',
]

FEMALE_NAMES = [
    'Mary', 'Patricia', 'Jennifer', 'Linda', 'Barbara', 'Elizabeth',
    'Susan', 'Jessica', 'Sarah', 'Karen', 'Lisa', 'Nancy', 'Betty',
    'Margaret', 'Sandra', 'Ashley', 'Dorothy', 'Kimberly', 'Emily',
    'Donna', 'Michelle', 'Carol', 'Amanda', 'Melissa', 'Deborah',
    'Stephanie', 'Rebecca', 'Sharon', 'Laura', 'Cynthia', 'Kathleen',
    'Amy', 'Angela', 'Shirley', 'Anna', 'Brenda', 'Pamela', 'Emma',
    'Nicole', 'Helen', 'Samantha', 'Katherine', 'Christine', 'Debra',
    'Rachel', 'Carolyn', 'Janet', 'Catherine', 'Maria', 'Heather',
]

LAST_NAMES = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
    'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez',
    'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
    'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark',
    'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King',
    'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green',
    'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
    'Carter', 'Roberts', 'Gomez', 'Stewart', 'Sanchez', 'Morris', 'Rogers',
    'Reed', 'Cook', 'Morgan', 'Bell', 'Murphy', 'Bailey', 'Cooper',
    'Richardson', 'Cox', 'Howard', 'Ward', 'Torres', 'Peterson', 'Gray',
]

CARE_TYPES = [
    'Wound Care', 'IV Therapy', 'General Checkup', 'Pediatrics',
    'Physiotherapy', 'Post-Op Care', 'Cardiac Care', 'Oncology',
    'Respiratory Care', 'Mental Health',
]

MESSAGE_SAMPLES = [
    "Hi, I'm on my way and should arrive within 15 minutes.",
    "Please ensure you have your medication list ready for me.",
    "I've reviewed your care notes. We'll do the dressing change first.",
    "How are you feeling today compared to last visit?",
    "Your vital signs look stable. Keep up the great work!",
    "The doctor has updated your care plan. I'll explain everything on arrival.",
    "Could you confirm your current address? I want to make sure I have the right location.",
    "Please don't eat anything for 2 hours before my visit today.",
    "I'll be bringing the new IV supplies. Everything is all set.",
    "Great progress! Your wound is healing well.",
    "I've filed today's visit report. Your doctor will review it shortly.",
    "Is there anything specific you'd like us to address today?",
    "Your blood pressure readings have been consistent. That's excellent news.",
    "The physiotherapy exercises are clearly making a difference.",
    "I'll need about 45 minutes for today's session.",
    "Please have someone at home during the visit if possible.",
    "Your insurance pre-authorization has been confirmed for next week.",
    "Reminder: your follow-up appointment is scheduled for next Thursday.",
    "I can see you've been doing your exercises. Keep it up!",
    "Let me know if the pain level changes before my next visit.",
]


def random_name(gender=None):
    if gender is None:
        gender = random.choice(['M', 'F'])
    first = random.choice(MALE_NAMES if gender == 'M' else FEMALE_NAMES)
    last = random.choice(LAST_NAMES)
    return first, last


def make_username(first, last, suffix=''):
    base = f"{first.lower()}_{last.lower()}"
    return base + (str(suffix) if suffix else '')


class Command(BaseCommand):
    help = 'Populate the database with realistic test data'

    def add_arguments(self, parser):
        parser.add_argument('--clear', action='store_true', help='Clear generated test users first')

    def handle(self, *args, **options):
        if options['clear']:
            self._clear_test_data()

        self.stdout.write('Creating superadmin...')
        superadmin = self._create_superadmin()

        self.stdout.write('Creating admins...')
        admins = self._create_admins()

        self.stdout.write('Creating nurses...')
        nurses = self._create_nurses()

        self.stdout.write('Creating patients...')
        patients = self._create_patients()

        self.stdout.write('Creating availability slots...')
        self._create_availability(nurses)

        self.stdout.write('Creating appointments...')
        appointments = self._create_appointments(patients, nurses)

        self.stdout.write('Creating messages...')
        all_users = [superadmin] + admins + [n.user for n in nurses] + patients
        self._create_messages(appointments[:80], all_users)

        self.stdout.write(self.style.SUCCESS(
            f'\nDone! Created: 1 superadmin, {len(admins)} admins, '
            f'{len(nurses)} nurses, {len(patients)} patients, '
            f'{len(appointments)} appointments.'
        ))

    # ── helpers ──────────────────────────────────────────────────────────────

    def _clear_test_data(self):
        CustomUser.objects.filter(username__startswith='test_').delete()
        self.stdout.write('  Cleared existing test_ accounts.')

    def _create_superadmin(self):
        un = 'superadmin'
        if CustomUser.objects.filter(username=un).exists():
            self.stdout.write(f'  Skipping {un} (already exists)')
            return CustomUser.objects.get(username=un)
        u = CustomUser.objects.create_superuser(
            username=un, password=PASSWORD,
            first_name='Super', last_name='Admin',
            email='superadmin@nurseconnect.com',
            role='ADMIN', city='New York',
        )
        self.stdout.write(f'  Created {un}')
        return u

    def _create_admins(self):
        admin_data = [
            ('test_admin1', 'Alexandra', 'Turner', 'alexandra.turner@nurseconnect.com', 'Chicago'),
            ('test_admin2', 'Marcus', 'Reynolds', 'marcus.reynolds@nurseconnect.com', 'Houston'),
            ('test_admin3', 'Priya', 'Sharma', 'priya.sharma@nurseconnect.com', 'Los Angeles'),
        ]
        admins = []
        for un, fn, ln, email, city in admin_data:
            if CustomUser.objects.filter(username=un).exists():
                admins.append(CustomUser.objects.get(username=un))
                continue
            u = CustomUser.objects.create_user(
                username=un, password=PASSWORD,
                first_name=fn, last_name=ln, email=email,
                role='ADMIN', city=city,
            )
            admins.append(u)
            self.stdout.write(f'  Created {un}')
        return admins

    def _create_nurses(self):
        nurses = []
        nurse_idx = 1
        for spec, count in NURSE_DISTRIBUTION:
            if nurse_idx > 25:
                break
            for _ in range(count):
                if nurse_idx > 25:
                    break
                fn, ln = random_name()
                base_un = f'test_nurse{nurse_idx}'
                if not CustomUser.objects.filter(username=base_un).exists():
                    city = random.choice(CITIES)
                    u = CustomUser.objects.create_user(
                        username=base_un, password=PASSWORD,
                        first_name=fn, last_name=ln,
                        email=f'{base_un}@nurseconnect.com',
                        role='NURSE', city=city,
                    )
                    profile, _ = NurseProfile.objects.get_or_create(
                        user=u, defaults={'specialisation': spec, 'city': city}
                    )
                    nurses.append(profile)
                    self.stdout.write(f'  Created {base_un} ({spec})')
                else:
                    try:
                        nurses.append(NurseProfile.objects.get(user__username=base_un))
                    except NurseProfile.DoesNotExist:
                        pass
                nurse_idx += 1
        return nurses

    def _create_patients(self):
        patients = []
        for i in range(1, 101):
            un = f'test_patient{i}'
            if CustomUser.objects.filter(username=un).exists():
                patients.append(CustomUser.objects.get(username=un))
                continue
            fn, ln = random_name()
            city = random.choice(CITIES)
            u = CustomUser.objects.create_user(
                username=un, password=PASSWORD,
                first_name=fn, last_name=ln,
                email=f'{un}@example.com',
                role='PATIENT', city=city,
            )
            patients.append(u)
        self.stdout.write(f'  Created {len(patients)} patient accounts')
        return patients

    def _create_availability(self, nurses):
        today = date.today()
        time_slots = [
            (time(8, 0), time(10, 0)),
            (time(10, 0), time(12, 0)),
            (time(13, 0), time(15, 0)),
            (time(15, 0), time(17, 0)),
        ]
        created = 0
        for nurse in nurses:
            # Past slots (last 60 days) — already booked
            for offset in range(-60, 0, 3):
                slot_date = today + timedelta(days=offset)
                start, end = random.choice(time_slots)
                if not NurseAvailability.objects.filter(nurse=nurse, date=slot_date, start_time=start).exists():
                    NurseAvailability.objects.create(
                        nurse=nurse, date=slot_date,
                        start_time=start, end_time=end, is_booked=True
                    )
                    created += 1
            # Future slots (next 45 days)
            for offset in range(1, 46, 2):
                slot_date = today + timedelta(days=offset)
                for start, end in random.sample(time_slots, k=2):
                    if not NurseAvailability.objects.filter(nurse=nurse, date=slot_date, start_time=start).exists():
                        NurseAvailability.objects.create(
                            nurse=nurse, date=slot_date,
                            start_time=start, end_time=end, is_booked=False
                        )
                        created += 1
        self.stdout.write(f'  Created {created} availability slots')

    def _create_appointments(self, patients, nurses):
        today = date.today()
        appointments = []
        time_options = [time(8, 0), time(9, 0), time(10, 0), time(11, 0),
                        time(13, 0), time(14, 0), time(15, 0), time(16, 0)]

        # Historical completed appointments (last 90 days)
        for i in range(120):
            patient = random.choice(patients)
            nurse = random.choice(nurses)
            offset = random.randint(1, 90)
            appt_date = today - timedelta(days=offset)
            care = random.choice(CARE_TYPES)
            if not Appointment.objects.filter(patient=patient, nurse=nurse, date=appt_date).exists():
                a = Appointment.objects.create(
                    patient=patient, nurse=nurse, date=appt_date,
                    start_time=random.choice(time_options),
                    care_type=care, status='COMPLETED',
                    notes=random.choice(['Routine visit', 'Follow-up required', 'Patient doing well', '']) ,
                )
                appointments.append(a)

        # Current/near-future appointments
        for i in range(80):
            patient = random.choice(patients)
            nurse = random.choice(nurses)
            offset = random.randint(-5, 30)
            appt_date = today + timedelta(days=offset)
            care = random.choice(CARE_TYPES)
            status = random.choices(
                ['PENDING', 'CONFIRMED', 'CANCELLED'],
                weights=[40, 50, 10]
            )[0]
            if offset < 0:
                status = random.choice(['CONFIRMED', 'COMPLETED'])
            if not Appointment.objects.filter(patient=patient, nurse=nurse, date=appt_date).exists():
                a = Appointment.objects.create(
                    patient=patient, nurse=nurse, date=appt_date,
                    start_time=random.choice(time_options),
                    care_type=care, status=status,
                )
                appointments.append(a)

        self.stdout.write(f'  Created {len(appointments)} appointments')
        return appointments

    def _create_messages(self, appointments, users):
        created = 0
        for appt in appointments:
            patient = appt.patient
            nurse_user = appt.nurse.user
            num_messages = random.randint(1, 6)
            participants = [patient, nurse_user]
            for _ in range(num_messages):
                sender = random.choice(participants)
                content = random.choice(MESSAGE_SAMPLES)
                try:
                    Message.objects.create(
                        appointment=appt,
                        sender=sender,
                        encrypted_content=encrypt_message(content),
                    )
                    created += 1
                except Exception:
                    pass
        self.stdout.write(f'  Created {created} messages')
