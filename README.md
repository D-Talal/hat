# PropManager — Real Estate Management Platform

A full-stack real estate management application with two modules:
- **Commercial/Retail** — Shopping centers, retail spaces, commercial leasing
- **Hospitality** — Hotel management, room inventory, bookings

## Tech Stack

- **Frontend**: React 18, React Router, Recharts, custom design system
- **Backend**: Python 3.11, FastAPI, SQLAlchemy ORM
- **Database**: PostgreSQL 16
- **Deployment**: Docker Compose / Railway / Render

---

## 🚀 Quick Start (Local with Docker)

**Prerequisites**: Docker + Docker Compose installed

```bash
git clone <your-repo>
cd realestate-app
docker-compose up --build
```

- **App**: http://localhost
- **API Docs**: http://localhost:8000/docs
- **Database**: localhost:5432

---

## ☁️ Deploy to Railway (Recommended — Free Tier)

1. Create account at https://railway.app
2. Install Railway CLI: `npm install -g @railway/cli`
3. Run:

```bash
railway login
cd realestate-app

# Create PostgreSQL database
railway add --plugin postgresql

# Deploy backend
cd backend
railway up --service backend
railway variables set DATABASE_URL=${{Postgres.DATABASE_URL}}

# Deploy frontend
cd ../frontend
# Set your backend URL first:
# Edit src/api.js: baseURL = 'https://your-backend.railway.app/api'
railway up --service frontend
```

---

## ☁️ Deploy to Render (One-click)

1. Push this repo to GitHub
2. Go to https://render.com → New → Blueprint
3. Connect your GitHub repo
4. Render reads `render.yaml` and deploys everything automatically

> **Important**: After deploy, update `REACT_APP_API_URL` in Render's frontend env vars to point to your backend URL.

---

## ☁️ Deploy to Fly.io

```bash
# Install flyctl: https://fly.io/docs/hands-on/install-flyctl/
fly auth login

# Deploy backend
cd backend
fly launch --name realestate-api
fly secrets set DATABASE_URL="postgresql://..."
fly deploy

# Deploy frontend
cd ../frontend
fly launch --name realestate-ui
fly deploy
```

---

## API Reference

Full interactive docs available at `/docs` once running.

### Commercial Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/retail/properties` | List/create properties |
| GET/POST | `/api/retail/units` | List/create units |
| GET/POST | `/api/retail/tenants` | List/create tenants |
| GET/POST | `/api/retail/invoices` | List/create invoices |
| GET/POST | `/api/retail/maintenance` | List/create maintenance |
| GET | `/api/retail/stats` | Dashboard statistics |

### Hotel Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/hotel/hotels` | List/create hotels |
| GET/POST | `/api/hotel/rooms` | List/create rooms |
| GET/POST | `/api/hotel/guests` | List/create guests |
| GET/POST | `/api/hotel/bookings` | List/create bookings |
| GET | `/api/hotel/stats` | Dashboard statistics |

All resources also support `PUT /{id}` and `DELETE /{id}`.

---

## Project Structure

```
realestate-app/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app entry
│   │   ├── database.py      # DB connection
│   │   ├── models/
│   │   │   ├── retail.py    # Commercial models
│   │   │   └── hotel.py     # Hotel models
│   │   └── routers/
│   │       ├── retail.py    # Commercial API routes
│   │       └── hotel.py     # Hotel API routes
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.js           # Router & layout
│   │   ├── api.js           # API client
│   │   ├── components/
│   │   │   ├── UI.js        # Design system components
│   │   │   ├── Sidebar.js   # Navigation
│   │   │   └── CrudPage.js  # Generic CRUD page
│   │   └── pages/
│   │       ├── Dashboard.js
│   │       ├── RetailPages.js
│   │       └── HotelPages.js
│   ├── public/index.html
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml
├── railway.toml
├── render.yaml
└── README.md
```
