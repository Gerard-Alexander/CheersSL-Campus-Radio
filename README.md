# Campus Radio

Campus Radio is a Flask-based broadcasting platform for campus radio use cases. It includes a broadcaster dashboard, a public viewer page, media upload support, playlist management, real-time ticker updates, and WebRTC-based live signaling. The application is containerized with Docker Compose and uses MongoDB for persistent storage.

## Overview

This project combines a web frontend, backend APIs, and real-time communication features into a single deployment. It is designed to support:

- broadcaster login and authenticated access
- media upload and file serving
- playlist creation and management
- real-time "now playing" and ticker updates
- WebRTC-based viewer and broadcaster communication
- Docker-based deployment with Flask, MongoDB, and Nginx

## Features

- Secure login flow with session-based authentication
- Admin user initialization from environment variables
- Audio, video, and image upload support
- Playlist CRUD operations stored in MongoDB
- Real-time ticker and playback synchronization for viewers
- WebRTC event handling for broadcaster/viewer signaling
- Containerized deployment with Docker Compose

## Tech Stack

- Backend: Flask, Flask-SocketIO, Gunicorn, eventlet
- Database: MongoDB with PyMongo
- Frontend: HTML, CSS, and plain JavaScript
- Infrastructure: Docker Compose and Nginx

## Project Structure

- app/main.py: Flask app setup, blueprint registration, and Socket.IO initialization
- app/broadcaster/: broadcaster UI, templates, and client-side logic
- app/viewer/: public viewer interface and viewer-side scripts
- app/blueprints/: authentication, uploads, playlists, and WebRTC handlers
- app/db.py: MongoDB connection and collection access
- app/app/uploads/: uploaded media storage
- nginx/: Nginx configuration and SSL files
- tests/: automated regression tests
- docker-compose.yml: service definitions for Flask, MongoDB, and Nginx

## Environment Setup
Create a `.env` file in the project root before starting the containers and add the following values:

```env
SECRET_KEY=replace-with-a-secure-secret
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change-me
ADMIN_NAME=Administrator

MONGO_URI=mongodb://myuser:mypassword@mongo:27017/campus_radio
MONGO_INITDB_ROOT_USERNAME=myuser
MONGO_INITDB_ROOT_PASSWORD=mypassword
```

> Keep the `.env` file private and do not commit it to version control.

---

### Request flow
1. Client requests reach Nginx on port `8443`.
2. Nginx forwards traffic to Flask at `flask:8000`.
3. Flask serves:
   - `/` → viewer page
   - `/broadcaster` → broadcaster dashboard
4. Socket.IO manages real-time WebRTC signaling for the broadcaster and connected viewers.

---

## Source Code Documentation
### Core server files
- `app/main.py`
  - Creates the Flask application and loads environment settings
  - Registers the broadcaster, viewer, authentication, upload, and playlist blueprints
  - Initializes Flask-SocketIO and WebRTC event registration

- `app/broadcaster/routes.py`
  - Defines the authenticated broadcaster route and serves the broadcaster template

- `app/viewer/routes.py`
  - Defines the viewer route and serves the viewer template

### Blueprints
- `app/blueprints/authentication.py`
  - Handles login, logout, and session-based access control
- `app/blueprints/playlist.py`
  - Provides playlist CRUD endpoints for saving and managing playlists
- `app/blueprints/uploads.py`
  - Handles file upload, serving, deletion, and file listing
- `app/blueprints/webrtc.py`
  - Implements Socket.IO WebRTC signaling events for broadcaster/viewer connectivity

### Frontend structure
- `app/broadcaster/static/js/broadcaster/broadcaster.js`
  - Initializes the broadcaster UI, playlist loading, stream controls, and device selection
- `app/broadcaster/static/js/playlist/playlist-manager.js`
  - Manages playlist state and item rendering
- `app/broadcaster/static/js/playlist/playlist-ui.js`
  - Renders playlist items and the now-playing interface
- `app/broadcaster/static/js/playlist/playlist-media.js`
  - Controls playback of audio and video items and updates the current state
- `app/broadcaster/static/js/broadcaster/webrtc-handler.js`
  - Tracks connected viewers and handles messaging
- `app/viewer/static/js/viewer-script.js`
  - Connects viewers to the stream and handles player events

## Directory Summary
- `app/`: Flask application source code
- `app/broadcaster/`: broadcaster-facing routes, templates, and JavaScript
- `app/viewer/`: viewer-facing routes, templates, and JavaScript
- `app/blueprints/`: modular backend APIs and authentication logic
- `nginx/`: Nginx configuration and SSL certificates
- `docker-compose.yml`: service definitions and container orchestration

---

### Changing the domain name into cheerssl.slu.edu.ph

#### Configuration of default.conf
1. in `default.conf` under `nginx` put the domain name beside the server name
2. enter a primary server that references port 80
3. enter a `default_server` keyword beside the port


```conf
server {
    listen 80 default_server;
    server_name cheerssl.slu.edu.ph www.cheerssl.slu.edu.ph;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl default_server;
    server_name cheerssl.slu.edu.ph www.cheerssl.slu.edu.ph;
    ...
}
```

---

#### Configuration of yaml
1. expose the following ports under nginx configuration in yaml

      - "80:80"
      - "443:443"
      - "8443:443"

---

### Docker Setup
1. Install Docker Desktop
2. After installation, open docker desktop and make sure that it is running
3. In the project directory, run the following code:

```bash
docker compose up -d --build
```
4. This will build and start the project.
5. Access it through Nginx port (Locally): https://<ip-address>:8443 or 
through Flask: https://<ip-address>:8000

---

### Creating username and password for the local database
1. Add the MONGO_URI, and username and password to the .env file for the credentials (put this in .gitignore)
```
MONGO_URI=mongodb://myuser:mypassword@mongo:27017/campus_radio
MONGO_INITDB_ROOT_USERNAME=username
MONGO_INITDB_ROOT_PASSWORD=password
```
2. Update Flask and Mongo service to use auth

Flask: 
```yaml
environment:
    - MONGO_URI=${MONGO_URI}
```

Mongo:
```yaml
 environment:
      - MONGO_INITDB_ROOT_USERNAME=${MONGO_INITDB_ROOT_USERNAME}
      - MONGO_INITDB_ROOT_PASSWORD=${MONGO_INITDB_ROOT_PASSWORD}
      - MONGO_INITDB_DATABASE=campus_radio
```
3. If database is already populated, remove the data or the volume using this command the restart (!!!THIS WILL REMOVE ALL SAVED DOCUMENT) But, this is also recommended when an inital database is already created, so that ne credentials will take effect.

```bash
docker compose down -v
```
4. Restart Docker

```bash
docker compose down
docker compose up -d --build
```

---

### SLU Cert and Key (SSL Configuration)
1. Use a certificate for the domain (`cheerssl.slu.edu.ph`)
   - Replace `nginx/ssl/cheersslcert.pem` and `nginx/ssl/cheersslkey.pem` with a cert and key for `cheerssl.slu.edu.ph` in `default.conf`. (Make sure you have these files in your project folder)

   ```conf
    ssl_certificate     /etc/nginx/certs/STAR_slu_edu_ph.pem;
    ssl_certificate_key /etc/nginx/certs/cheersslkey.pem;
   ```
   - make sure that the mirrored directory under volume has an extension of .pem in yaml

   ```yaml
       volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
      - ./nginx/ssl/STAR_slu_edu_ph.crt:/etc/nginx/certs/STAR_slu_edu_ph.pem:ro
      - ./nginx/ssl/cheersslkey.key:/etc/nginx/certs/cheersslkey.pem:ro
   ```

2. Restart Docker Compose:

```bash
docker compose down
docker compose up -d --build
```
3. Open the site:
   - `https://cheerssl.slu.edu.ph`

---

### Port Forwarding
After deploying the project in Docker containerization, the public IP address of the machine is accessible, but the specific ports needed by the project is unreachable. To fix this, we need to configure port forwarding which can be configured by accessing the super admin of the router.

1. Access the pldt admin page
   - 192.168.1.1 
2. Login as super admin
   - for credentials, contact ISTSD
3. Go to Forward Rules
4. Under forward rules, go to port mapping configuration
5. Click new and create with these following configurations
   1. Type - User-defined
   2. Enable Port Mapping - Check
   3. Mapping name - <arbitrary>
   4. Internal Host - <machine local ip>
   5. External Source IP Address - <leave blank>
   6. Protocol - TCP
   7. Internal Port number - 443 -- 443
   8. External port number - 443 -- 443 

---