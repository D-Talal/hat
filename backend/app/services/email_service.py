"""
Email service — PropManager
Sends transactional alerts via Resend API.
Falls back gracefully if RESEND_API_KEY is not set (logs only).
"""

import os
import logging
from datetime import date
from typing import Optional

logger = logging.getLogger(__name__)

RESEND_API_KEY  = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL      = os.getenv("ALERT_FROM_EMAIL", "PropManager <alerts@propmanager.io>")
APP_URL         = os.getenv("FRONTEND_URL", "https://propmanager-frontend.onrender.com")


def _send(to: str, subject: str, html: str) -> bool:
    """Send an email via Resend. Returns True on success."""
    if not RESEND_API_KEY:
        logger.warning(f"[EMAIL SKIP] RESEND_API_KEY not set. Would send: '{subject}' to {to}")
        return False
    try:
        import resend
        resend.api_key = RESEND_API_KEY
        resend.Emails.send({
            "from":    FROM_EMAIL,
            "to":      [to],
            "subject": subject,
            "html":    html,
        })
        logger.info(f"[EMAIL SENT] '{subject}' → {to}")
        return True
    except Exception as e:
        logger.error(f"[EMAIL ERROR] Failed to send '{subject}' to {to}: {e}")
        return False


# ── HTML template base ─────────────────────────────────────────────────────────

def _base(title: str, body: str, org_name: str = "PropManager") -> str:
    return f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title></head>
<body style="margin:0;padding:0;background:#f4f5f9;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f9;padding:32px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.07);">
      <!-- Header -->
      <tr><td style="background:#4361ee;padding:24px 32px;">
        <span style="color:#ffffff;font-size:20px;font-weight:700;">PropManager</span>
        <span style="color:#c5caff;font-size:13px;margin-left:8px;">· {org_name}</span>
      </td></tr>
      <!-- Body -->
      <tr><td style="padding:32px;">
        {body}
      </td></tr>
      <!-- Footer -->
      <tr><td style="padding:16px 32px 24px;border-top:1px solid #eef0fd;">
        <p style="margin:0;font-size:12px;color:#9ea4be;">
          You received this alert because you are an admin or manager on PropManager.<br>
          <a href="{APP_URL}/settings" style="color:#4361ee;">Manage notification settings</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>"""


def _btn(label: str, url: str) -> str:
    return f'<a href="{url}" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#4361ee;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">{label}</a>'


def _badge(text: str, color: str) -> str:
    colors = {
        "red":    ("#fef2f2", "#dc2626"),
        "orange": ("#fff7ed", "#ea580c"),
        "blue":   ("#eef0fd", "#4361ee"),
        "green":  ("#f0fdf4", "#16a34a"),
    }
    bg, fg = colors.get(color, ("#f4f5f9", "#374151"))
    return f'<span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;background:{bg};color:{fg};">{text}</span>'


# ── Alert 1: Invoice overdue ───────────────────────────────────────────────────

def send_invoice_overdue(
    to: str,
    org_name: str,
    tenant_name: str,
    contract_number: str,
    invoice_amount: float,
    currency: str,
    due_date: date,
    days_overdue: int,
    invoice_id: int,
) -> bool:
    subject = f"⚠️ Overdue invoice — {tenant_name} ({days_overdue} days)"
    body = f"""
        <h2 style="margin:0 0 8px;font-size:20px;color:#0f1117;">Overdue invoice</h2>
        <p style="margin:0 0 20px;color:#6b7280;font-size:14px;">The following invoice has not been paid.</p>

        <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border-radius:8px;padding:20px;margin-bottom:20px;">
          <tr>
            <td style="font-size:13px;color:#6b7280;padding-bottom:6px;">Tenant</td>
            <td style="font-size:13px;font-weight:600;color:#0f1117;text-align:right;">{tenant_name}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#6b7280;padding-bottom:6px;">Contract</td>
            <td style="font-size:13px;font-weight:600;color:#0f1117;text-align:right;">{contract_number}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#6b7280;padding-bottom:6px;">Amount due</td>
            <td style="font-size:18px;font-weight:700;color:#dc2626;text-align:right;">{currency} {invoice_amount:,.2f}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#6b7280;padding-bottom:6px;">Due date</td>
            <td style="font-size:13px;font-weight:600;color:#0f1117;text-align:right;">{due_date.strftime('%d %b %Y')}</td>
          </tr>
          <tr>
            <td colspan="2" style="padding-top:12px;">
              {_badge(f"{days_overdue} days overdue", "red")}
            </td>
          </tr>
        </table>

        {_btn("View invoice", f"{APP_URL}/commercial/contracts")}
    """
    return _send(to, subject, _base(subject, body, org_name))


# ── Alert 2: Contract expiring soon ───────────────────────────────────────────

def send_contract_expiring(
    to: str,
    org_name: str,
    tenant_name: str,
    contract_number: str,
    end_date: date,
    days_remaining: int,
) -> bool:
    urgency = "red" if days_remaining <= 30 else "orange" if days_remaining <= 60 else "blue"
    subject = f"📋 Contract expiring in {days_remaining} days — {tenant_name}"
    body = f"""
        <h2 style="margin:0 0 8px;font-size:20px;color:#0f1117;">Contract expiring soon</h2>
        <p style="margin:0 0 20px;color:#6b7280;font-size:14px;">A lease is approaching its end date. Consider renewing or terminating.</p>

        <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;border-radius:8px;padding:20px;margin-bottom:20px;">
          <tr>
            <td style="font-size:13px;color:#6b7280;padding-bottom:6px;">Tenant</td>
            <td style="font-size:13px;font-weight:600;color:#0f1117;text-align:right;">{tenant_name}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#6b7280;padding-bottom:6px;">Contract</td>
            <td style="font-size:13px;font-weight:600;color:#0f1117;text-align:right;">{contract_number}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#6b7280;padding-bottom:6px;">End date</td>
            <td style="font-size:16px;font-weight:700;color:#ea580c;text-align:right;">{end_date.strftime('%d %b %Y')}</td>
          </tr>
          <tr>
            <td colspan="2" style="padding-top:12px;">
              {_badge(f"{days_remaining} days remaining", urgency)}
            </td>
          </tr>
        </table>

        {_btn("View contract", f"{APP_URL}/commercial/contracts")}
    """
    return _send(to, subject, _base(subject, body, org_name))


# ── Alert 3: Maintenance overdue ──────────────────────────────────────────────

def send_maintenance_overdue(
    to: str,
    org_name: str,
    title: str,
    priority: str,
    days_open: int,
    reported_by: Optional[str],
    unit_name: Optional[str],
) -> bool:
    priority_badge = {"high": "red", "medium": "orange", "low": "blue"}.get(priority, "orange")
    subject = f"🔧 Maintenance unresolved — {title} ({days_open} days)"
    body = f"""
        <h2 style="margin:0 0 8px;font-size:20px;color:#0f1117;">Unresolved maintenance request</h2>
        <p style="margin:0 0 20px;color:#6b7280;font-size:14px;">The following request has been open for more than {days_open} days.</p>

        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fc;border-radius:8px;padding:20px;margin-bottom:20px;">
          <tr>
            <td style="font-size:13px;color:#6b7280;padding-bottom:6px;">Issue</td>
            <td style="font-size:13px;font-weight:600;color:#0f1117;text-align:right;">{title}</td>
          </tr>
          {"" if not unit_name else f'<tr><td style="font-size:13px;color:#6b7280;padding-bottom:6px;">Unit</td><td style="font-size:13px;font-weight:600;color:#0f1117;text-align:right;">{unit_name}</td></tr>'}
          {"" if not reported_by else f'<tr><td style="font-size:13px;color:#6b7280;padding-bottom:6px;">Reported by</td><td style="font-size:13px;font-weight:600;color:#0f1117;text-align:right;">{reported_by}</td></tr>'}
          <tr>
            <td style="font-size:13px;color:#6b7280;padding-bottom:6px;">Open since</td>
            <td style="font-size:14px;font-weight:700;color:#0f1117;text-align:right;">{days_open} days</td>
          </tr>
          <tr>
            <td colspan="2" style="padding-top:12px;">
              {_badge(f"Priority: {priority.upper()}", priority_badge)}
            </td>
          </tr>
        </table>

        {_btn("View maintenance", f"{APP_URL}/commercial/service-charges")}
    """
    return _send(to, subject, _base(subject, body, org_name))


# ── Alert 4: Monthly summary ──────────────────────────────────────────────────

def send_monthly_summary(
    to: str,
    org_name: str,
    month_label: str,
    total_invoiced: float,
    total_paid: float,
    overdue_count: int,
    overdue_amount: float,
    expiring_contracts: int,
    open_maintenance: int,
    currency: str = "USD",
) -> bool:
    collected_pct = round(total_paid / total_invoiced * 100) if total_invoiced else 0
    subject = f"📊 Monthly summary — {month_label} · {org_name}"
    body = f"""
        <h2 style="margin:0 0 8px;font-size:20px;color:#0f1117;">Monthly summary</h2>
        <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">{month_label} · {org_name}</p>

        <!-- KPI row -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          <tr>
            <td width="25%" style="padding:4px;">
              <div style="background:#eef0fd;border-radius:8px;padding:16px;text-align:center;">
                <div style="font-size:11px;color:#9ea4be;font-weight:700;text-transform:uppercase;margin-bottom:6px;">Invoiced</div>
                <div style="font-size:18px;font-weight:700;color:#4361ee;">{currency} {total_invoiced:,.0f}</div>
              </div>
            </td>
            <td width="25%" style="padding:4px;">
              <div style="background:#f0fdf4;border-radius:8px;padding:16px;text-align:center;">
                <div style="font-size:11px;color:#9ea4be;font-weight:700;text-transform:uppercase;margin-bottom:6px;">Collected</div>
                <div style="font-size:18px;font-weight:700;color:#16a34a;">{currency} {total_paid:,.0f}</div>
                <div style="font-size:11px;color:#16a34a;margin-top:4px;">{collected_pct}%</div>
              </div>
            </td>
            <td width="25%" style="padding:4px;">
              <div style="background:#fef2f2;border-radius:8px;padding:16px;text-align:center;">
                <div style="font-size:11px;color:#9ea4be;font-weight:700;text-transform:uppercase;margin-bottom:6px;">Overdue</div>
                <div style="font-size:18px;font-weight:700;color:#dc2626;">{overdue_count}</div>
                <div style="font-size:11px;color:#dc2626;margin-top:4px;">{currency} {overdue_amount:,.0f}</div>
              </div>
            </td>
            <td width="25%" style="padding:4px;">
              <div style="background:#fff7ed;border-radius:8px;padding:16px;text-align:center;">
                <div style="font-size:11px;color:#9ea4be;font-weight:700;text-transform:uppercase;margin-bottom:6px;">Expiring</div>
                <div style="font-size:18px;font-weight:700;color:#ea580c;">{expiring_contracts}</div>
                <div style="font-size:11px;color:#ea580c;margin-top:4px;">contracts (90d)</div>
              </div>
            </td>
          </tr>
        </table>

        {"" if not open_maintenance else f'<div style="background:#f8f9fc;border-radius:8px;padding:14px 20px;margin-bottom:20px;font-size:13px;color:#6b7280;">🔧 <strong style="color:#0f1117;">{open_maintenance} maintenance requests</strong> currently open</div>'}

        {_btn("View dashboard", f"{APP_URL}/")}
    """
    return _send(to, subject, _base(subject, body, org_name))
