import sys
import os
# Add the parent directory to sys.path to import from backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.database import SessionLocal
from backend.models import User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_owner(email, password):
    db = SessionLocal()
    try:
        # Check if email exists
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"Error: User with email {email} already exists.")
            return

        hashed_password = pwd_context.hash(password)
        owner = User(
            email=email,
            password=hashed_password,
            role="OWNER",
            is_active=1
        )
        db.add(owner)
        db.commit()
        print(f"✅ Success: Owner account created for {email}")
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python create_owner.py <email> <password>")
    else:
        email = sys.argv[1]
        password = sys.argv[2]
        create_owner(email, password)
