import os
import firebase_admin
from firebase_admin import credentials, firestore

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SERVICE_KEY = os.path.join(BASE_DIR, "firebase_service_account.json")

cred = credentials.Certificate(SERVICE_KEY)

firebase_admin.initialize_app(cred)

db = firestore.client()