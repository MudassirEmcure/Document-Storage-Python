"""Emcure Employee API integration service."""

import logging
from typing import Optional

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

EMCURE_API_URL = "https://ad-prod-darwinsvc-prod.apps.emart.oneemcure.local/adintegratorservices/rest/v1/getselectedemployees"


async def fetch_employee_data(employee_id: str) -> Optional[dict]:
    """Fetch employee data from Emcure Darwin API.
    
    The API expects multipart form data with EmployeeIDs field.
    Returns the employee dict or None if not found.
    """
    try:
        async with httpx.AsyncClient(verify=False, timeout=30.0) as client:
            response = await client.post(
                EMCURE_API_URL,
                files={"EmployeeIDs": (None, employee_id)},
            )

        if response.status_code != 200:
            logger.error(f"Emcure API returned {response.status_code} for employee {employee_id}")
            return None

        data = response.json()
        employees = data.get("employeeData", [])

        if not employees:
            logger.warning(f"No employee data found for ID: {employee_id}")
            return None

        return employees[0]

    except Exception as e:
        logger.error(f"Failed to fetch employee data for {employee_id}: {e}")
        return None


def extract_user_fields(emp_data: dict) -> dict:
    """Extract relevant fields from the Emcure API response for our User model."""
    return {
        "employee_id": emp_data.get("employee_id", ""),
        "first_name": emp_data.get("first_name", ""),
        "middle_name": emp_data.get("middle_name", ""),
        "last_name": emp_data.get("last_name", ""),
        "email": emp_data.get("company_email_id", ""),
        "designation": emp_data.get("designation_title", ""),
        "department": emp_data.get("department", ""),
        "division": emp_data.get("division", ""),
        "business_unit": emp_data.get("business_unit", ""),
        "office_location": emp_data.get("office_location", ""),
        "employee_status": emp_data.get("employee_status", ""),
        "direct_manager_name": emp_data.get("direct_manager_name", ""),
        "direct_manager_email": emp_data.get("direct_manager_email", ""),
    }
