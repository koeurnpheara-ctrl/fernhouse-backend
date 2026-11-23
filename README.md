# Fernhouse Backend (Express + MongoDB) and deployment files

This is the **backend repository**. The Vue website is in a separate repository: `fernhouse-frontend`.
This repo also holds the Docker Compose file, Nginx config and deployment guide that run **both** together.

```
fernhouse-backend/
├── src/ config/ controllers/ models/ routes/ middleware/ services/ utils/
│   └── public/admin/      admin panel (login page + dashboard) served by the backend
├── Dockerfile
├── docker-compose.yml     runs frontend + backend + mongodb + nginx
├── nginx/                 default.conf (HTTP) and default-ssl.conf (HTTPS)
├── docs/API.md            API documentation
├── .env.example           settings for Docker  (copy to .env)
├── .env.local.example     settings for running without Docker
└── DEPLOYMENT.md          AWS EC2 guide
```

## Folder layout on your computer / server

Clone **both** repositories into the same parent folder, side by side:

```bash
mkdir fernhouse && cd fernhouse
git clone https://github.com/YOUR_USER/fernhouse-frontend.git
git clone https://github.com/YOUR_USER/fernhouse-backend.git
```

```
fernhouse/
├── fernhouse-frontend/
└── fernhouse-backend/     <- you run docker commands here
```

`docker-compose.yml` builds the frontend from `../fernhouse-frontend`. If you name the frontend folder differently,
change `context:` under the `frontend` service.

## Run everything with Docker

```bash
cd fernhouse-backend
cp .env.example .env        # then edit .env: change passwords and JWT_SECRET
docker compose up -d --build
docker compose ps           # wait until all are "healthy"
```

- Website: http://localhost:8080
- API health: http://localhost:5000/api/health
- Admin login: `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env` (created automatically on first start)

Useful: `docker compose logs -f backend`, `docker compose down` (keeps data), `docker compose down -v` (DELETES data).

## Run only the backend without Docker

Needs Node.js 18+ and a MongoDB server (local or MongoDB Atlas).

```bash
cp .env.local.example .env    # edit MONGO_URI if needed
npm install
npm run dev                   # http://localhost:5000
```

## Admin panel on the backend server

The backend serves its own admin panel (plain HTML/JS, no build step):

| Where | Address |
|-------|---------|
| Locally | http://localhost:5000/admin/ |
| Production | https://backend.myproject.site/admin/ (the address `https://backend.myproject.site` redirects there) |

Log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`. Only accounts with the role `admin` get in.
It shows statistics and lets you manage users (change role, delete), products (delete) and contact messages.
The Vue website has its own admin dashboard at `/admin` too; both use the same API and data.

## Database

MongoDB runs in its own container on a private Docker network (no published port). Only the backend can reach it.
Data lives in the Docker volume `mongo_data`, uploaded images in `uploads_data`.

```bash
docker compose exec mongodb mongosh -u <MONGO_ROOT_USER> -p <MONGO_ROOT_PASSWORD> --authenticationDatabase admin fernhouse
```

## API and deployment

- API reference: [docs/API.md](docs/API.md)
- Deploy to AWS EC2: [DEPLOYMENT.md](DEPLOYMENT.md)

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Set MONGO_ROOT_PASSWORD in .env` | Run `cp .env.example .env` first |
| `path ../fernhouse-frontend not found` | Clone both repos side by side (see above) |
| Website says "Cannot reach the server" | Check `VITE_API_URL`, then `docker compose up -d --build` (it is baked in at build time) |
| CORS error in browser | `CORS_ORIGINS` must match the browser address exactly |
| Backend keeps restarting | `docker compose logs backend`; usually a wrong Mongo password (reset with `docker compose down -v`, deletes data) |
