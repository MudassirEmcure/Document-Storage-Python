"""Initialize database: create all tables and seed admin user."""

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
    print("All tables created successfully.")

    # Enable pg_trgm extension and create trigram index
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
        await conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_documents_name_trgm ON documents USING gin (document_name gin_trgm_ops)"
        ))
    print("pg_trgm extension and trigram index created.")

    # Seed admin user
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.username == "admin"))
        if result.scalar_one_or_none():
            print("Admin user already exists. Skipping seed.")
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
            print("Admin user created: username=admin, email=admin@emcure.com, password=1")

    print("\nDatabase initialization complete!")


if __name__ == "__main__":
    asyncio.run(init())
