"""Email notification service using aiosmtplib."""

import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

import aiosmtplib

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


async def send_email(
    to_emails: list[str],
    subject: str,
    html_body: str,
    text_body: Optional[str] = None,
) -> None:
    """Send an email to one or more recipients."""
    if not settings.SMTP_HOST or not settings.SMTP_USER:
        logger.warning("SMTP not configured, skipping email send")
        return

    for to_email in to_emails:
        try:
            msg = MIMEMultipart("alternative")
            msg["From"] = settings.EMAIL_FROM
            msg["To"] = to_email
            msg["Subject"] = subject

            if text_body:
                msg.attach(MIMEText(text_body, "plain"))
            msg.attach(MIMEText(html_body, "html"))

            await aiosmtplib.send(
                msg,
                hostname=settings.SMTP_HOST,
                port=settings.SMTP_PORT,
                username=settings.SMTP_USER,
                password=settings.SMTP_PASSWORD,
                start_tls=True,
                validate_certs=False,
            )
            logger.info(f"Email sent to {to_email}: {subject}")
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")


async def send_document_uploaded_email(
    to_emails: list[str],
    document_name: str,
    company_name: str,
    bank_name: str,
    facility_name: str,
    expiry_date: str,
    uploaded_by: str,
    uploaded_at: str,
) -> None:
    subject = f"[Document Storage] Document Uploaded: {document_name}"
    html_body = f"""
    <h2>Document Uploaded</h2>
    <table>
        <tr><td><strong>Document:</strong></td><td>{document_name}</td></tr>
        <tr><td><strong>Company:</strong></td><td>{company_name}</td></tr>
        <tr><td><strong>Bank:</strong></td><td>{bank_name}</td></tr>
        <tr><td><strong>Facility:</strong></td><td>{facility_name}</td></tr>
        <tr><td><strong>Expiry Date:</strong></td><td>{expiry_date}</td></tr>
        <tr><td><strong>Uploaded By:</strong></td><td>{uploaded_by}</td></tr>
        <tr><td><strong>Upload Time:</strong></td><td>{uploaded_at}</td></tr>
    </table>
    """
    text_body = (
        f"Document Uploaded\n\n"
        f"Document: {document_name}\nCompany: {company_name}\nBank: {bank_name}\n"
        f"Facility: {facility_name}\nExpiry Date: {expiry_date}\n"
        f"Uploaded By: {uploaded_by}\nUpload Time: {uploaded_at}"
    )
    await send_email(to_emails, subject, html_body, text_body)


async def send_document_deleted_email(
    to_emails: list[str],
    document_name: str,
    company_name: str,
    bank_name: str,
    facility_name: str,
    deleted_by: str,
    deleted_at: str,
) -> None:
    subject = f"[Document Storage] Document Deleted: {document_name}"
    html_body = f"""
    <h2>Document Deleted</h2>
    <table>
        <tr><td><strong>Document:</strong></td><td>{document_name}</td></tr>
        <tr><td><strong>Company:</strong></td><td>{company_name}</td></tr>
        <tr><td><strong>Bank:</strong></td><td>{bank_name}</td></tr>
        <tr><td><strong>Facility:</strong></td><td>{facility_name}</td></tr>
        <tr><td><strong>Deleted By:</strong></td><td>{deleted_by}</td></tr>
        <tr><td><strong>Deletion Time:</strong></td><td>{deleted_at}</td></tr>
    </table>
    """
    text_body = (
        f"Document Deleted\n\n"
        f"Document: {document_name}\nCompany: {company_name}\nBank: {bank_name}\n"
        f"Facility: {facility_name}\nDeleted By: {deleted_by}\nDeletion Time: {deleted_at}"
    )
    await send_email(to_emails, subject, html_body, text_body)


async def send_expiry_warning_email(
    to_emails: list[str],
    document_name: str,
    company_name: str,
    bank_name: str,
    facility_name: str,
    expiry_date: str,
    days_until_expiry: int,
) -> None:
    if days_until_expiry == 0:
        subject = f"[Document Storage] Document Expired: {document_name}"
        heading = "Document Expired"
    else:
        subject = f"[Document Storage] Expiry Warning: {document_name} expires in {days_until_expiry} days"
        heading = f"Document Expires in {days_until_expiry} Days"

    html_body = f"""
    <h2>{heading}</h2>
    <table>
        <tr><td><strong>Document:</strong></td><td>{document_name}</td></tr>
        <tr><td><strong>Company:</strong></td><td>{company_name}</td></tr>
        <tr><td><strong>Bank:</strong></td><td>{bank_name}</td></tr>
        <tr><td><strong>Facility:</strong></td><td>{facility_name}</td></tr>
        <tr><td><strong>Expiry Date:</strong></td><td>{expiry_date}</td></tr>
    </table>
    """
    text_body = (
        f"{heading}\n\n"
        f"Document: {document_name}\nCompany: {company_name}\nBank: {bank_name}\n"
        f"Facility: {facility_name}\nExpiry Date: {expiry_date}"
    )
    await send_email(to_emails, subject, html_body, text_body)
