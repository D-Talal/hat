"""
PDF Export Router — PropManager
GET /api/pdf/invoice/{invoice_id}     → Quittance de loyer (reçu)
GET /api/pdf/lease-statement/{contract_id}  → État locatif (toutes invoices d'un contrat)
"""

import io
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.core.deps import get_current_user, get_current_org
from app.models.retail import (
    Invoice, Contract, ContractObject, RentalObject,
    BusinessPartner, BusinessEntity, Condition, ConditionType,
)

router = APIRouter()

# ── ReportLab imports ──────────────────────────────────────────────────────────
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_RIGHT, TA_CENTER, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)

# ── Brand colours ──────────────────────────────────────────────────────────────
BLUE     = colors.HexColor("#4361ee")
BLUE_LT  = colors.HexColor("#eef0fd")
GREY     = colors.HexColor("#9ea4be")
DARK     = colors.HexColor("#0f1117")
GREEN    = colors.HexColor("#10b981")
RED      = colors.HexColor("#ef4444")
ORANGE   = colors.HexColor("#f97316")
WHITE    = colors.white


def _styles():
    s = getSampleStyleSheet()
    base = dict(fontName="Helvetica", textColor=DARK)
    return {
        "title":    ParagraphStyle("title",    **base, fontSize=22, leading=26, spaceAfter=2),
        "subtitle": ParagraphStyle("subtitle", **base, fontName="Helvetica-Oblique", fontSize=10, textColor=GREY),
        "h2":       ParagraphStyle("h2",       **base, fontName="Helvetica-Bold", fontSize=12, spaceBefore=14, spaceAfter=6),
        "body":     ParagraphStyle("body",     **base, fontSize=9,  leading=14),
        "body_r":   ParagraphStyle("body_r",   **base, fontSize=9,  leading=14, alignment=TA_RIGHT),
        "small":    ParagraphStyle("small",    **base, fontSize=8,  textColor=GREY),
        "label":    ParagraphStyle("label",    **base, fontName="Helvetica-Bold", fontSize=8, textColor=GREY),
        "bold":     ParagraphStyle("bold",     **base, fontName="Helvetica-Bold", fontSize=9),
        "footer":   ParagraphStyle("footer",   **base, fontSize=7,  textColor=GREY, alignment=TA_CENTER),
        "amount":   ParagraphStyle("amount",   fontName="Helvetica-Bold", fontSize=14, textColor=BLUE, alignment=TA_RIGHT),
    }


def _fmt_amount(amount, currency="USD"):
    try:
        val = float(amount or 0)
    except Exception:
        val = 0.0
    sym = {"USD": "$", "EUR": "€", "GBP": "£", "CAD": "CA$", "MAD": "MAD"}.get(currency, currency + " ")
    return f"{sym}{val:,.2f}"


def _fmt_date(d):
    if not d:
        return "—"
    if isinstance(d, str):
        return d
    return d.strftime("%d %b %Y")


def _header_block(story, st, doc_type: str, doc_number: str, doc_date: date, org_name: str):
    """Top bar with logo text, doc title and reference."""
    # Two-column header: left = org name/branding, right = doc info
    left = [
        [Paragraph(f"<b>{org_name}</b>", ParagraphStyle("ln", fontName="Helvetica-Bold", fontSize=16, textColor=BLUE))],
        [Paragraph("PropManager", ParagraphStyle("lm", fontSize=8, textColor=GREY))],
    ]
    right = [
        [Paragraph(doc_type, ParagraphStyle("rt", fontName="Helvetica-Bold", fontSize=14, textColor=DARK, alignment=TA_RIGHT))],
        [Paragraph(f"<font color='#9ea4be'>N°</font> {doc_number}", ParagraphStyle("rn", fontSize=9, alignment=TA_RIGHT))],
        [Paragraph(f"<font color='#9ea4be'>Date:</font> {_fmt_date(doc_date)}", ParagraphStyle("rd", fontSize=9, alignment=TA_RIGHT))],
    ]
    tbl = Table(
        [[Table(left, colWidths=[90*mm]), Table(right, colWidths=[90*mm])]],
        colWidths=[90*mm, 90*mm]
    )
    tbl.setStyle(TableStyle([("VALIGN", (0,0), (-1,-1), "TOP")]))
    story.append(tbl)
    story.append(HRFlowable(width="100%", thickness=1.5, color=BLUE, spaceAfter=10))


def _parties_block(story, st, landlord: dict, tenant: dict):
    """Two-column FROM / TO block."""
    def _party(label, info):
        rows = [[Paragraph(label, st["label"])]]
        for line in info:
            rows.append([Paragraph(line, st["body"])])
        return Table(rows, colWidths=[85*mm])

    l_tbl = _party("FROM", landlord)
    r_tbl = _party("TO", tenant)
    tbl = Table([[l_tbl, r_tbl]], colWidths=[95*mm, 85*mm])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (0,0), BLUE_LT),
        ("BACKGROUND", (1,0), (1,0), colors.HexColor("#f8f9fc")),
        ("BOX", (0,0), (0,0), 0.5, colors.HexColor("#d0d5f5")),
        ("BOX", (1,0), (1,0), 0.5, colors.HexColor("#e4e6ef")),
        ("TOPPADDING",    (0,0), (-1,-1), 10),
        ("BOTTOMPADDING", (0,0), (-1,-1), 12),
        ("LEFTPADDING",   (0,0), (-1,-1), 10),
        ("RIGHTPADDING",  (0,0), (-1,-1), 10),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
    ]))
    story.append(tbl)
    story.append(Spacer(1, 14))


def _footer(story, st, org_name):
    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=0.5, color=GREY, spaceAfter=6))
    story.append(Paragraph(
        f"{org_name} · Generated by PropManager · {date.today().strftime('%d %b %Y')}",
        st["footer"]
    ))


# ── Helpers to load data safely with org check ─────────────────────────────────

def _load_invoice(db, invoice_id, org):
    inv = (
        db.query(Invoice)
        .options(
            joinedload(Invoice.contract)
            .joinedload(Contract.business_partner)
            .joinedload(BusinessPartner.roles),
            joinedload(Invoice.contract)
            .joinedload(Contract.business_entity),
            joinedload(Invoice.contract)
            .joinedload(Contract.contract_objects)
            .joinedload(ContractObject.rental_object),
        )
        .filter(Invoice.id == invoice_id)
        .first()
    )
    if not inv:
        raise HTTPException(404, "Invoice not found")
    # Org check via business_entity
    be = inv.contract.business_entity
    if be.org_id != org.id:
        raise HTTPException(403, "Access denied")
    return inv


def _load_contract(db, contract_id, org):
    contract = (
        db.query(Contract)
        .options(
            joinedload(Contract.business_partner).joinedload(BusinessPartner.roles),
            joinedload(Contract.business_entity),
            joinedload(Contract.contract_objects).joinedload(ContractObject.rental_object),
            joinedload(Contract.conditions),
            joinedload(Contract.invoices),
        )
        .filter(Contract.id == contract_id)
        .first()
    )
    if not contract:
        raise HTTPException(404, "Contract not found")
    if contract.business_entity.org_id != org.id:
        raise HTTPException(403, "Access denied")
    return contract


# ── ENDPOINT 1: Quittance de loyer ─────────────────────────────────────────────

@router.get("/invoice/{invoice_id}")
def download_invoice_pdf(
    invoice_id: int,
    db: Session = Depends(get_db),
    u=Depends(get_current_user),
    org=Depends(get_current_org),
):
    inv = _load_invoice(db, invoice_id, org)
    contract = inv.contract
    bp = contract.business_partner
    be = contract.business_entity
    st = _styles()

    # Rental object names
    ro_names = ", ".join(
        co.rental_object.code if co.rental_object else "—"
        for co in (contract.contract_objects or [])
    ) or "—"

    # Landlord info
    landlord = [
        org.name,
        be.name,
        be.address or "",
        f"{be.city or ''} {be.country or ''}".strip(),
    ]
    landlord = [l for l in landlord if l]

    # Tenant info
    tenant = [
        bp.company_name or "—",
        bp.trade_name or "",
        bp.address or "",
        f"{bp.city or ''} {bp.country or ''}".strip(),
    ]
    tenant = [t for t in tenant if t]

    # Status colour
    status_color = GREEN if inv.status == "paid" else (RED if inv.status == "overdue" else ORANGE)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=18*mm, rightMargin=18*mm,
        topMargin=18*mm, bottomMargin=18*mm,
    )
    story = []

    # Header
    doc_num = f"INV-{inv.id:05d}"
    _header_block(story, st, "RENT RECEIPT", doc_num, inv.created_at or date.today(), org.name)

    # Parties
    _parties_block(story, st, landlord, tenant)

    # Invoice summary card
    summary_data = [
        [Paragraph("CONTRACT", st["label"]), Paragraph("UNIT(S)", st["label"]),
         Paragraph("PERIOD", st["label"]), Paragraph("TYPE", st["label"])],
        [
            Paragraph(contract.contract_number or f"#{contract.id}", st["body"]),
            Paragraph(ro_names, st["body"]),
            Paragraph(
                f"{_fmt_date(inv.period_from)} – {_fmt_date(inv.period_to)}"
                if inv.period_from else "—",
                st["body"]
            ),
            Paragraph((inv.condition_type or "—").replace("_", " ").title(), st["body"]),
        ],
    ]
    tbl = Table(summary_data, colWidths=[45*mm, 45*mm, 55*mm, 35*mm])
    tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,0), BLUE_LT),
        ("TEXTCOLOR",     (0,0), (-1,0), GREY),
        ("FONTNAME",      (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE",      (0,0), (-1,-1), 9),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8),
        ("TOPPADDING",    (0,0), (-1,-1), 8),
        ("LEFTPADDING",   (0,0), (-1,-1), 8),
        ("BOX",           (0,0), (-1,-1), 0.5, colors.HexColor("#d0d5f5")),
        ("LINEBELOW",     (0,0), (-1,0), 0.5, colors.HexColor("#d0d5f5")),
    ]))
    story.append(tbl)
    story.append(Spacer(1, 16))

    # Amount + status
    status_label = inv.status.upper() if inv.status else "PENDING"
    amount_data = [
        [
            Paragraph("AMOUNT DUE", st["label"]),
            Paragraph("STATUS", st["label"]),
            Paragraph("DUE DATE", st["label"]),
            Paragraph("PAID DATE", st["label"]),
        ],
        [
            Paragraph(_fmt_amount(inv.amount, inv.currency or "USD"), st["amount"]),
            Paragraph(
                f'<font color="{status_color.hexval() if hasattr(status_color, "hexval") else "#10b981"}"><b>{status_label}</b></font>',
                ParagraphStyle("st", fontSize=11, fontName="Helvetica-Bold", alignment=TA_LEFT)
            ),
            Paragraph(_fmt_date(inv.due_date), st["body"]),
            Paragraph(_fmt_date(inv.paid_date) if inv.paid_date else "—", st["body"]),
        ],
    ]
    tbl2 = Table(amount_data, colWidths=[50*mm, 40*mm, 40*mm, 40*mm])
    tbl2.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,0), BLUE_LT),
        ("FONTSIZE",      (0,0), (-1,-1), 9),
        ("BOTTOMPADDING", (0,0), (-1,-1), 10),
        ("TOPPADDING",    (0,0), (-1,-1), 10),
        ("LEFTPADDING",   (0,0), (-1,-1), 10),
        ("BOX",           (0,0), (-1,-1), 0.5, colors.HexColor("#d0d5f5")),
        ("LINEBELOW",     (0,0), (-1,0), 0.5, colors.HexColor("#d0d5f5")),
    ]))
    story.append(tbl2)

    # Description
    if inv.description:
        story.append(Spacer(1, 12))
        story.append(Paragraph("NOTES", st["label"]))
        story.append(Paragraph(inv.description, st["body"]))

    # Confirmation note if paid
    if inv.status == "paid":
        story.append(Spacer(1, 16))
        note = Table([[Paragraph(
            f"We hereby confirm receipt of payment of <b>{_fmt_amount(inv.amount, inv.currency or 'USD')}</b>"
            f" on <b>{_fmt_date(inv.paid_date)}</b> for the rental period"
            f" {_fmt_date(inv.period_from)} to {_fmt_date(inv.period_to)}.",
            ParagraphStyle("note", fontSize=9, textColor=DARK, leading=14)
        )]], colWidths=[174*mm])
        note.setStyle(TableStyle([
            ("BACKGROUND",    (0,0), (-1,-1), colors.HexColor("#ecfdf5")),
            ("BOX",           (0,0), (-1,-1), 0.5, colors.HexColor("#6ee7b7")),
            ("TOPPADDING",    (0,0), (-1,-1), 10),
            ("BOTTOMPADDING", (0,0), (-1,-1), 10),
            ("LEFTPADDING",   (0,0), (-1,-1), 12),
        ]))
        story.append(note)

    _footer(story, st, org.name)
    doc.build(story)
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=invoice_{doc_num}.pdf"},
    )


# ── ENDPOINT 2: État locatif ────────────────────────────────────────────────────

@router.get("/lease-statement/{contract_id}")
def download_lease_statement(
    contract_id: int,
    db: Session = Depends(get_db),
    u=Depends(get_current_user),
    org=Depends(get_current_org),
):
    contract = _load_contract(db, contract_id, org)
    bp = contract.business_partner
    be = contract.business_entity
    st = _styles()

    ro_names = ", ".join(
        co.rental_object.code if co.rental_object else "—"
        for co in (contract.contract_objects or [])
    ) or "—"

    landlord = [org.name, be.name, be.address or "", f"{be.city or ''} {be.country or ''}".strip()]
    landlord = [l for l in landlord if l]
    tenant   = [bp.company_name or "—", bp.trade_name or "", bp.address or "", f"{bp.city or ''} {bp.country or ''}".strip()]
    tenant   = [t for t in tenant if t]

    invoices = sorted(contract.invoices or [], key=lambda i: i.due_date or date.min)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=18*mm, rightMargin=18*mm,
        topMargin=18*mm, bottomMargin=18*mm,
    )
    story = []

    doc_num = contract.contract_number or f"#{contract.id}"
    _header_block(story, st, "LEASE STATEMENT", doc_num, date.today(), org.name)
    _parties_block(story, st, landlord, tenant)

    # Contract summary
    story.append(Paragraph("CONTRACT DETAILS", st["h2"]))
    contract_data = [
        ["Contract N°", contract.contract_number or f"#{contract.id}",
         "Unit(s)", ro_names],
        ["Start date",  _fmt_date(contract.start_date),
         "End date",    _fmt_date(contract.absolute_end_date)],
        ["Status",      (contract.status or "").replace("_", " ").title(),
         "Type",        (contract.contract_type or "").replace("_", " ").title()],
    ]
    tbl = Table(contract_data, colWidths=[35*mm, 55*mm, 30*mm, 55*mm])
    tbl.setStyle(TableStyle([
        ("FONTNAME",      (0,0), (0,-1), "Helvetica-Bold"),
        ("FONTNAME",      (2,0), (2,-1), "Helvetica-Bold"),
        ("FONTSIZE",      (0,0), (-1,-1), 9),
        ("TEXTCOLOR",     (0,0), (0,-1), GREY),
        ("TEXTCOLOR",     (2,0), (2,-1), GREY),
        ("TOPPADDING",    (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ("LEFTPADDING",   (0,0), (-1,-1), 0),
        ("LINEBELOW",     (0,0), (-1,-2), 0.3, colors.HexColor("#e4e6ef")),
    ]))
    story.append(tbl)
    story.append(Spacer(1, 14))

    # Active conditions
    if contract.conditions:
        story.append(Paragraph("FINANCIAL CONDITIONS", st["h2"]))
        cond_header = [
            Paragraph("TYPE", st["label"]),
            Paragraph("AMOUNT", st["label"]),
            Paragraph("CURRENCY", st["label"]),
            Paragraph("FREQUENCY", st["label"]),
            Paragraph("VALID FROM", st["label"]),
            Paragraph("VALID TO", st["label"]),
        ]
        cond_rows = [cond_header]
        today = date.today()
        for c in sorted(contract.conditions, key=lambda x: x.valid_from or date.min):
            is_active = (not c.valid_to or c.valid_to >= today)
            row_color = colors.HexColor("#f0fdf4") if is_active else colors.HexColor("#fafafa")
            cond_rows.append([
                Paragraph((c.condition_type or "—").replace("_", " ").title(), st["body"]),
                Paragraph(f"{float(c.amount or 0):,.2f}", st["body_r"]),
                Paragraph(c.currency or "—", st["body"]),
                Paragraph((c.frequency or "—").title(), st["body"]),
                Paragraph(_fmt_date(c.valid_from), st["body"]),
                Paragraph(_fmt_date(c.valid_to) if c.valid_to else "Open", st["body"]),
            ])

        cond_tbl = Table(cond_rows, colWidths=[42*mm, 25*mm, 20*mm, 25*mm, 26*mm, 24*mm])
        cond_style = [
            ("BACKGROUND",    (0,0), (-1,0), BLUE_LT),
            ("FONTSIZE",      (0,0), (-1,-1), 9),
            ("TOPPADDING",    (0,0), (-1,-1), 6),
            ("BOTTOMPADDING", (0,0), (-1,-1), 6),
            ("LEFTPADDING",   (0,0), (-1,-1), 6),
            ("LINEBELOW",     (0,0), (-1,-2), 0.3, colors.HexColor("#e4e6ef")),
            ("BOX",           (0,0), (-1,-1), 0.5, colors.HexColor("#d0d5f5")),
        ]
        cond_tbl.setStyle(TableStyle(cond_style))
        story.append(cond_tbl)
        story.append(Spacer(1, 14))

    # Invoice table
    story.append(Paragraph("INVOICE HISTORY", st["h2"]))
    if not invoices:
        story.append(Paragraph("No invoices recorded for this contract.", st["body"]))
    else:
        inv_header = [
            Paragraph("N°",          st["label"]),
            Paragraph("PERIOD",      st["label"]),
            Paragraph("TYPE",        st["label"]),
            Paragraph("DUE DATE",    st["label"]),
            Paragraph("AMOUNT",      st["label"]),
            Paragraph("STATUS",      st["label"]),
            Paragraph("PAID DATE",   st["label"]),
        ]
        inv_rows = [inv_header]
        total_paid    = 0.0
        total_pending = 0.0
        currency = invoices[0].currency or "USD" if invoices else "USD"

        for inv in invoices:
            status = (inv.status or "pending").lower()
            if status == "paid":
                s_color = "#10b981"
                total_paid += float(inv.amount or 0)
            elif status == "overdue":
                s_color = "#ef4444"
                total_pending += float(inv.amount or 0)
            else:
                s_color = "#f97316"
                total_pending += float(inv.amount or 0)

            period = (
                f"{_fmt_date(inv.period_from)} – {_fmt_date(inv.period_to)}"
                if inv.period_from else "—"
            )
            inv_rows.append([
                Paragraph(f"INV-{inv.id:05d}", st["small"]),
                Paragraph(period,                st["body"]),
                Paragraph((inv.condition_type or "—").replace("_", " ").title(), st["body"]),
                Paragraph(_fmt_date(inv.due_date), st["body"]),
                Paragraph(f"{float(inv.amount or 0):,.2f}", st["body_r"]),
                Paragraph(f'<font color="{s_color}"><b>{status.upper()}</b></font>',
                          ParagraphStyle("s", fontSize=8, fontName="Helvetica-Bold")),
                Paragraph(_fmt_date(inv.paid_date) if inv.paid_date else "—", st["body"]),
            ])

        # Totals row
        inv_rows.append([
            Paragraph("", st["body"]),
            Paragraph("", st["body"]),
            Paragraph("", st["body"]),
            Paragraph("<b>TOTALS</b>", st["bold"]),
            Paragraph(f"<b>{_fmt_amount(total_paid + total_pending, currency)}</b>", st["bold"]),
            Paragraph("", st["body"]),
            Paragraph("", st["body"]),
        ])

        inv_tbl = Table(inv_rows, colWidths=[22*mm, 38*mm, 28*mm, 22*mm, 24*mm, 20*mm, 22*mm])
        n = len(inv_rows)
        inv_tbl.setStyle(TableStyle([
            ("BACKGROUND",    (0,0),  (-1,0),   BLUE_LT),
            ("BACKGROUND",    (0,n-1),(-1,n-1), colors.HexColor("#f8f9fc")),
            ("LINEABOVE",     (0,n-1),(-1,n-1), 1, BLUE),
            ("FONTSIZE",      (0,0),  (-1,-1),  8),
            ("TOPPADDING",    (0,0),  (-1,-1),  6),
            ("BOTTOMPADDING", (0,0),  (-1,-1),  6),
            ("LEFTPADDING",   (0,0),  (-1,-1),  5),
            ("LINEBELOW",     (0,0),  (-1,-2),  0.3, colors.HexColor("#e4e6ef")),
            ("BOX",           (0,0),  (-1,-1),  0.5, colors.HexColor("#d0d5f5")),
        ]))
        story.append(inv_tbl)

        # Summary KPIs
        story.append(Spacer(1, 14))
        summary = Table([
            [
                Table([
                    [Paragraph("TOTAL PAID",    st["label"])],
                    [Paragraph(_fmt_amount(total_paid, currency),    ParagraphStyle("p", fontName="Helvetica-Bold", fontSize=13, textColor=GREEN))],
                ], colWidths=[55*mm]),
                Table([
                    [Paragraph("OUTSTANDING",   st["label"])],
                    [Paragraph(_fmt_amount(total_pending, currency), ParagraphStyle("o", fontName="Helvetica-Bold", fontSize=13, textColor=ORANGE))],
                ], colWidths=[55*mm]),
                Table([
                    [Paragraph("TOTAL INVOICED", st["label"])],
                    [Paragraph(_fmt_amount(total_paid + total_pending, currency), ParagraphStyle("t", fontName="Helvetica-Bold", fontSize=13, textColor=BLUE))],
                ], colWidths=[60*mm]),
            ]
        ], colWidths=[58*mm, 58*mm, 60*mm])
        summary.setStyle(TableStyle([
            ("BOX",           (0,0), (0,0), 0.5, colors.HexColor("#6ee7b7")),
            ("BOX",           (1,0), (1,0), 0.5, colors.HexColor("#fed7aa")),
            ("BOX",           (2,0), (2,0), 0.5, colors.HexColor("#d0d5f5")),
            ("BACKGROUND",    (0,0), (0,0), colors.HexColor("#ecfdf5")),
            ("BACKGROUND",    (1,0), (1,0), colors.HexColor("#fff7ed")),
            ("BACKGROUND",    (2,0), (2,0), BLUE_LT),
            ("TOPPADDING",    (0,0), (-1,-1), 10),
            ("BOTTOMPADDING", (0,0), (-1,-1), 10),
            ("LEFTPADDING",   (0,0), (-1,-1), 12),
        ]))
        story.append(summary)

    _footer(story, st, org.name)
    doc.build(story)
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=lease_statement_{contract.contract_number or contract_id}.pdf"},
    )


# ── ENDPOINT 3: Hotel Stay Invoice ────────────────────────────────────────────

@router.get("/hotel-stay/{booking_id}")
def download_stay_invoice(
    booking_id: int,
    db: Session = Depends(get_db),
    u=Depends(get_current_user),
    org=Depends(get_current_org),
):
    from app.models.hotel import Booking, Room, Hotel, Guest, BookingStatus
    try:
        from app.core.encryption import decrypt_field
    except ImportError:
        def decrypt_field(v): return v

    # Load booking with all relations
    booking = (
        db.query(Booking)
        .options(
            joinedload(Booking.room).joinedload(Room.hotel),
            joinedload(Booking.guest),
        )
        .filter(Booking.id == booking_id)
        .first()
    )
    if not booking:
        raise HTTPException(404, "Booking not found")

    room  = booking.room
    hotel = room.hotel if room else None
    if not hotel or hotel.org_id != org.id:
        raise HTTPException(403, "Access denied")

    guest = booking.guest
    st    = _styles()

    # Decrypt guest PII
    guest_name  = f"{decrypt_field(guest.first_name)} {decrypt_field(guest.last_name)}" if guest else "Guest"
    guest_email = decrypt_field(guest.email) if guest and guest.email else None
    guest_phone = decrypt_field(guest.phone) if guest and guest.phone else None

    # Compute stay details
    nights       = (booking.check_out - booking.check_in).days if booking.check_out and booking.check_in else 1
    base_rate    = float(room.base_rate or 0) if room else 0.0
    room_charges = base_rate * nights
    total        = float(booking.total_amount or room_charges)
    paid         = float(booking.paid_amount or 0)
    balance      = total - paid
    currency     = "USD"

    # Status
    status_label = (booking.status.value if booking.status else "confirmed").replace("_", " ").upper()
    status_color = GREEN if booking.status and booking.status.value == "checked_out" else BLUE

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=18*mm, rightMargin=18*mm,
        topMargin=18*mm, bottomMargin=18*mm,
    )
    story = []

    invoice_num = f"STAY-{booking.id:05d}"
    _header_block(story, st, "HOTEL STAY INVOICE", invoice_num, booking.check_out or date.today(), org.name)

    # Hotel & Guest parties
    hotel_info = [
        org.name,
        hotel.name,
        hotel.address or "",
        ((hotel.city or "") + " " + (hotel.country or "")).strip(),
    ]
    hotel_info = [l for l in hotel_info if l]

    guest_info = [guest_name]
    if guest_email: guest_info.append(guest_email)
    if guest_phone: guest_info.append(guest_phone)
    if guest and guest.nationality: guest_info.append(guest.nationality)

    _parties_block(story, st, hotel_info, guest_info)

    # Stay summary card
    stay_data = [
        [Paragraph("ROOM", st["label"]),     Paragraph("TYPE", st["label"]),
         Paragraph("CHECK-IN", st["label"]), Paragraph("CHECK-OUT", st["label"]),
         Paragraph("NIGHTS", st["label"])],
        [
            Paragraph(room.room_number if room else "—", st["body"]),
            Paragraph((room.room_type or "—").replace("_", " ").title() if room else "—", st["body"]),
            Paragraph(_fmt_date(booking.check_in),  st["body"]),
            Paragraph(_fmt_date(booking.check_out), st["body"]),
            Paragraph(str(nights), st["bold"]),
        ],
    ]
    stay_tbl = Table(stay_data, colWidths=[30*mm, 35*mm, 32*mm, 32*mm, 20*mm])
    stay_tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,0), BLUE_LT),
        ("FONTSIZE",      (0,0), (-1,-1), 9),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8),
        ("TOPPADDING",    (0,0), (-1,-1), 8),
        ("LEFTPADDING",   (0,0), (-1,-1), 8),
        ("BOX",           (0,0), (-1,-1), 0.5, colors.HexColor("#d0d5f5")),
        ("LINEBELOW",     (0,0), (-1,0), 0.5, colors.HexColor("#d0d5f5")),
    ]))
    story.append(stay_tbl)
    story.append(Spacer(1, 14))

    # Charges breakdown
    story.append(Paragraph("CHARGES", st["h2"]))
    charges = [
        [Paragraph("DESCRIPTION", st["label"]),
         Paragraph("UNIT PRICE", st["label"]),
         Paragraph("QTY", st["label"]),
         Paragraph("AMOUNT", st["label"])],
        [
            Paragraph(f"Room {room.room_number} — {(room.room_type or '').title()}" if room else "Room charge", st["body"]),
            Paragraph(_fmt_amount(base_rate, currency), st["body_r"]),
            Paragraph(f"{nights} night{'s' if nights != 1 else ''}", st["body"]),
            Paragraph(_fmt_amount(room_charges, currency), st["body_r"]),
        ],
    ]

    # Extra charges if total > room_charges
    extra = total - room_charges
    if abs(extra) > 0.01:
        charges.append([
            Paragraph("Additional charges", st["body"]),
            Paragraph("", st["body"]),
            Paragraph("", st["body"]),
            Paragraph(_fmt_amount(extra, currency), st["body_r"]),
        ])

    # Total row
    charges.append([
        Paragraph("", st["body"]),
        Paragraph("", st["body"]),
        Paragraph("<b>TOTAL</b>", st["bold"]),
        Paragraph(_fmt_amount(total, currency),
                  ParagraphStyle("tot", fontName="Helvetica-Bold", fontSize=13, textColor=BLUE, alignment=TA_RIGHT)),
    ])

    col_w = [90*mm, 28*mm, 26*mm, 26*mm]
    charges_tbl = Table(charges, colWidths=col_w)
    n = len(charges)
    charges_tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),  (-1,0),   BLUE_LT),
        ("BACKGROUND",    (0,n-1),(-1,n-1), colors.HexColor("#f8f9fc")),
        ("LINEABOVE",     (0,n-1),(-1,n-1), 1.5, BLUE),
        ("FONTSIZE",      (0,0),  (-1,-1),  9),
        ("TOPPADDING",    (0,0),  (-1,-1),  7),
        ("BOTTOMPADDING", (0,0),  (-1,-1),  7),
        ("LEFTPADDING",   (0,0),  (-1,-1),  8),
        ("LINEBELOW",     (0,0),  (-1,-2),  0.3, colors.HexColor("#e4e6ef")),
        ("BOX",           (0,0),  (-1,-1),  0.5, colors.HexColor("#d0d5f5")),
    ]))
    story.append(charges_tbl)
    story.append(Spacer(1, 14))

    # Payment summary
    pay_data = [
        [
            Table([
                [Paragraph("TOTAL CHARGED", st["label"])],
                [Paragraph(_fmt_amount(total, currency),
                           ParagraphStyle("tp", fontName="Helvetica-Bold", fontSize=14, textColor=BLUE))],
            ], colWidths=[55*mm]),
            Table([
                [Paragraph("AMOUNT PAID", st["label"])],
                [Paragraph(_fmt_amount(paid, currency),
                           ParagraphStyle("pp", fontName="Helvetica-Bold", fontSize=14, textColor=GREEN))],
            ], colWidths=[55*mm]),
            Table([
                [Paragraph("BALANCE DUE", st["label"])],
                [Paragraph(_fmt_amount(balance, currency),
                           ParagraphStyle("bp", fontName="Helvetica-Bold", fontSize=14,
                                          textColor=RED if balance > 0.01 else GREEN))],
            ], colWidths=[55*mm]),
        ]
    ]
    pay_tbl = Table(pay_data, colWidths=[58*mm, 58*mm, 58*mm])
    pay_tbl.setStyle(TableStyle([
        ("BOX",           (0,0), (0,0), 0.5, colors.HexColor("#d0d5f5")),
        ("BOX",           (1,0), (1,0), 0.5, colors.HexColor("#6ee7b7")),
        ("BOX",           (2,0), (2,0), 0.5, colors.HexColor("#fca5a5") if balance > 0.01 else colors.HexColor("#6ee7b7")),
        ("BACKGROUND",    (0,0), (0,0), BLUE_LT),
        ("BACKGROUND",    (1,0), (1,0), colors.HexColor("#ecfdf5")),
        ("BACKGROUND",    (2,0), (2,0), colors.HexColor("#fef2f2") if balance > 0.01 else colors.HexColor("#ecfdf5")),
        ("TOPPADDING",    (0,0), (-1,-1), 10),
        ("BOTTOMPADDING", (0,0), (-1,-1), 10),
        ("LEFTPADDING",   (0,0), (-1,-1), 12),
    ]))
    story.append(pay_tbl)

    # Special requests
    if booking.special_requests:
        story.append(Spacer(1, 12))
        story.append(Paragraph("SPECIAL REQUESTS", st["label"]))
        story.append(Paragraph(booking.special_requests, st["body"]))

    # Thank you note
    if balance <= 0.01:
        story.append(Spacer(1, 16))
        note = Table([[Paragraph(
            f"Thank you for staying at <b>{hotel.name}</b>. Your stay has been fully settled. "
            f"We hope to welcome you back soon!",
            ParagraphStyle("tn", fontSize=9, textColor=DARK, leading=14)
        )]], colWidths=[174*mm])
        note.setStyle(TableStyle([
            ("BACKGROUND",    (0,0), (-1,-1), colors.HexColor("#ecfdf5")),
            ("BOX",           (0,0), (-1,-1), 0.5, colors.HexColor("#6ee7b7")),
            ("TOPPADDING",    (0,0), (-1,-1), 10),
            ("BOTTOMPADDING", (0,0), (-1,-1), 10),
            ("LEFTPADDING",   (0,0), (-1,-1), 12),
        ]))
        story.append(note)

    _footer(story, st, org.name)
    doc.build(story)
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=stay_{invoice_num}.pdf"},
    )
