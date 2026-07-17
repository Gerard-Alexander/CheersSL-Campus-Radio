# db.py
import os
from pymongo import MongoClient

mongo_uri = os.environ.get("MONGO_URI", "mongodb://mongo:27017/campus_radio")
client = MongoClient(mongo_uri)
db = client.get_default_database()

# Collections
playlists_collection = db['playlists']
users_collection = db['users']
