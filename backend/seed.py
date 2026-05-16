"""Seed script: creates the initial admin user."""

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
        print(f"Admin user created: username=admin, email=admin@emcure.com, password=1")


if __name__ == "__main__":
    asyncio.run(seed())
