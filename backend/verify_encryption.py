import os
import sys
import uuid
from sqlalchemy import text
from app.db.database import SessionLocal
from app.models import Etudiant
from app.services.crypto_service import decrypt_field, encrypt_field

def test_encryption_and_db():
    print("Testing encryption and DB storage...\n")
    
    # 1. Plain text details
    unique_id = str(uuid.uuid4())[:8]
    nom = f"TestNom_{unique_id}"
    email_plain = f"test_{unique_id}@example.com"
    telephone_plain = "1234567890"
    pin = "1234"
    
    print(f"--- Data to Store ---")
    print(f"Nom: {nom}")
    print(f"Email (Plain): {email_plain}")
    print(f"Telephone (Plain): {telephone_plain}")
    print(f"PIN (used for key): {pin}\n")
    
    # 2. Encrypt
    email_enc = encrypt_field(email_plain, pin)
    telephone_enc = encrypt_field(telephone_plain, pin)
    
    # 3. Store in DB
    db = SessionLocal()
    try:
        new_etudiant = Etudiant(
            nom=nom,
            prenom="TestPrenom",
            email=email_enc,
            filiere="GI",
            date_naissance="2000-01-01",
            sexe="M",
            telephone=telephone_enc,
            adresse=encrypt_field("123 Test St", pin)
        )
        db.add(new_etudiant)
        db.commit()
        db.refresh(new_etudiant)
        
        print(f"--- Stored in Database (ID: {new_etudiant.id_etudiant}) ---")
        
        # 4. Fetch raw from DB to prove it is encrypted
        # We use a raw SQL query to ensure we're not passing through any automatic decoding
        result = db.execute(text(f"SELECT email, telephone FROM etudiant WHERE id_etudiant = {new_etudiant.id_etudiant}"))
        row = result.fetchone()
        
        print(f"Raw Email in DB: {row[0][:50]}... (Total length: {len(row[0])})")
        print(f"Raw Telephone in DB: {row[1][:50]}... (Total length: {len(row[1])})\n")
        
        if row[0] == email_enc and row[0] != email_plain:
            print("[OK] Email is correctly stored ENCRYPTED in the DB.")
        
        # 5. Decrypt using the PIN
        decrypted_email = decrypt_field(row[0], pin)
        decrypted_telephone = decrypt_field(row[1], pin)
        
        print(f"\n--- After Decryption ---")
        print(f"Decrypted Email: {decrypted_email}")
        print(f"Decrypted Telephone: {decrypted_telephone}")
        
        if decrypted_email == email_plain:
            print("[OK] Decryption works perfectly and matches original plain text!")
        else:
            print("[FAIL] Decryption failed to match original!")
            
    except Exception as e:
        print(f"Error during test: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == '__main__':
    test_encryption_and_db()
