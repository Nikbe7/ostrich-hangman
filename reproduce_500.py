from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

legacy_hash = "acf3dc37b23890fbda076bd5bbada7fd95ef86b253ca1b4e307b688150b54cda"
password = "test"

try:
    match = pwd_context.verify(password, legacy_hash)
    print(f"Match: {match}")
except Exception as e:
    print(f"Crashed with: {type(e).__name__}: {e}")
