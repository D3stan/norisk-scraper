# Admin Dashboard Design

## Overview
Add an admin dashboard to the NoRisk scraper API to view user form submissions with search and filtering capabilities.

## Architecture

### Path-Based Routing
- Base URL: `api.domain.com/admin`
- Login: `api.domain.com/admin/login`
- API endpoints: `api.domain.com/admin/api/*`
- Existing API (`/api/quote`, etc.) remains unchanged

### File Structure
```
src/
├── index.js                    # Add admin routes, remove /health
├── admin/
│   ├── middleware/
│   │   └── auth.js             # Session check middleware
│   ├── routes/
│   │   ├── login.js            # Login page + API
│   │   └── dashboard.js        # Dashboard API endpoints
│   └── public/
│       ├── login.html          # Login page
│       ├── index.html          # Dashboard page
│       ├── admin.css           # Styles (based on norisk-form.css)
│       └── admin.js            # Client-side logic
├── utils/
│   ├── db.js                   # SQLite database wrapper
│   └── logger.js               # Existing
├── automation/
│   └── scraper.js              # Modified to save to DB
└── config/
    └── constants.js            # Add admin config

database/
└── submissions.db              # SQLite database
```

## Database Schema

```sql
CREATE TABLE submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome_cognome TEXT NOT NULL,
    ragione_sociale TEXT,
    partita_iva TEXT,
    email TEXT NOT NULL,
    telefono TEXT NOT NULL,
    codice_preventivo TEXT NOT NULL,
    event_type TEXT,
    event_date TEXT,
    premium_amount REAL,
    currency TEXT DEFAULT 'EUR',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email ON submissions(email);
CREATE INDEX idx_codice ON submissions(codice_preventivo);
CREATE INDEX idx_date ON submissions(created_at);
```

## UI Design

### Login Page
- Clean form with username/password inputs
- "Remember me" checkbox
- Styled with burgundy accent (#6B1C23) per norisk-form.css

### Dashboard
- Header with "NoRisk Admin" title and logout button
- Search bar (filters: nome, email, codice)
- Date filter dropdown: Tutte, Oggi, Ultimi 7 giorni, Ultimo mese
- Table columns: Data, Nome Cognome, Email, Telefono, Codice Preventivo
- Pagination (20 items per page)
- Click row to expand full details in modal

## Authentication

### Session-based Auth
- `express-session` with SQLite session store
- bcrypt for password hashing
- Rate limiting: 5 attempts per 15 minutes per IP
- Session expiry: 24 hours (7 days with "remember me")
- HttpOnly cookies

### Env Variables
```
ADMIN_USER=admin
ADMIN_PASSWORD_HASH=$2b$10$...  # bcrypt hash
ADMIN_SESSION_SECRET=random-secret-key
```

## Security

1. **Route Isolation**: Admin routes separate from public API
2. **Removed /health**: Eliminates information leakage
3. **Authentication Required**: All admin routes protected
4. **Rate Limiting**: Prevents brute force
5. **Secure Cookies**: HttpOnly, secure in production

## Data Flow

1. User submits form → `POST /api/quote`
2. Scraper processes → saves to SQLite via `utils/db.js`
3. Admin logs in → session created
4. Dashboard loads → fetches from `/admin/api/submissions`
5. Search/filter → query params modify SQL query

## Styling

- Based on `norisk-wordpress/norisk-form.css`
- Color palette: Burgundy (#6B1C23), soft black (#2C2C2C)
- Font: Montserrat
- Responsive: Mobile-friendly table

## Dependencies

- `better-sqlite3` - SQLite driver
- `express-session` - Session management
- `better-sqlite3-session-store` - Session storage
- `bcrypt` - Password hashing
- `express-rate-limit` - Rate limiting
