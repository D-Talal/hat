# PropManager — Real Estate Management Platform

Full-stack real estate management platform covering two distinct modules: **Commercial/Retail** (SAP RE-FX inspired) and **Hospitality/Hotel**. Built with React 18, FastAPI, and PostgreSQL. Deployed on Render.

---

## 🌐 Live URLs

| Service | URL |
|---------|-----|
| Frontend | https://propmanager-frontend.onrender.com |
| Backend | https://realestate-backend-9uks.onrender.com |
| API Docs (Swagger) | https://realestate-backend-9uks.onrender.com/docs |

---

## 🔐 Default Login

| Email | Password | Role |
|-------|----------|------|
| admin@propmanager.com | Admin@1234 | Admin |

> **Change the admin password immediately** after first login via Settings → Change Password.

---

## 👥 User Roles & Permissions

| Role | Permissions |
|------|-------------|
| **Admin** | Full access + user management + audit log |
| **Manager** | Create & edit everything + audit log, no delete |
| **Accountant** | Read all data + full invoice & posting access |
| **Viewer** | Read-only access to all data |

Role-based UI — menu items and action buttons are automatically hidden based on the logged-in user's role.

---

## 🏢 Module 1 — Commercial / Retail (SAP RE-FX Inspired)

A professional-grade commercial real estate management module modelled on SAP RE-FX concepts.

### Patrimoine (Asset Hierarchy)
Full 5-level hierarchy: **Business Entity → Building → Floor → Space → Rental Object**
- Business entities with country/city/continent/currency and annual revenue
- Buildings with total area and construction year
- Floors with area and naming
- Spaces with time-dependent area measurements (`SpaceMeasurement`)
- Rental Objects (usage view) grouping one or more physical spaces — also supports **Pooled Spaces**

### Business Partners
- Partner registry with BP number auto-generation (`BP-00001`)
- Multiple simultaneous roles: `master_tenant`, `guarantor`, `landlord`, `vendor`, `contact_person`
- Customer account field on `master_tenant` role — required for AR postings
- Warning displayed when AR posting would be blocked (no customer account set)

### Contracts
- Separate `Contract` model decoupled from tenants
- Contract types: `lease_out`, `lease_in`
- Statuses: `Draft → Released → Terminated / Expired`
- Time-dependent date slots (`ContractDateSlot`) for lease renewals and extensions
- Multi-object contracts linking to multiple Rental Objects via `ContractObject`
- Payment timing: `in_advance` / `in_arrears`
- Pro-rata and day-count method (`act_365`, etc.)

### Conditions (Financial Terms)
Time-dependent financial conditions per contract — replaces flat monthly rent:

| Type | Description |
|------|-------------|
| `base_rent` | Standard periodic rent |
| `service_charge` | Recoverable charges |
| `advance_payment` | Prepaid charge |
| `flat_rate` | Fixed all-in amount |
| `sales_based` | % of tenant turnover |
| `markup_fee` | Management fee on top of cost |
| `rent_free` | Free period / incentive |
| `abatement` | Rent reduction |

Each condition has `valid_from` / `valid_to`, frequency (`monthly`, `quarterly`, `semi_annual`, `annual`), IPC indexation toggle, and currency.

### Service Charges (SCS — Settlement)
RERAPP-style service charge settlement:
- **Participation Groups** — pools of contract objects sharing a charge category
- **Settlement Units** — fiscal-year-scoped settlement containers
- **Cost Collectors** — track total costs, ancillary revenues, and net pool; settable to `settled`

### Security Deposits
Separate `DepositContract` model per main contract:
- Calculation methods: `fixed` or `months_of_rent`
- Full lifecycle: active → refunded

### Vacancy Postings
Track periods where rental objects are unoccupied with `market_rent` reference and cost center.

### Invoices & Maintenance
- Invoice tracking per contract with payment status
- Maintenance requests linked to contracts or rental objects, with priority and status (`open → in_progress → closed`)

---

## ⚡ Posting Engine (SAP RERAPP Inspired)

A batch accounting engine that generates financial entries for a selected period.

### Endpoint
```
POST /api/posting/run
{
  "period_from": "2025-01-01",
  "period_to":   "2025-01-31",
  "module":      "all",   // all | rent | scs | sales | vacancy | deposit | ifrs16
  "dry_run":     true     // simulate without persisting entries
}
```

### Modules

| Module | What it posts |
|--------|---------------|
| `rent` | Base rent, advance payments, flat rates — pro-rated by day-count method |
| `scs` | Service charge settlement distribution across participation group members |
| `sales` | Sales-based rent from tenant turnover declarations (linear or graded brackets) |
| `vacancy` | Vacancy cost entries for unoccupied rental objects |
| `deposit` | Security deposit charge entries |
| `ifrs16` | IFRS 16 interest + RoU amortization from pre-built schedule |

### IPC (Index-Linked Rent Revision)
```
POST /api/posting/ipc/apply
{ "contract_id": 1, "new_index": 108.5, "applied_date": "2025-01-01" }
```
Updates all IPC-enabled conditions on the contract simultaneously. Full history logged in `re_ipc_history`.

### IFRS 16
```
POST /api/posting/ifrs16/setup
{ "contract_id": 1, "discount_rate": 0.045, "initial_direct_costs": 0 }
```
Builds a full amortization schedule (PV of future lease payments at IBR). Monthly posting generates `ifrs16_interest` and `ifrs16_amort` entries.

### Multi-Currency
FX rates stored in `re_fx_rates` (date-effective). All amounts converted to base currency at posting time.

### Run History
Each run creates a `PostingRun` record with status, total entries, total amount, error count, and per-type summary. Entries can be inspected individually. Dry runs calculate without persisting.

---

## 🏨 Module 2 — Hospitality / Hotel

| Feature | Details |
|---------|---------|
| **Hotels** | Properties with star rating, city, country, continent, annual revenue |
| **Rooms** | Room inventory with type, bed type, floor, capacity, area, base rate, status |
| **Guests** | Guest profiles with PII encrypted at rest (Fernet) |
| **Bookings** | Reservations with check-in/out, adult/child count, revenue tracking |

---

## 📊 Dashboard & Revenue Map

- **Dashboard** — Live KPIs for both modules: occupancy rate, active contracts, pending invoices, revenue collected, hotel bookings
- **Revenue Map** — World map with continent drill-down showing annual revenue by property location (live DB data)

---

## 🔒 Security

| Feature | Implementation |
|---------|---------------|
| Authentication | JWT (8-hour expiry) + axios interceptor |
| 2FA | TOTP via Google Authenticator / Authy |
| Password hashing | bcrypt (direct library, no passlib) |
| Guest PII encryption | Fernet field-level encryption (`first_name`, `last_name`, `email`, `phone`, `id_number`) |
| Rate limiting | Login endpoint rate-limited |
| Security headers | `X-Content-Type-Options`, `X-Frame-Options`, `HSTS` |
| Audit log | Every create/update/delete logged with user, timestamp, resource |
| RBAC | 4 roles with granular `create`/`read`/`update`/`delete` permissions |

---

## 🌍 Internationalisation

Full bilingual UI — **English / French** — toggle in the sidebar. All labels, messages, and form fields are translated via a `LanguageContext` covering all pages including the posting engine.

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

## ☁️ Render Deployment

**Backend (Web Service)**
- Root Directory: `backend`
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Environment Variables:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SECRET_KEY` | Random secret for JWT signing |
| `FERNET_KEY` | Key for guest PII encryption |
| `PYTHON_VERSION` | `3.11.9` |
| `ENVIRONMENT` | `production` |

**Frontend (Web Service)**
- Root Directory: `frontend`
- Build Command: `npm install && npm run build && npm install -g serve`
- Start Command: `serve -s build -l $PORT`
- Environment Variables:

| Variable | Value |
|----------|-------|
| `REACT_APP_API_URL` | `https://realestate-backend-9uks.onrender.com/api` |

---

## 📁 Project Structure

```
/backend
  /app
    /core
      auth.py            # JWT creation/verification, bcrypt, TOTP/2FA
      deps.py            # FastAPI auth dependency injection
      permissions.py     # RBAC permission checker (role → action matrix)
      encryption.py      # Fernet field-level PII encryption
      rate_limit.py      # Login rate limiter
    /models
      user.py            # User + UserRole enum
      audit.py           # AuditLog
      retail.py          # Full commercial model set:
                         #   BusinessEntity, Building, Floor, Space, SpaceMeasurement
                         #   RentalObject, RentalObjectSpace, PooledSpace
                         #   BusinessPartner, BusinessPartnerRole
                         #   Contract, ContractDateSlot, ContractObject
                         #   Condition, SalesRule, SalesRuleBracket, SalesDeclaration
                         #   ParticipationGroup, SettlementUnit, CostCollector
                         #   DepositContract, VacancyPosting, Invoice, MaintenanceRequest
      hotel.py           # Hotel, Room, Guest (encrypted), Booking
      posting.py         # PostingRun, PostingEntry, FxRate, IpcHistory
                         #   Ifrs16Schedule, Ifrs16ScheduleLine
    /routers
      auth.py            # Login, 2FA setup/verify/disable, password change, /me
      users.py           # User management (admin only)
      retail.py          # Legacy retail CRUD (kept for backward compat)
      commercial.py      # Full commercial CRUD (684 lines):
                         #   business-entities, buildings, floors, spaces
                         #   business-partners, contracts, conditions
                         #   rental-objects, participation-groups
                         #   cost-collectors, invoices, maintenance, stats
      hotel.py           # Hotel CRUD + guest PII encrypt/decrypt
      posting.py         # Posting engine endpoints + IPC + IFRS16 + FX rates
      dashboard.py       # Aggregated KPI stats
      map.py             # Revenue map data by continent
    /services
      posting_engine.py  # Core posting logic (475 lines):
                         #   Pro-rata calc, IPC revision, sales-based rent
                         #   SCS settlement distribution, vacancy, deposit
                         #   IFRS16 schedule builder + periodic posting
    main.py              # FastAPI app, CORS, security headers, global error handler,
                         #   startup migrations, default admin seed
    database.py          # SQLAlchemy engine + session
  requirements.txt
  Dockerfile

/frontend
  /src
    /context
      AuthContext.js     # JWT state, axios interceptor, role helpers
      LanguageContext.js # EN/FR translations for all pages (386 lines)
    /components
      UI.js              # Design system: Card, Modal, PageHeader, etc.
      Sidebar.js         # Navigation with role-based visibility + language toggle
      CommercialModal.jsx
      dashboard/         # Dashboard section components
    /pages
      Login.js           # Login + 2FA verification flow
      Dashboard.js       # KPI dashboard
      RevenueMap.jsx     # World revenue map with continent drill-down
      Patrimoine.jsx     # Asset hierarchy (BE → Building → Floor → Space)
      BusinessPartners.jsx
      Contracts.jsx
      Conditions.jsx
      RentalObjects.jsx
      ServiceCharges.jsx # Participation groups + cost collectors
      PostingEngine.jsx  # Posting run UI + IPC modal + IFRS16 modal
      HotelPages.js      # Hotels, Rooms, Guests, Bookings
      UsersPage.js
      AuditLog.js
      Settings.js        # 2FA + password management
    api.js               # Axios client + all API helpers
    App.js               # Router + protected routes
  public/
    _redirects           # Render SPA routing
  Dockerfile
  nginx.conf

docker-compose.yml
render.yaml
```

---

## 🗄️ Database Tables

### Commercial (`re_*`)
```
re_business_entities       re_buildings              re_floors
re_spaces                  re_space_measurements     re_rental_objects
re_rental_object_spaces    re_pooled_spaces          re_pooled_space_members
re_business_partners       re_bp_roles               re_contracts
re_contract_date_slots     re_contract_objects       re_conditions
re_sales_rules             re_sales_rule_brackets    re_sales_declarations
re_participation_groups    re_pg_members             re_settlement_units
re_cost_collectors         re_deposit_contracts      re_vacancy_postings
re_invoices                re_maintenance
```

### Posting Engine
```
re_posting_runs            re_posting_entries        re_fx_rates
re_ipc_history             re_ifrs16_schedules       re_ifrs16_schedule_lines
```

### Hotel & Auth
```
hotels    hotel_rooms    hotel_guests    hotel_bookings
users     audit_logs
```

---

## 🐛 Fixes History

| Issue | Fix |
|-------|-----|
| Python 3.14 bcrypt error | Pinned Python to `3.11.9` via `.python-version` |
| passlib 72-byte truncation | Replaced passlib with direct `bcrypt` library |
| JWT not sent after login | Added axios request interceptor pulling token from `localStorage` |
| Guest PII 500 error | Widened `VARCHAR(50)` → `TEXT` for Fernet-encrypted columns via startup migration |
| Commercial pages blank | Sub-components (`ContractForm`, `ConditionForm`, etc.) missing `useLanguage()` hook |
| PostingEngine page blank | `MODULES_KEYS` undefined variable — renamed to `MODULES` |
| JSX build errors (6 files) | `title=tc.xxx` → `title={tc.xxx}`, unclosed string literals in label props |
| CORS wildcard | `allow_origins=["*"]` — should be locked to frontend URL in production |
