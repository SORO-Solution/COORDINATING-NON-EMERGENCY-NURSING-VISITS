"""
HTTP endpoints that stream CSV or PDF reports directly to the browser.
Admin gets platform-wide data; nurses get their own schedule only.
"""
import csv
import io
from datetime import datetime

from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework import permissions

from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable,
)
from reportlab.lib.enums import TA_CENTER

from .models import Appointment, NurseProfile, NurseAvailability, CustomUser
from .permissions import IsAdminRole

# ── Helpers ───────────────────────────────────────────────────────────────────

ACCENT = colors.HexColor('#4f46e5')
LIGHT_BG = colors.HexColor('#eef2ff')


def _pdf_response(filename: str) -> tuple[HttpResponse, SimpleDocTemplate]:
    buf = io.BytesIO()
    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    doc = SimpleDocTemplate(
        buf, pagesize=landscape(A4),
        rightMargin=1.5 * cm, leftMargin=1.5 * cm,
        topMargin=1.5 * cm, bottomMargin=1.5 * cm,
    )
    return response, doc, buf


def _pdf_header(story, title: str, subtitle: str = ''):
    styles = getSampleStyleSheet()
    h_style = ParagraphStyle(
        'H', fontSize=18, textColor=ACCENT,
        fontName='Helvetica-Bold', alignment=TA_CENTER, spaceAfter=4,
    )
    s_style = ParagraphStyle(
        'S', fontSize=9, textColor=colors.HexColor('#6b7280'),
        alignment=TA_CENTER, spaceAfter=6,
    )
    story.append(Paragraph('NurseConnect', h_style))
    story.append(Paragraph(title, h_style))
    if subtitle:
        story.append(Paragraph(subtitle, s_style))
    story.append(Paragraph(f'Generated: {datetime.now().strftime("%B %d, %Y %H:%M")}', s_style))
    story.append(HRFlowable(width='100%', thickness=1.5, color=ACCENT))
    story.append(Spacer(1, 0.4 * cm))


def _table_style(header_color=None):
    hc = header_color or ACCENT
    return TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), hc),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LIGHT_BG]),
        ('GRID', (0, 0), (-1, -1), 0.3, colors.HexColor('#e5e7eb')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('ALIGN', (0, 1), (-1, -1), 'LEFT'),
    ])


# ── Admin: Appointments CSV ───────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAdminRole])
def admin_appointments_csv(request):
    appts = Appointment.objects.select_related('patient', 'nurse__user').order_by('-date')
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="appointments.csv"'
    writer = csv.writer(response)
    writer.writerow(['ID', 'Patient', 'Nurse', 'Care Type', 'Date', 'Time', 'Status', 'Notes'])
    for a in appts:
        writer.writerow([
            a.id,
            f'{a.patient.first_name} {a.patient.last_name}',
            f'{a.nurse.user.first_name} {a.nurse.user.last_name}',
            a.care_type, a.date, a.start_time, a.status,
            a.notes or '',
        ])
    return response


# ── Admin: Appointments PDF ───────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAdminRole])
def admin_appointments_pdf(request):
    appts = Appointment.objects.select_related('patient', 'nurse__user').order_by('-date')
    response, doc, buf = _pdf_response('appointments_report.pdf')
    story = []
    _pdf_header(story, 'Appointments Report', f'Total: {appts.count()} appointments')

    headers = ['#', 'Patient', 'Nurse', 'Care Type', 'Date', 'Time', 'Status']
    col_w = [0.8 * cm, 4 * cm, 4 * cm, 3.5 * cm, 2.5 * cm, 2 * cm, 2.5 * cm]
    data = [headers]
    for idx, a in enumerate(appts, 1):
        data.append([
            str(idx),
            f'{a.patient.first_name} {a.patient.last_name}',
            f'{a.nurse.user.first_name} {a.nurse.user.last_name}',
            a.care_type, str(a.date), str(a.start_time)[:5], a.status,
        ])

    t = Table(data, colWidths=col_w, repeatRows=1)
    t.setStyle(_table_style())
    story.append(t)
    doc.build(story)
    response.write(buf.getvalue())
    return response


# ── Admin: Nurse Workload PDF ─────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAdminRole])
def admin_workload_pdf(request):
    nurses = NurseProfile.objects.select_related('user').all().order_by('user__last_name')
    response, doc, buf = _pdf_response('nurse_workload_report.pdf')
    story = []
    _pdf_header(story, 'Nurse Workload Report')

    headers = ['#', 'Nurse', 'Specialisation', 'City', 'Active', 'Completed', 'Total', 'Open Slots']
    col_w = [0.8*cm, 4.5*cm, 4*cm, 3*cm, 2*cm, 2.5*cm, 2*cm, 2.5*cm]
    data = [headers]
    for idx, nurse in enumerate(nurses, 1):
        active = nurse.nurse_appointments.filter(status__in=['PENDING', 'CONFIRMED']).count()
        completed = nurse.nurse_appointments.filter(status='COMPLETED').count()
        total = nurse.nurse_appointments.count()
        open_slots = NurseAvailability.objects.filter(nurse=nurse, is_booked=False).count()
        data.append([
            str(idx),
            f'{nurse.user.first_name} {nurse.user.last_name}',
            nurse.specialisation, nurse.city or '—',
            str(active), str(completed), str(total), str(open_slots),
        ])

    t = Table(data, colWidths=col_w, repeatRows=1)
    t.setStyle(_table_style(colors.HexColor('#0ea5e9')))
    story.append(t)
    doc.build(story)
    response.write(buf.getvalue())
    return response


# ── Admin: Users CSV ──────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAdminRole])
def admin_users_csv(request):
    users = CustomUser.objects.all().order_by('role', 'username')
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="users.csv"'
    writer = csv.writer(response)
    writer.writerow(['ID', 'Username', 'First Name', 'Last Name', 'Email', 'Role', 'City', 'Superuser'])
    for u in users:
        writer.writerow([u.id, u.username, u.first_name, u.last_name, u.email, u.role, u.city, u.is_superuser])
    return response


# ── Admin: Availabilities CSV ─────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAdminRole])
def admin_availability_csv(request):
    slots = NurseAvailability.objects.select_related('nurse__user').order_by('date', 'start_time')
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="nurse_availability.csv"'
    writer = csv.writer(response)
    writer.writerow(['ID', 'Nurse', 'Specialisation', 'Date', 'Start', 'End', 'Booked'])
    for s in slots:
        writer.writerow([
            s.id,
            f'{s.nurse.user.first_name} {s.nurse.user.last_name}',
            s.nurse.specialisation,
            s.date, s.start_time, s.end_time,
            'Yes' if s.is_booked else 'No',
        ])
    return response


# ── Nurse: My Schedule CSV ────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def nurse_schedule_csv(request):
    try:
        profile = NurseProfile.objects.get(user=request.user)
    except NurseProfile.DoesNotExist:
        from rest_framework.response import Response
        from rest_framework import status
        return Response({'error': 'Nurse profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    appts = Appointment.objects.filter(nurse=profile).select_related('patient').order_by('date')
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="my_schedule.csv"'
    writer = csv.writer(response)
    writer.writerow(['ID', 'Patient', 'Care Type', 'Date', 'Time', 'Status', 'Notes'])
    for a in appts:
        writer.writerow([
            a.id,
            f'{a.patient.first_name} {a.patient.last_name}',
            a.care_type, a.date, a.start_time, a.status, a.notes or '',
        ])
    return response


# ── Nurse: My Schedule PDF ────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def nurse_schedule_pdf(request):
    try:
        profile = NurseProfile.objects.get(user=request.user)
    except NurseProfile.DoesNotExist:
        from rest_framework.response import Response
        from rest_framework import status
        return Response({'error': 'Nurse profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    appts = Appointment.objects.filter(nurse=profile).select_related('patient').order_by('date')
    nurse_name = f'{request.user.first_name} {request.user.last_name}'
    response, doc, buf = _pdf_response('my_schedule.pdf')
    story = []
    _pdf_header(story, f'Schedule — {nurse_name}', f'Specialisation: {profile.specialisation} · Total: {appts.count()}')

    headers = ['#', 'Patient', 'Care Type', 'Date', 'Time', 'Status']
    col_w = [0.8*cm, 5*cm, 4*cm, 3*cm, 2.5*cm, 3*cm]
    data = [headers]
    for idx, a in enumerate(appts, 1):
        data.append([
            str(idx),
            f'{a.patient.first_name} {a.patient.last_name}',
            a.care_type, str(a.date), str(a.start_time)[:5], a.status,
        ])

    t = Table(data, colWidths=col_w, repeatRows=1)
    t.setStyle(_table_style(colors.HexColor('#10b981')))
    story.append(t)
    doc.build(story)
    response.write(buf.getvalue())
    return response


# ── Nurse: My Availability CSV ────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def nurse_availability_csv(request):
    try:
        profile = NurseProfile.objects.get(user=request.user)
    except NurseProfile.DoesNotExist:
        from rest_framework.response import Response
        from rest_framework import status
        return Response({'error': 'Nurse profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    slots = NurseAvailability.objects.filter(nurse=profile).order_by('date', 'start_time')
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="my_availability.csv"'
    writer = csv.writer(response)
    writer.writerow(['ID', 'Date', 'Start Time', 'End Time', 'Booked'])
    for s in slots:
        writer.writerow([s.id, s.date, s.start_time, s.end_time, 'Yes' if s.is_booked else 'No'])
    return response
