# PropManager v2 — Real Estate Management Platform

Full-stack real estate management with authentication, role-based access control, 2FA, and dual modules for commercial and hospitality properties.

## 🔐 Default Login

| Email | Password | Role |
|-------|----------|------|
| admin@propmanager.com | Admin@1234 | Admin |

> **Important**: Change the admin password immediately after first login via Settings → Change Password.

---

## 👥 User Roles & Permissions

| Role | Permissions |
|------|-------------|
| **Admin** | Full access + user management + audit log |
| **Manager** | Create & edit everything, no delete, audit log |
| **Viewer** | Read-only access to all data |
| **Accountant** | Read all data + full invoice management |

Role-based UI — buttons and menu items are automatically hidden based on the logged-in user's role.

---

## 🏢 Modules

### Commercial / Retail
- **Properties** — Manage shopping centers, office buildings, commercial properties
- **Units** — Track rentable spaces, floor plans, area, and status
- **Tenants** — Manage leases, contacts, and lease status
- **Invoices** — Track rent payments, due dates, and outstanding balances
- **Maintenance** — Log and resolve maintenance requests with priority levels

### Hospitality / Hotel
- **Hotels** — Manage hotel properties and star ratings
- **Rooms** — Track room inventory, types, bed types, and availability
- **Guests** — Manage guest profiles and identification
- **Bookings** — Handle reservations, check-in/check-out, and revenue tracking

---

## ✨ Key Features

- **JWT Authentication** — Secure tokens with 8-hour expiry, auto-logout
- **2FA (TOTP)** — Google Authenticator / Authy compatible, per-user setup
- **Auto Occupancy Sync** — Unit status automatically updates to "occupied" when an active tenant is added, and back to "available" when removed
- **Smart Dropdowns** — Foreign key fields use dropdowns (e.g. select Unit from list when adding a Tenant) instead of manual ID entry
- **Audit Log** — Complete trail of every create/update/delete action with user, timestamp, and IP
- **User Management** — Admin can create, edit, disable, and assign roles to users
- **Dashboard** — Live occupancy rates and revenue stats for both modules with charts
- **Centered Modals** — Forms open in centered, scrollable modals with sticky headers

---

## 🚀 Local Development (Docker)

```bash
git clone https://github.com/D-Talal/hat.git
cd hat
docker-compose up --build
```

- **App**: http://localhost
- **API Docs**: http://localhost:8000/docs

---

## ☁️ Deployed on Render

| Service | URL |
|---------|-----|
| Frontend | https://propmanager-frontend.onrender.com |
| Backend | https://realestate-backend-9uks.onrender.com |
| API Docs | https://realestate-backend-9uks.onrender.com/docs |

### Render Service Settings

**Backend (Web Service)**
- Root Directory: `backend`
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Environment Variables:
  - `DATABASE_URL` — PostgreSQL connection string
  - `SECRET_KEY` — Random secret for JWT signing
  - `PYTHON_VERSION` — `3.11.9`

**Frontend (Web Service)**
- Root Directory: `frontend`
- Build Command: `npm install && npm run build && npm install -g serve`
- Start Command: `serve -s build -l $PORT`
- Environment Variables:
  - `REACT_APP_API_URL` — `https://realestate-backend-9uks.onrender.com/api`

---

## 🔒 Security Notes

- JWT tokens expire after 8 hours
- 2FA uses TOTP (compatible with Google Authenticator and Authy)
- All actions are logged in the audit trail (admin/manager can view)
- Passwords are hashed with bcrypt (72-byte safe truncation)
- Set a strong `SECRET_KEY` env var in production — never use the default

---

## 📁 Project Structure

```
/backend
  /app
    /core
      auth.py          # JWT, bcrypt hashing, TOTP/2FA
      deps.py          # Auth dependency injection
      permissions.py   # Role-based permission checker
    /models
      user.py          # User model with roles
      audit.py         # Audit log model
      retail.py        # Property, Unit, Tenant, Invoice, Maintenance
      hotel.py         # Hotel, Room, Guest, Booking
    /routers
      auth.py          # Login, 2FA setup/verify, password change
      users.py         # User management (admin only)
      retail.py        # Commercial CRUD + auto occupancy sync
      hotel.py         # Hotel CRUD endpoints
    main.py            # FastAPI app + CORS + DB seed
    database.py        # SQLAlchemy setup
  requirements.txt
  Dockerfile
  .python-version      # Pins Python 3.11.9

/frontend
  /src
    /context
      AuthContext.js   # JWT state, axios interceptor, role checker
    /components
      UI.js            # Design system (Card, Modal, Table, Badge, etc.)
      Sidebar.js       # Navigation with role-based menu visibility
      CrudPage.js      # Generic CRUD page with permission-aware buttons
    /pages
      Login.js         # Login + 2FA verification flow
      Dashboard.js     # Stats + occupancy charts
      RetailPages.js   # Properties, Units, Tenants, Invoices, Maintenance
      HotelPages.js    # Hotels, Rooms, Guests, Bookings
      UsersPage.js     # User management (admin only)
      AuditLog.js      # Audit trail viewer
      Settings.js      # 2FA setup/disable + password change
    api.js             # Axios client with token interceptor
    App.js             # Router + protected routes
  public/
    _redirects         # Render SPA routing fix
  Dockerfile
  nginx.conf

docker-compose.yml
render.yaml
```

---

## 🐛 Known Fixes Applied

| Issue | Fix |
|-------|-----|
| Python 3.14 bcrypt error | Pinned Python to 3.11.9 via `.python-version` |
| passlib 72-byte password error | Replaced passlib with direct bcrypt library |
| CORS errors on 500 responses | Fixed by ensuring backend never crashes before headers sent |
| JWT token not sent after login | Added axios request interceptor pulling token from localStorage |
| Date fields causing 500 error | Empty date strings now sent as `null` |
| Unit number converted to integer | Added STRING_FIELDS list to preserve string types |
| Occupancy not updating | Backend now auto-syncs unit status on tenant create/update/delete |
| Modal cut off at top of screen | Modal now centered with `margin: auto` and `85vh` max-height |
| Foreign key ID entry | Replaced manual ID inputs with live dropdowns |
