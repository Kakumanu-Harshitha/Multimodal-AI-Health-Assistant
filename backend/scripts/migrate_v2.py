import sys
import os
# Add the parent directory to sys.path to import from backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.database import engine
from sqlalchemy import text

def migrate_db():
    with engine.connect() as conn:
        print("Migrating database...")
        try:
            # Add role and is_active to user_accounts
            conn.execute(text("ALTER TABLE user_accounts ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'USER'"))
            conn.execute(text("ALTER TABLE user_accounts ADD COLUMN IF NOT EXISTS is_active INTEGER DEFAULT 1"))
            
            # Create system_configs table if not exists
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS system_configs (
                    id SERIAL PRIMARY KEY,
                    key VARCHAR UNIQUE NOT NULL,
                    value VARCHAR NOT NULL,
                    description VARCHAR,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            
            conn.commit()
            print("✅ Migration successful.")
        except Exception as e:
            print(f"❌ Migration failed: {e}")

if __name__ == "__main__":
    migrate_db()
