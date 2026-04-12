import psycopg2

conn = psycopg2.connect(
    dbname="biometric_db",
    user="postgres",
    host="localhost",
    password="postgres"
)
cur = conn.cursor()
cur.execute("SELECT face_embedding FROM biometrie WHERE id_etudiant = 1")
embedding = cur.fetchone()[0]
print(embedding)
cur.close()
conn.close()
