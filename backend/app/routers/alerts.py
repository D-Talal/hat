"""
Alerts router — manual trigger endpoints for testing
POST /api/alerts/test         → send a test email to the current user
POST /api/alerts/run/{job}    → manually trigger an alert job (admin only)
"""
import os
from fastapi import APIRouter, Depends, HTTPException
from app.core.deps import get_current_user, get_current_org
from app.core.permissions import require_permission

router = APIRouter()

@router.post("/test")
def send_test_alert(u=Depends(get_current_user), org=Depends(get_current_org)):
    """Send a test email to the logged-in user."""
    from app.services.email_service import send_monthly_summary
    ok = send_monthly_summary(
        to=u.email,
        org_name=org.name,
        month_label="Test — May 2025",
        total_invoiced=125000,
        total_paid=98500,
        overdue_count=3,
        overdue_amount=26500,
        expiring_contracts=2,
        open_maintenance=5,
    )
    if not ok:
        raise HTTPException(500, "Failed to send email. Check RESEND_API_KEY in environment variables.")
    return {"message": f"Test email sent to {u.email}"}


@router.post("/run/{job}")
def run_alert_job(job: str, u=Depends(require_permission("manage_users"))):
    """Manually trigger an alert job. Admin only."""
    from app.services.alert_engine import (
        check_overdue_invoices,
        check_expiring_contracts,
        check_stale_maintenance,
        send_monthly_summaries,
    )
    jobs = {
        "overdue":    check_overdue_invoices,
        "expiring":   check_expiring_contracts,
        "maintenance":check_stale_maintenance,
        "monthly":    send_monthly_summaries,
    }
    fn = jobs.get(job)
    if not fn:
        raise HTTPException(404, f"Unknown job '{job}'. Valid: {list(jobs.keys())}")
    fn()
    return {"message": f"Job '{job}' executed"}
