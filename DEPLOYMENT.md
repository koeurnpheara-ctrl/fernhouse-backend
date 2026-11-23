# Deploying Fernhouse to AWS EC2 (Docker + Nginx + HTTPS)

Goal:

| Address | Goes to |
|---------|---------|
| https://myproject.site | Vue frontend |
| https://api.myproject.site | Express API (`/api/...`) |
| https://backend.myproject.site | Same Express server: **admin panel login** at `/admin/`, plus `/uploads` |

**Replace `myproject.site` with your real domain** in: `nginx/default.conf`, `nginx/default-ssl.conf`, and `.env`.
(VS Code: Ctrl+Shift+H, "Replace All".)

How traffic flows: `Browser -> Nginx container (ports 80/443) -> frontend or backend container -> MongoDB container`.
Only Nginx is open to the internet.

## 0. Before you start

- An AWS account and a domain name you can edit DNS for.
- Two GitHub repositories, `fernhouse-frontend` and `fernhouse-backend` (see step 5). The `.env` file must NOT be pushed (it is in `.gitignore`).

## 1. Create the EC2 server

1. AWS Console -> **EC2** -> **Launch instance**.
2. Name: `fernhouse`. Image: **Ubuntu Server 24.04 LTS**.
3. Instance type: `t3.small` (2 GB RAM is recommended; building the frontend needs memory. `t3.micro` can fail while building).
4. **Key pair**: create a new one (`.pem` file) and download it. Keep it safe.
5. **Network settings -> Security group**: allow
   - SSH (22) from **My IP**
   - HTTP (80) from Anywhere
   - HTTPS (443) from Anywhere
   - Do **not** open 5000, 8080 or 27017.
6. Storage: 20 GB. Launch.
7. EC2 -> **Elastic IPs** -> Allocate -> Associate with your instance. This gives a fixed public IP. Write it down (example `3.120.10.20`).

## 2. Connect with SSH

```bash
chmod 400 fernhouse-key.pem                      # Mac/Linux only
ssh -i fernhouse-key.pem ubuntu@YOUR_ELASTIC_IP
```
(Windows 10/11: use PowerShell with the same `ssh` command.)

## 3. Install Docker

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER      # lets you run docker without sudo
exit                               # log out, then SSH in again so the group change applies
```

## 4. Check Docker Compose

Docker Compose v2 was installed in step 3 as the `docker-compose-plugin`. After logging in again:

```bash
docker --version
docker compose version
docker run --rm hello-world
```

## 5. Get the code from GitHub

On your computer, push **each folder to its own repository** (once):
```bash
cd fernhouse-frontend
git init && git add . && git commit -m "Fernhouse frontend"
git branch -M main
git remote add origin https://github.com/YOUR_USER/fernhouse-frontend.git
git push -u origin main

cd ../fernhouse-backend
git init && git add . && git commit -m "Fernhouse backend and deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USER/fernhouse-backend.git
git push -u origin main
```
On the server, clone **both** repositories side by side:
```bash
mkdir fernhouse && cd fernhouse
git clone https://github.com/YOUR_USER/fernhouse-frontend.git
git clone https://github.com/YOUR_USER/fernhouse-backend.git
cd fernhouse-backend          # all docker commands below are run in this folder
```
(Private repo? Use a GitHub Personal Access Token as the password, or an SSH deploy key.)

## 6. Configure environment variables

```bash
cp .env.example .env
nano .env
```
Set at least these (Ctrl+O, Enter, Ctrl+X to save in nano):

```
MONGO_ROOT_PASSWORD=<long password, letters and numbers only>
JWT_SECRET=<long random text>              # generate one: openssl rand -hex 32
ADMIN_EMAIL=you@yourdomain.com
ADMIN_PASSWORD=<strong password>
SEED_SAMPLE_DATA=false                     # optional: no demo products in production

CORS_ORIGINS=https://myproject.site,https://www.myproject.site
VITE_API_URL=https://api.myproject.site/api
```

## 7. Point your domain to the server (DNS) - do this now, it needs time

In your domain registrar's DNS panel create **A records** to your Elastic IP:

| Type | Name | Value |
|------|------|-------|
| A | `@` | YOUR_ELASTIC_IP |
| A | `www` | YOUR_ELASTIC_IP |
| A | `api` | YOUR_ELASTIC_IP |
| A | `backend` | YOUR_ELASTIC_IP |

Wait a few minutes, then check from your computer: `nslookup api.myproject.site` must show your IP.
Do not continue to step 11 until all four names resolve.

## 8. Build the containers

```bash
docker compose build
```
The first build takes a few minutes.

## 9. Start all services

```bash
docker compose up -d --build
docker compose ps          # wait until frontend, backend, mongodb, nginx are "healthy"
docker compose logs backend --tail 30
```
You should see `MongoDB connected` and `API listening on port 5000`.

## 10. Test over HTTP first

```bash
curl http://localhost/nginx-health                      # ok
curl -H "Host: api.myproject.site" http://localhost/api/health
```
From your browser: `http://myproject.site` (the site works but is not secure yet).

## 11. Install SSL certificates (HTTPS)

The HTTP config (`nginx/default.conf`) already serves the Let's Encrypt challenge folder, so request the certificate:

```bash
docker compose --profile tools run --rm certbot certonly --webroot -w /var/www/certbot \
  --email you@yourdomain.com --agree-tos --no-eff-email \
  -d myproject.site -d www.myproject.site -d api.myproject.site -d backend.myproject.site
```
On success it prints "Successfully received certificate". Now switch Nginx to the HTTPS config:

```bash
cp nginx/default-ssl.conf nginx/default.conf
docker compose restart nginx
docker compose logs nginx --tail 20
```
(If you will `git pull` later, remember `nginx/default.conf` is now locally changed. Commit the HTTPS version from your computer instead
if you want it in GitHub.)

**Auto-renew:** certificates last 90 days. Add a monthly job:
```bash
crontab -e
# add this line (runs on the 1st of each month at 03:00):
0 3 1 * * cd /home/ubuntu/fernhouse/fernhouse-backend && docker compose --profile tools run --rm certbot renew --quiet && docker compose exec -T nginx nginx -s reload
```

## 12. Configure Nginx / test everything

Nginx is already configured by the files in `nginx/`. Final tests:

```bash
curl -I https://myproject.site                       # 200
curl https://api.myproject.site/api/health           # {"status":"ok","database":"connected",...}
curl -I https://backend.myproject.site                # 302 redirect to /admin/ (the admin login page)
curl -I http://myproject.site                        # 301 redirect to https
```
In the browser: open https://myproject.site, register, log in, add a product with a photo. Then open
https://backend.myproject.site/admin/ and log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` to see the admin panel.

## Updating the site later

```bash
cd ~/fernhouse/fernhouse-frontend && git pull
cd ../fernhouse-backend && git pull
docker compose up -d --build
```
Data is kept in Docker volumes (`mongo_data`, `uploads_data`).

## Common problems

| Problem | What to check |
|---------|---------------|
| Certbot says "connection refused" / "unauthorized" | DNS not ready, security group missing port 80, or nginx not running (`docker compose ps`) |
| Browser shows CORS error | `CORS_ORIGINS` in `.env` must be `https://myproject.site` exactly; then `docker compose up -d` |
| Site still calls `localhost:5000` | `VITE_API_URL` was changed after the build. Run `docker compose up -d --build` |
| `502 Bad Gateway` | Backend not ready: `docker compose logs backend` |
| Build is killed / out of memory | Use `t3.small` or add swap: `sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile` |
| Changed Mongo password but backend cannot log in | The password is only applied on the very first start. Reset (deletes data): `docker compose down -v` |
