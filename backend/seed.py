"""Seed script: creates the initial admin user.

Usage:
    python seed.py

Default admin credentials:
    username: admin
    password: 1
    email: admin@emcure.com
"""

import asyncio
from app.database import AsyncSessionLocal
from app.models.user import User, UserRole
from app.services.auth_service import hash_password
from sqlalchemy import select


async def seed():
    async with AsyncSessionLocal() as db:
        # Check if admin already exists
        result = await db.execute(select(User).where(User.username == "admin"))
        if result.scalar_one_or_none():
            print("Admin user already exists. Skipping seed.")
            return

        admin = User(
            username="admin",
            email="admin@emcure.com",
            password_hash=hash_password("1"),
            role=UserRole.admin,
            employee_id="ADMIN001",
            first_name="Admin",
            last_name="User",
        )
        db.add(admin)
        await db.commit()
        print("Admin user created successfully.")
        print("  Username: admin")
        print("  Password: 1")
        print("  Email:    admin@emcure.com")


if __name__ == "__main__":
    asyncio.run(seed())
