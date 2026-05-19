import os
from datetime import datetime
from django.core.management.base import BaseCommand
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT

from api.models import CustomUser, NurseProfile

PASSWORD = 'password123'

ROLE_COLORS = {
    'superadmin': colors.HexColor('#7c3aed'),
    'ADMIN':      colors.HexColor('#0ea5e9'),
    'NURSE':      colors.HexColor('#10b981'),
    'PATIENT':    colors.HexColor('#6366f1'),
}

ROLE_BG = {
    'superadmin': colors.HexColor('#f5f3ff'),
    'ADMIN':      colors.HexColor('#f0f9ff'),
    'NURSE':      colors.HexColor('#f0fdf4'),
    'PATIENT':    colors.HexColor('#eef2ff'),
}


class Command(BaseCommand):
    help = 'Export all user login details to a formatted PDF'

    def add_arguments(self, parser):
        parser.add_argument(
            '--output', default='NurseConnect_User_Directory.pdf',
            help='Output PDF file path (default: NurseConnect_User_Directory.pdf)'
        )

    def handle(self, *args, **options):
        output_path = options['output']
        if not os.path.isabs(output_path):
            output_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))),
                output_path
            )

        self.stdout.write(f'Generating PDF: {output_path}')

        doc = SimpleDocTemplate(
            output_path,
            pagesize=A4,
            rightMargin=1.5 * cm, leftMargin=1.5 * cm,
            topMargin=1.5 * cm, bottomMargin=1.5 * cm,
        )

        styles = getSampleStyleSheet()
        story = []

        # ── Cover / header ────────────────────────────────────────────────
        title_style = ParagraphStyle(
            'Title', parent=styles['Normal'],
            fontSize=28, textColor=colors.HexColor('#1e1b4b'),
            alignment=TA_CENTER, spaceAfter=6, fontName='Helvetica-Bold',
        )
        sub_style = ParagraphStyle(
            'Sub', parent=styles['Normal'],
            fontSize=12, textColor=colors.HexColor('#6b7280'),
            alignment=TA_CENTER, spaceAfter=4,
        )
        note_style = ParagraphStyle(
            'Note', parent=styles['Normal'],
            fontSize=9, textColor=colors.HexColor('#dc2626'),
            alignment=TA_CENTER,
        )

        story.append(Spacer(1, 1 * cm))
        story.append(Paragraph('NurseConnect', title_style))
        story.append(Paragraph('Platform User Directory &amp; Login Credentials', sub_style))
        story.append(Paragraph(
            f'Generated: {datetime.now().strftime("%B %d, %Y at %H:%M")}',
            sub_style
        ))
        story.append(Spacer(1, 0.4 * cm))
        story.append(Paragraph(
            '⚠  CONFIDENTIAL — For internal use only. Do not share outside the platform team.',
            note_style
        ))
        story.append(Spacer(1, 0.5 * cm))
        story.append(HRFlowable(width='100%', thickness=2, color=colors.HexColor('#1e1b4b')))
        story.append(Spacer(1, 0.5 * cm))

        # ── Summary box ───────────────────────────────────────────────────
        superadmins = CustomUser.objects.filter(is_superuser=True).order_by('username')
        admins = CustomUser.objects.filter(role='ADMIN', is_superuser=False).order_by('username')
        nurses_qs = CustomUser.objects.filter(role='NURSE').order_by('username')
        patients = CustomUser.objects.filter(role='PATIENT').order_by('username')

        summary_data = [
            ['Role', 'Count', 'Password'],
            ['Superadmin', str(superadmins.count()), PASSWORD],
            ['Admin', str(admins.count()), PASSWORD],
            ['Nurse', str(nurses_qs.count()), PASSWORD],
            ['Patient', str(patients.count()), PASSWORD],
            ['TOTAL', str(CustomUser.objects.count()), ''],
        ]
        summary_table = Table(summary_data, colWidths=[6 * cm, 3 * cm, 6 * cm])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e1b4b')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.HexColor('#f9fafb')]),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#e5e7eb')),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d1d5db')),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 1 * cm))

        # ── Sections ──────────────────────────────────────────────────────
        self._add_section(story, styles, '★ Superadmin', superadmins, 'superadmin')
        self._add_section(story, styles, '◆ Administrators', admins, 'ADMIN')
        self._add_section(story, styles, '✦ Nurses', nurses_qs, 'NURSE', include_spec=True)
        self._add_section(story, styles, '● Patients', patients, 'PATIENT', page_break_before=True)

        doc.build(story, onFirstPage=self._header_footer, onLaterPages=self._header_footer)
        self.stdout.write(self.style.SUCCESS(f'PDF saved to: {output_path}'))

    # ── Section builder ───────────────────────────────────────────────────

    def _add_section(self, story, styles, title, queryset, role_key,
                     include_spec=False, page_break_before=False):
        if page_break_before:
            story.append(PageBreak())

        accent = ROLE_COLORS.get(role_key, colors.HexColor('#374151'))
        bg = ROLE_BG.get(role_key, colors.HexColor('#f9fafb'))

        section_style = ParagraphStyle(
            f'Section_{role_key}', fontSize=14,
            textColor=accent, fontName='Helvetica-Bold',
            spaceBefore=12, spaceAfter=6,
        )
        story.append(Paragraph(title, section_style))
        story.append(HRFlowable(width='100%', thickness=1, color=accent))
        story.append(Spacer(1, 0.3 * cm))

        if not queryset.exists():
            story.append(Paragraph('No accounts in this category.', styles['Normal']))
            story.append(Spacer(1, 0.5 * cm))
            return

        # Build header
        if include_spec:
            headers = ['#', 'Full Name', 'Username', 'Password', 'Specialisation', 'City']
            col_w = [0.8 * cm, 4.5 * cm, 3.5 * cm, 3 * cm, 4 * cm, 3 * cm]
        else:
            headers = ['#', 'Full Name', 'Username', 'Password', 'Email', 'City']
            col_w = [0.8 * cm, 4.5 * cm, 3.5 * cm, 3 * cm, 5 * cm, 2 * cm]

        data = [headers]
        nurse_profiles = {}
        if include_spec:
            for np in NurseProfile.objects.select_related('user').all():
                nurse_profiles[np.user_id] = np

        for idx, user in enumerate(queryset, 1):
            if include_spec:
                np = nurse_profiles.get(user.id)
                spec = np.specialisation if np else '—'
                row = [str(idx), f'{user.first_name} {user.last_name}',
                       user.username, PASSWORD, spec, user.city or '—']
            else:
                row = [str(idx), f'{user.first_name} {user.last_name}',
                       user.username, PASSWORD, user.email or '—', user.city or '—']
            data.append(row)

        table = Table(data, colWidths=col_w, repeatRows=1)
        row_count = len(data)
        table.setStyle(TableStyle([
            # Header
            ('BACKGROUND', (0, 0), (-1, 0), accent),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            # Data rows
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, bg]),
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),
            ('ALIGN', (1, 1), (-1, -1), 'LEFT'),
            ('GRID', (0, 0), (-1, -1), 0.3, colors.HexColor('#e5e7eb')),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(table)
        story.append(Spacer(1, 0.8 * cm))

    # ── Page decorations ──────────────────────────────────────────────────

    @staticmethod
    def _header_footer(canvas, doc):
        canvas.saveState()
        w, h = A4
        canvas.setFont('Helvetica', 7)
        canvas.setFillColor(colors.HexColor('#9ca3af'))
        canvas.drawString(1.5 * cm, 0.8 * cm, 'NurseConnect — CONFIDENTIAL')
        canvas.drawRightString(w - 1.5 * cm, 0.8 * cm, f'Page {canvas.getPageNumber()}')
        canvas.restoreState()
