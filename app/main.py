from flask import Flask, redirect, url_for
from broadcaster.routes import broadcaster_bp
from viewer.routes import viewer_bp
from blueprints.uploads import uploads_bp
from blueprints.webrtc import register_webrtc_events
from blueprints.playlist import playlist_bp
from blueprints.authentication import auth_bp
from flask_socketio import SocketIO
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash
from db import users_collection
import os

# Moved SocketIO initialization to global scope
socketio = SocketIO(async_mode="eventlet", cors_allowed_origins="*")  # Moved to global

def create_app():
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
    app = Flask(__name__)
    app.secret_key = os.environ.get('SECRET_KEY')
    admin_email = os.getenv('ADMIN_EMAIL')
    admin_password = os.getenv('ADMIN_PASSWORD')
    admin_name = os.getenv('ADMIN_NAME')
    seed_admin_user(admin_email, admin_password, admin_name)  # Ensure admin user is seeded
    app.register_blueprint(broadcaster_bp, url_prefix='/broadcaster')
    app.register_blueprint(viewer_bp, url_prefix='/')
    app.register_blueprint(uploads_bp)
    app.register_blueprint(playlist_bp)
    app.register_blueprint(auth_bp)


    @app.route('/')
    def index():
        return redirect(url_for('viewer.viewer_home')) 
 
    return app


def seed_admin_user(admin_email=None, admin_password=None, admin_name=None):
    if not users_collection.find_one({'email': admin_email}):
        hashed_pw = generate_password_hash(admin_password)
        users_collection.insert_one({
            'email': admin_email,
            'password': hashed_pw,
            'name': admin_name,
            'role': 'admin'
        })
        print(f"[INIT] Admin user created: {admin_email}")
    else:
        print(f"[INIT] Admin user already exists: {admin_email}")


app = create_app()
register_webrtc_events(socketio)
socketio.init_app(app)
    # app = create_app()
    # socketio = SocketIO(app, async_mode="threading", cors_allowed_origins="*")    
    # register_webrtc_events(socketio)
    # socketio.run(app, host="0.0.0.0", port=8080)
    # #enter this into socketio.run parameters if final
    # #ssl_context=("cheerslcert.pem", "cheerslkey.pem")from flask import Flask, redirect, url_for
from broadcaster.routes import broadcaster_bp
from viewer.routes import viewer_bp
from blueprints.uploads import uploads_bp
from blueprints.webrtc import register_webrtc_events
from blueprints.playlist import playlist_bp
from blueprints.authentication import auth_bp
from flask_socketio import SocketIO
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash
from db import users_collection
import os

# Moved SocketIO initialization to global scope
socketio = SocketIO(async_mode="eventlet", cors_allowed_origins="*")  # Moved to global

def create_app():
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
    app = Flask(__name__)
    app.secret_key = os.environ.get('SECRET_KEY')
    admin_email = os.getenv('ADMIN_EMAIL')
    admin_password = os.getenv('ADMIN_PASSWORD')
    admin_name = os.getenv('ADMIN_NAME')
    seed_admin_user(admin_email, admin_password, admin_name)  # Ensure admin user is seeded
    app.register_blueprint(broadcaster_bp, url_prefix='/broadcaster')
    app.register_blueprint(viewer_bp, url_prefix='/')
    app.register_blueprint(uploads_bp)
    app.register_blueprint(playlist_bp)
    app.register_blueprint(auth_bp)


    @app.route('/')
    def index():
        return redirect(url_for('viewer.viewer_home')) 
 
    return app


def seed_admin_user(admin_email=None, admin_password=None, admin_name=None):
    if not users_collection.find_one({'email': admin_email}):
        hashed_pw = generate_password_hash(admin_password)
        users_collection.insert_one({
            'email': admin_email,
            'password': hashed_pw,
            'name': admin_name,
            'role': 'admin'
        })
        print(f"[INIT] Admin user created: {admin_email}")
    else:
        print(f"[INIT] Admin user already exists: {admin_email}")


app = create_app()
register_webrtc_events(socketio)
socketio.init_app(app)
    # app = create_app()
    # socketio = SocketIO(app, async_mode="threading", cors_allowed_origins="*")    
    # register_webrtc_events(socketio)
    # socketio.run(app, host="0.0.0.0", port=8080)
    # #enter this into socketio.run parameters if final
    # #ssl_context=("cheerslcert.pem", "cheerslkey.pem")