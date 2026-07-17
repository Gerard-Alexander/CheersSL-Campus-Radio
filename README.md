# Revamp Campus Radio

CREATE .env file in the root before running docker-compose
Add this to the file 

---

## Project Architecture
This project is built with a Flask backend, Socket.IO WebRTC signaling, MongoDB persistence, and Nginx as an SSL reverse proxy. The app is containerized using Docker Compose.

- `flask` service: runs the Flask app on port `8000`
- `mongo` service: stores users, playlists, and upload metadata
- `nginx` service: terminates SSL and proxies requests to Flask
- `app/broadcaster`: authenticated broadcaster UI and controls
- `app/viewer`: public viewer UI and stream playback  

### Request flow
1. User request reaches Nginx on `8443`.
2. Nginx proxies traffic to Flask at `flask:8000`.
3. Flask serves:
   - `/` → viewer page
   - `/broadcaster` → broadcaster dashboard
   - `/api` / playlist / upload endpoints via blueprints
4. Socket.IO handles real-time WebRTC signaling for live stream viewers and broadcaster controls.

---

## Source Code Documentation
### Core server files
- `app/main.py`
  - Creates the Flask app and loads environment settings
  - Registers blueprints for broadcaster, viewer, authentication, uploads, and playlist
  - Initializes Flask-SocketIO and WebRTC event registration

- `app/broadcaster/routes.py`
  - Defines the authenticated broadcaster route and serves `broadcaster.html`

- `app/viewer/routes.py`
  - Defines the viewer route and serves `viewer.html`
  - Uses `static_url_path='/assets'` for viewer assets

### Blueprints
- `app/blueprints/authentication.py`
  - Handles login, logout, and access control
- `app/blueprints/playlist.py`
  - Provides playlist CRUD endpoints
- `app/blueprints/uploads.py`
  - Handles file upload, download, delete, and listing
- `app/blueprints/webrtc.py`
  - Implements Socket.IO WebRTC signaling events for broadcaster/viewer connectivity

### Frontend structure
- `app/broadcaster/static/js/broadcaster/broadcaster.js`
  - Initializes broadcaster UI, playlist loading, stream controls, and device selection
- `app/broadcaster/static/js/playlist/playlist-manager.js`
  - Manages playlist state and item rendering
- `app/broadcaster/static/js/playlist/playlist-ui.js`
  - Renders playlist items and now-playing UI
- `app/broadcaster/static/js/playlist/playlist-media.js`
  - Controls playback of audio/video items and updates now-playing state
- `app/broadcaster/static/js/broadcaster/webrtc-handler.js`
  - Tracks connected viewers and handles messaging
- `app/viewer/static/js/viewer-script.js`
  - Connects viewers to the stream and handles player events

## Directory Summary
- `app/`: Flask app source code
- `app/broadcaster/`: broadcaster-facing routes, templates, and JS
- `app/viewer/`: viewer-facing routes, templates, and JS
- `app/blueprints/`: modular backend APIs and authentication logic
- `nginx/`: Nginx configuration and SSL certificates
- `docker-compose.yml`: service definitions and container orchestration

---

### Admin Credentials
ADMIN_EMAIL=example@example.com
ADMIN_PASSWORD=examplePassword
ADMIN_NAME=Example

Docker will automatically generate the secret key.

---

### .env File Configurations
.env file contains credentials for the admin, as well as the username and password for the database. Make sure that this file is not easily accessible. Put this in .gitignore if uploading in git

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

## Admin User Guide

### Overview
The Campus Radio Broadcaster Dashboard allows admins to manage live streaming with video/audio playback and device management. This guide explains how to upload media files and queue them for broadcast.

### Dashboard Layout

The broadcaster dashboard is divided into 4 main sections:

1. **Devices (Left Sidebar)** - Camera and microphone selection
2. **Stream Preview (Center)** - Live stream display and controls
3. **Queue (Top Right)** - Now Playing and upcoming queue
4. **Files (Right Panel)** - Uploaded videos and audio files

---

### Uploading Media Files

#### How to Upload Videos or Audio

1. **Locate the Files Panel** on the right side of the dashboard
   - You'll see two sections: **Videos** and **Audio**

2. **Click the Plus Icon (+)** next to the file type you want to upload
   - Videos: Upload MP4, WebM, AVI, or MOV files
   - Audio: Upload MP3, WAV, or OGG files

3. **Select a file** from your computer
   - The upload will start automatically

4. **Wait for completion**
   - The file will appear as a thumbnail/card in the Files section
   - Videos show a generated thumbnail from the first frame
   - Audio files show an MP3 placeholder icon
   - Each file displays:
     - Preview image/icon
     - Filename (truncated if too long)
     - "Uploaded by: [Admin Name]" label

#### Supported File Types

| Type | Formats |
|------|---------|
| **Video** | MP4, WebM, AVI, MOV |
| **Audio** | MP3, WAV, OGG |

---

### Adding Media to Queue

#### Queue Structure

The **Queue** panel shows:
- **Now Playing** - Currently active/playing media item
- **Next from: (Playlist)** - The playlist being used
- **Total Duration** - Sum of all queued items
- **Playlist** - List of queued items in order

#### How to Queue Files

1. **Locate a file** in the Files panel (Videos or Audio section)
2. **Click on the file thumbnail or name**
   - The file is automatically added to the Queue
   - It will appear at the end of the queue list

3. **Wait for duration detection**
   - Each file's duration is automatically calculated
   - Total duration updates in the "Total Duration" display

#### Managing the Queue

- **Remove from Queue**: Click the **X button** on the item in the queue list
- **Reorder Queue**: Drag and drop items in the queue to reorder playback
- **Delete File**: Click the **close button** on the file thumbnail to permanently delete it

#### Playing Media

1. **Click a queued item** to set it as the current playing item
2. Use **playback controls**:
   - **Start Stream** - Begin broadcasting the stream
   - **Stop Stream** - Stop the broadcast
   - **Pause Stream** - Pause current playback
   - **Mute Audio** - Silence the audio output

---

### Stream Preview

The **Stream Preview** section shows what viewers will see:
- Live camera feed (if camera is connected)
- Currently playing video/audio
- Audio waveform visualizer for audio content

#### Controlling the Stream

| Button | Function |
|--------|----------|
| **Start Stream** | Begins broadcasting to viewers |
| **Stop Stream** | Stops the stream transmission |
| **Pause Stream** | Pauses playback without stopping broadcast |
| **Mute Audio** | Silences audio without stopping playback |

---

### Stream Manager (Ticker Controls)

Below the Stream Preview, the **Stream Manager** section provides:

- **Stream Title** - Enter a title for the current session
- **Speed (seconds)** - Ticker speed
- **Loop count** - Number of times ticker repeats (0 = infinite)
- **Interval (seconds)** - Delay between ticker messages
- **Start Ticker** - Begin displaying ticker messages
- **Stop Ticker** - Stop the ticker display