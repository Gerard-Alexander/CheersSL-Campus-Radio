Revamp Campus Radio

CREATE .env file in the root before running docker-compose
Add this to the file 

### Admin Credentials
ADMIN_EMAIL=example@example.com
ADMIN_PASSWORD=examplePassword
ADMIN_NAME=Example

Docker will automatically generate the secret key.

### Docker Setup
1. Install Docker Desktop
2. After installation, open docker desktop and make sure that it is running
3. In the project directory, run the following code:

```bash
docker compose up -d --build
```
4. This will build and start the project.
5. Access it through Nginx port: https://<ip-address>:8443 or 
through Flask: https://<ip-address>:8000

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

=============================================================


### Changing the domain name (Extra)
1. Choose the domain you want to use, for example `radio.example.com`.
2. Configure DNS or hosts files:
   - For public access, create an A record pointing `radio.example.com` to your server's IP:
     1. Log into your domain registrar or DNS provider.
     2. Open your domain's DNS management or zone editor.
     3. Add a new DNS record:
        - Type: `A`
        - Name / Host: `radio` (or `radio.example.com`)
        - Value / Points to: your server IP address
        - TTL: use the default or `automatic`
     4. Save the record.
   - For LAN-only access, add this line to each client's hosts file:

     ```text
     192.168.1.100 radio.example.com
     ```
3. Update nginx:
   - Open `nginx/default.conf`.
   - Replace `server_name _;` with:

     ```nginx
     server_name radio.example.com;
     ```
4. Update Docker Compose ports if you want standard HTTP/HTTPS:
   - In `docker-compose.yml`, under `nginx.ports`, add:

     ```yaml
     ports:
       - "80:80"
       - "443:443"
       - "8443:443"
     ```
5. Use a certificate for the domain:
   - Replace `nginx/ssl/cheersslcert.pem` and `nginx/ssl/cheersslkey.pem` with a cert and key for `radio.example.com`.
6. Restart Docker Compose:

```bash
docker compose down
docker compose up -d --build
```
7. Open the site:
   - `https://radio.example.com`

Notes:
- If you are using a self-signed cert, the browser may warn you and require an exception.
- For LAN-only domains, each client must resolve the name either by local DNS or hosts file.
- Make sure firewall rules allow traffic on ports 80 and 443.
