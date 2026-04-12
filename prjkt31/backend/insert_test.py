from passlib.context import CryptContext
import numpy as np
import psycopg2

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Connexion a la base
conn = psycopg2.connect(
    dbname="biometric_db",
    user="postgres",
    host="localhost",
    password="postgres"
)
cur = conn.cursor()

# Recuperer l'id de Dani Mohamed
cur.execute("SELECT id_etudiant FROM etudiant WHERE email = 'dani@gmail.com'")
result = cur.fetchone()
id_etudiant = result[0]
print(f"ID etudiant : {id_etudiant}")

# Hasher le PIN (ici PIN = 1234)
pin_hash = pwd_context.hash("1234")
print(f"PIN hashe : {pin_hash}")

# Creer le compte auth
cur.execute("""
    INSERT INTO auth (id_etudiant, username, password, role, pin_hash)
    VALUES (%s, %s, %s, %s, %s)
""", (id_etudiant, "dani.mohamed", pwd_context.hash("password123"), "etudiant", pin_hash))

# Generer un embedding facial de test (vecteur 128D aleatoire normalise)
embedding = np.random.rand(128).astype(float)
embedding = embedding / np.linalg.norm(embedding)  # normalisation
embedding_str = "[" + ",".join(map(str, embedding.tolist())) + "]"

# Inserer l'embedding dans biometrie
cur.execute("""
    INSERT INTO biometrie (id_etudiant, face_embedding)
    VALUES (%s, %s)
""", (id_etudiant, embedding_str))

# Inserer identite
cur.execute("""
    INSERT INTO identite (id_etudiant, cne, cin)
    VALUES (%s, %s, %s)
""", (id_etudiant, "G12345678", "AB123456"))

# Inserer des notes de test
notes = [
    ("Algorithmique", 16.5, "S1", "2024/2025"),
    ("Base de Donnees", 18.0, "S1", "2024/2025"),
    ("Reseaux", 14.0, "S1", "2024/2025"),
]
for module, note, session, annee in notes:
    cur.execute("""
        INSERT INTO notes (id_etudiant, module, note, session, annee)
        VALUES (%s, %s, %s, %s, %s)
    """, (id_etudiant, module, note, session, annee))

conn.commit()
cur.close()
conn.close()

print("Etudiant Dani Mohamed insere avec succes !")
print(f"Username : dani.mohamed")
print(f"PIN : 1234")
print(f"Embedding facial : genere et stocke")
