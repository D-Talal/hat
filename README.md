# PropManager v2 — Real Estate Management Platform

Full-stack real estate management with authentication, role-based access control, and 2FA.

## 🔐 Default Login

| Email | Password | Role |
|-------|----------|------|
| admin@propmanager.com | Admin@1234 | Admin |

> **Important**: Change the admin password immediately after first login via Settings → Change Password.

## 👥 User Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full access + user management + audit log |
| **Manager** | Create & edit everything, no delete, audit log |
| **Viewer** | Read-only access to all data |
| **Accountant** | Read all data + full invoice management |

## 🚀 Local Development (Docker)

```bash
git clone <your-repo>
cd realestate-v2
docker-compose up --build
```

- **App**: http://localhost
- **API Docs**: http://localhost:8000/docs

## ☁️ Deploy to Render

### Option A — Docker (recommended, avoids Python version issues)

1. Push repo to GitHub
2. Render → New → **Web Service**
   - Root Directory: `backend`
   - Environment: **Docker**
   - Add env vars:
     - `DATABASE_URL` → your PostgreSQL connection string
     - `SECRET_KEY` → any long random string
3. Render → New → **Static Site**
   - Root Directory: `frontend`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `build`
   - Add env var:
     - `REACT_APP_API_URL` → `https://your-backend.onrender.com/api`

### Option B — Blueprint (one-click)

1. Push repo to GitHub
2. Render → New → **Blueprint**
3. Connect repo — Render reads `render.yaml` automatically

> After deploy, update `REACT_APP_API_URL` in the frontend service to match your actual backend URL.

## 🔒 Security Notes

- JWT tokens expire after 8 hours
- 2FA uses TOTP (Google Authenticator / Authy compatible)
- All actions are logged in the audit trail
- Passwords are bcrypt hashed
- Set a strong `SECRET_KEY` env var in production

## 📁 Project Structure

```
/backend
  /app
    /core        # Auth, JWT, permissions, dependencies
    /models      # SQLAlchemy models (users, retail, hotel, audit)
    /routers     # API endpoints
    main.py      # App entry + DB seed
    database.py
  requirements.txt
  Dockerfile
  .python-version

/frontend
  /src
    /context     # AuthContext (JWT state)
    /components  # UI, Sidebar, CrudPage
    /pages       # Login, Dashboard, all CRUD pages,
                 # Users, AuditLog, Settings
    api.js       # Axios API client
    App.js       # Router + protected routes
  public/
  Dockerfile
  nginx.conf

docker-compose.yml
render.yaml
```
