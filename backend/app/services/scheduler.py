"""APScheduler service for daily document expiry checks."""

import logging
from datetime import date, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.document import Document
from app.models.user import User, UserRole
from app.services.email_service import send_expiry_warning_email

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


async def check_document_expiry():
    """Daily job: send emails for documents expiring today or in 30 days."""
    logger.info("Running daily document expiry check...")
    today = date.today()
    thirty_days = today + timedelta(days=30)

    async with AsyncSessionLocal() as db:
        # Find documents expiring today or in 30 days
        result = await db.execute(
            select(Document).where(
                Document.is_deleted == False,
                Document.expiry_date.in_([today, thirty_days]),
            )
        )
        documents = result.scalars().all()

        if not documents:
            logger.info("No documents expiring today or in 30 days.")
            return

        # Get all admin emails
        admin_result = await db.execute(
            select(User).where(User.role == UserRole.admin, User.is_blocked == False)
        )
        admins = admin_result.scalars().all()
        admin_emails = [a.email for a in admins]

        for doc in documents:
            days_until = (doc.expiry_date - today).days

            # Get uploader email
            uploader_result = await db.execute(
                select(User).where(User.id == doc.uploaded_by)
            )
            uploader = uploader_result.scalar_one_or_none()
            uploader_email = uploader.email if uploader else None

            # Build recipient list: all admins + uploader (deduplicated)
            recipients = list(set(admin_emails + ([uploader_email] if uploader_email else [])))

            try:
                await send_expiry_warning_email(
                    to_emails=recipients,
                    document_name=doc.document_name,
                    company_name=doc.company.name if doc.company else "N/A",
                    bank_name=doc.bank.name if doc.bank else "N/A",
                    facility_name=doc.facility.name if doc.facility else "N/A",
                    expiry_date=str(doc.expiry_date),
                    days_until_expiry=days_until,
                )
            except Exception as e:
                logger.error(f"Failed to send expiry email for document {doc.id}: {e}")

    logger.info(f"Expiry check complete. Processed {len(documents)} document(s).")


def start_scheduler():
    """Register the daily expiry check job and start the scheduler."""
    scheduler.add_job(
        check_document_expiry,
        "cron",
        hour=8,
        minute=0,
        id="daily_expiry_check",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("APScheduler started — daily expiry check at 08:00 AM.")


def stop_scheduler():
    """Gracefully shut down the scheduler."""
    scheduler.shutdown(wait=False)
    logger.info("APScheduler stopped.")
