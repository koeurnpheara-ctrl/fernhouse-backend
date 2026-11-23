# Fernhouse API

Base URL: `http://localhost:5000/api` locally, `https://api.myproject.site/api` in production.
All bodies are JSON unless noted. Protected routes need the header `Authorization: Bearer <token>`.

Error format: `{ "message": "Readable message", "errors": [{ "field": "email", "message": "..." }] }`
(`errors` appears for validation problems, status 422).

| Status | Meaning |
|--------|---------|
| 400 | Bad request / invalid ID |
| 401 | Not logged in, wrong password, or token expired |
| 403 | Logged in but not allowed |
| 404 | Not found |
| 409 | Duplicate value (e.g. email already registered) |
| 422 | Validation failed |

## Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | no | `200 {status:"ok", database:"connected"}`; `503` if the database is down |

## Auth

| Method | Path | Auth | Body | Description |
|--------|------|------|------|-------------|
| POST | `/auth/register` | no | `name, email, password(8+)` | Creates a **user**; returns `{ token, user }` (201) |
| POST | `/auth/login` | no | `email, password` | Returns `{ token, user }` |
| GET | `/auth/me` | yes | - | Current user |
| PUT | `/auth/me` | yes | `name` | Update own name |
| PUT | `/auth/password` | yes | `currentPassword, newPassword` | Change own password |

Passwords are hashed with bcrypt (12 rounds). Tokens are JWTs signed with `JWT_SECRET`, lifetime `JWT_EXPIRES_IN` (default 7 days).
Login/register are rate limited (50 requests / 15 min / IP).

## Users (admin only)

| Method | Path | Body / Query | Description |
|--------|------|--------------|-------------|
| GET | `/users` | `?search=&role=user\|admin` | List users |
| PUT | `/users/:id` | `name?, role?` | Update a user (admins cannot change their own role) |
| DELETE | `/users/:id` | - | Delete a user **and their products** (204) |

## Products

Categories: `indoor, outdoor, succulents, herbs, pots, care`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/products` | no | List. Query: `search, category, minPrice, maxPrice, inStock=true, sort=newest\|oldest\|price-asc\|price-desc\|name, page, limit(max 50)`. Returns `{ data, page, limit, total, pages }` |
| GET | `/products/mine` | yes | Same query options, only the logged-in user's products |
| GET | `/products/:id` | no | `{ product }` |
| POST | `/products` | yes | **multipart/form-data**: `name, description, price, stock, category`, optional file field `image` (JPG/PNG/WEBP/GIF, max 5 MB) |
| PUT | `/products/:id` | owner or admin | Same fields; send `removeImage=true` to delete the current image |
| DELETE | `/products/:id` | owner or admin | Deletes product and its image (204) |

`image` in responses is a path such as `/uploads/3f2a....jpg`; the file is served at `<API origin>/uploads/...`.

Example (curl):

```bash
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"YOUR_ADMIN_PASSWORD"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).token')

curl -X POST http://localhost:5000/api/products -H "Authorization: Bearer $TOKEN" \
  -F name="Fern" -F price=12.5 -F stock=3 -F category=indoor -F image=@fern.jpg
```

## Messages (contact form)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/messages` | no | `name, email, subject?, message(10+)` - rate limited (10 / 15 min) |
| GET | `/messages` | admin | List messages |
| DELETE | `/messages/:id` | admin | Delete (204) |

## Stats (admin only)

`GET /stats` -> `{ users, products, messages, byCategory: [{ category, count }] }`
