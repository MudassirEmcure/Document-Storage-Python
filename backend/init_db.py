"""Initialize database: create all tables, extensions, indexes, and seed admin user.

Usage:
    python init_db.py

This script is idempotent — safe to run multiple times.
"""

import asyncio
from sqlalchemy import text, select

from app.database import Base, AsyncSessionLocal, engine
from app.models import *  # noqa: F401, F403
from app.models.user import User, UserRole
from app.services.auth_service import hash_password


async def init():
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("[1/3] All tables created.")

    # Enable pg_trgm extension and create trigram index for document search
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
        await conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_documents_name_trgm ON documents USING gin (document_name gin_trgm_ops)"
        ))
    print("[2/3] pg_trgm extension and trigram index ready.")

    # Seed admin user
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.username == "admin"))
        if result.scalar_one_or_none():
            print("[3/3] Admin user already exists. Skipping.")
        else:
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
            print("[3/3] Admin user created (username=admin, password=1)")

    print("\nDatabase initialization complete!")
    print("  Backend: uvicorn app.main:app --reload --port 8000")
    print("  Frontend: npm start (in frontend/)")


if __name__ == "__main__":
    asyncio.run(init())
