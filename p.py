import os
from pathlib import Path

# --- Configuration de la structure du projet --- "mon-projet-acces"

# Liste des dossiers à créer
DIRECTORIES = [
    f"backend/app/core",
    f"backend/app/db",
    f"backend/app/services",
    f"backend/app/routes",
    f"frontend/public",
    f"frontend/src/components",
    f"frontend/src/pages",
    f"frontend/src/services",
]

# Liste des fichiers à créer (chemins complets)
FILES = [
    # Root
    f".gitignore",
    f"README.md",
    f"docker-compose.yml",
    
    # Backend
    f"backend/.env",
    f"backend/.gitignore",
    f"backend/requirements.txt",
    f"backend/app/main.py",
    f"backend/app/__init__.py",
    f"backend/app/core/__init__.py",
    f"backend/app/core/config.py",
    f"backend/app/db/__init__.py",
    f"backend/app/db/database.py",
    f"backend/app/models.py",
    f"backend/app/schemas.py",
    f"backend/app/services/__init__.py",
    f"backend/app/services/ai_engine.py",
    f"backend/app/services/auth.py",
    f"backend/app/routes/__init__.py",
    f"backend/app/routes/auth.py",
    
    # Frontend
    f"frontend/.env",
    f"frontend/package.json",
    f"frontend/src/index.js",
    f"frontend/src/App.js",
    f"frontend/src/components/CameraFeed.js",
    f"frontend/src/components/PasswordInput.js",
    f"frontend/src/pages/LoginPage.js",
    f"frontend/src/pages/Dashboard.js",
    f"frontend/src/services/api.js",
]

def create_project_structure():
    print(f"🚀 Démarrage de la création du projet : ..")
    
    # 1. Création des dossiers
    for directory in DIRECTORIES:
        Path(directory).mkdir(parents=True, exist_ok=True)
        print(f"📁 Dossier créé : {directory}")
        
    # 2. Création des fichiers vides
    for file_path in FILES:
        path = Path(file_path)
        path.parent.mkdir(parents=True, exist_ok=True) # Sécurité au cas où le dossier parent n'existerait pas
        path.touch() # Crée le fichier vide
        print(f"📄 Fichier créé : {file_path}")
        
    print("\n✅ Structure du projet générée avec succès !")
    print("\n💡 Prochaines étapes :")
    print("1. Ouvre le dossier 'mon-projet-acces'.")
    print("2. Configure ton environnement virtuel Python dans /backend.")
    print("3. Installe les dépendances Node.js dans /frontend.")
    print("4. Commence à remplir les fichiers !")

if __name__ == "__main__":
    try:
        create_project_structure()
    except Exception as e:
        print(f"❌ Une erreur est survenue : {e}")