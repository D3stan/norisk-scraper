# Admin Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an admin dashboard with SQLite storage for viewing user form submissions

**Architecture:** Session-based auth with SQLite database, admin routes at `/admin/*`, styled with existing norisk-form.css

**Tech Stack:** Node.js, Express, better-sqlite3, express-session, bcrypt, express-rate-limit

---

## Prerequisites

Ensure design doc is read: `@docs/plans/2025-02-26-admin-dashboard-design.md`

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install npm packages**

Run: `npm install better-sqlite3 express-session better-sqlite3-session-store bcrypt express-rate-limit`

Expected: Packages installed, package.json updated, package-lock.json created/updated

**Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add sqlite, session, bcrypt, rate-limit dependencies"
```

---

## Task 2: Create Database Module

**Files:**
- Create: `src/utils/db.js`
- Create: `database/.gitkeep`

**Step 1: Write database module**

```javascript
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../../database/submissions.db');

let db = null;

export function initDatabase() {
    if (db) return db;

    db = new Database(DB_PATH);

    // Create submissions table
    db.exec(`
        CREATE TABLE IF NOT EXISTS submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome_cognome TEXT NOT NULL,
            ragione_sociale TEXT,
            partita_iva TEXT,
            email TEXT NOT NULL,
            telefono TEXT NOT NULL,
            codice_preventivo TEXT NOT NULL UNIQUE,
            event_type TEXT,
            event_date TEXT,
            premium_amount REAL,
            currency TEXT DEFAULT 'EUR',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create indexes
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_email ON submissions(email);
        CREATE INDEX IF NOT EXISTS idx_codice ON submissions(codice_preventivo);
        CREATE INDEX IF NOT EXISTS idx_date ON submissions(created_at)
    `);

    return db;
}

export function getDatabase() {
    if (!db) {
        return initDatabase();
    }
    return db;
}

export function saveSubmission(data) {
    const db = getDatabase();

    const stmt = db.prepare(`
        INSERT INTO submissions
        (nome_cognome, ragione_sociale, partita_iva, email, telefono,
         codice_preventivo, event_type, event_date, premium_amount, currency)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
        data.nomeCognome || '',
        data.ragioneSociale || null,
        data.partitaIva || null,
        data.email || '',
        data.telefono || '',
        data.codicePreventivo || '',
        data.eventType || null,
        data.eventDate || null,
        data.premiumAmount || null,
        data.currency || 'EUR'
    );

    return result.lastInsertRowid;
}

export function getSubmissions(filters = {}) {
    const db = getDatabase();

    let query = 'SELECT * FROM submissions WHERE 1=1';
    const params = [];

    if (filters.search) {
        query += ` AND (
            nome_cognome LIKE ? OR
            email LIKE ? OR
            codice_preventivo LIKE ? OR
            telefono LIKE ?
        )`;
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (filters.dateFrom) {
        query += ' AND DATE(created_at) >= DATE(?)';
        params.push(filters.dateFrom);
    }

    if (filters.dateTo) {
        query += ' AND DATE(created_at) <= DATE(?)';
        params.push(filters.dateTo);
    }

    query += ' ORDER BY created_at DESC';

    // Pagination
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = db.prepare(query);
    return stmt.all(...params);
}

export function countSubmissions(filters = {}) {
    const db = getDatabase();

    let query = 'SELECT COUNT(*) as count FROM submissions WHERE 1=1';
    const params = [];

    if (filters.search) {
        query += ` AND (
            nome_cognome LIKE ? OR
            email LIKE ? OR
            codice_preventivo LIKE ?
        )`;
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }

    if (filters.dateFrom) {
        query += ' AND DATE(created_at) >= DATE(?)';
        params.push(filters.dateFrom);
    }

    if (filters.dateTo) {
        query += ' AND DATE(created_at) <= DATE(?)';
        params.push(filters.dateTo);
    }

    const stmt = db.prepare(query);
    return stmt.get(...params).count;
}
```

**Step 2: Create .gitkeep for database directory**

```bash
mkdir -p database
echo "*.db" > database/.gitignore
echo "*.db-journal" >> database/.gitignore
touch database/.gitkeep
```

**Step 3: Commit**

```bash
git add src/utils/db.js database/
git commit -m "feat: add sqlite database module with submissions CRUD"
```

---

## Task 3: Modify Scraper to Save Submissions

**Files:**
- Modify: `src/automation/scraper.js`
- Read first: `src/automation/scraper.js` to understand current structure

**Step 1: Read current scraper to find save location**

Look for where `quoteKey` and user data are available after successful submission.

**Step 2: Add database import and save call**

Add to imports:
```javascript
import { saveSubmission } from '../utils/db.js';
```

After successful form submission where you have:
- User data (nome, cognome, email, telefono, etc.)
- quoteKey (codice preventivo)
- pricing info

Add:
```javascript
// Save to database
try {
    saveSubmission({
        nomeCognome: `${data.name || ''} ${data.surname || ''}`.trim(),
        ragioneSociale: data.companyName || null,
        partitaIva: data.vatNumber || null,
        email: data.email,
        telefono: data.phone,
        codicePreventivo: result.quoteKey,
        eventType: data.eventType,
        eventDate: data.eventDate,
        premiumAmount: result.pricing?.total || null,
        currency: result.pricing?.currency || 'EUR'
    });
} catch (dbError) {
    logger.error('Failed to save submission to database', { error: dbError.message });
    // Don't fail the request if DB save fails
}
```

**Step 3: Commit**

```bash
git add src/automation/scraper.js
git commit -m "feat: save submissions to sqlite database"
```

---

## Task 4: Create Admin Config

**Files:**
- Modify: `src/config/constants.js`

**Step 1: Read current constants file**

**Step 2: Add admin configuration**

```javascript
// Add to existing CONFIG object
ADMIN: {
    USERNAME: process.env.ADMIN_USER || 'admin',
    PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH,
    SESSION_SECRET: process.env.ADMIN_SESSION_SECRET || 'change-this-secret-in-production',
    COOKIE_MAX_AGE: 24 * 60 * 60 * 1000, // 24 hours
    COOKIE_MAX_AGE_REMEMBER: 7 * 24 * 60 * 60 * 1000 // 7 days
}
```

**Step 3: Commit**

```bash
git add src/config/constants.js
git commit -m "config: add admin authentication settings"
```

---

## Task 5: Create Admin Auth Middleware

**Files:**
- Create: `src/admin/middleware/auth.js`

**Step 1: Write auth middleware**

```javascript
import bcrypt from 'bcrypt';
import { CONFIG } from '../../config/constants.js';

export function requireAuth(req, res, next) {
    if (req.session && req.session.isAuthenticated) {
        return next();
    }

    // API requests return 401, page requests redirect to login
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    return res.redirect('/admin/login');
}

export function redirectIfAuthenticated(req, res, next) {
    if (req.session && req.session.isAuthenticated) {
        return res.redirect('/admin');
    }
    next();
}

export async function validateCredentials(username, password) {
    if (!CONFIG.ADMIN.PASSWORD_HASH) {
        throw new Error('ADMIN_PASSWORD_HASH not configured');
    }

    if (username !== CONFIG.ADMIN.USERNAME) {
        return false;
    }

    return await bcrypt.compare(password, CONFIG.ADMIN.PASSWORD_HASH);
}
```

**Step 2: Commit**

```bash
git add src/admin/middleware/auth.js
git commit -m "feat: add admin authentication middleware"
```

---

## Task 6: Create Admin Routes

**Files:**
- Create: `src/admin/routes/login.js`
- Create: `src/admin/routes/dashboard.js`

**Step 1: Create login routes**

```javascript
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validateCredentials, redirectIfAuthenticated } from '../middleware/auth.js';
import { CONFIG } from '../../config/constants.js';

const router = Router();

// Rate limiter for login attempts
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: { error: 'Too many login attempts. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

// Serve login page
router.get('/login', redirectIfAuthenticated, (req, res) => {
    res.sendFile('login.html', { root: './src/admin/public' });
});

// Handle login
router.post('/api/login', loginLimiter, async (req, res) => {
    const { username, password, rememberMe } = req.body;

    try {
        const isValid = await validateCredentials(username, password);

        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Set session
        req.session.isAuthenticated = true;
        req.session.username = username;

        // Set cookie expiry
        if (rememberMe) {
            req.session.cookie.maxAge = CONFIG.ADMIN.COOKIE_MAX_AGE_REMEMBER;
        } else {
            req.session.cookie.maxAge = CONFIG.ADMIN.COOKIE_MAX_AGE;
        }

        res.json({ success: true });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

// Handle logout
router.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.json({ success: true });
    });
});

export default router;
```

**Step 2: Create dashboard API routes**

```javascript
import { Router } from 'express';
import { getSubmissions, countSubmissions } from '../../utils/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Get submissions with pagination and filters
router.get('/api/submissions', requireAuth, (req, res) => {
    try {
        const {
            search = '',
            dateFrom = '',
            dateTo = '',
            page = 1,
            limit = 20
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const filters = {
            search: search || undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
            limit: parseInt(limit),
            offset
        };

        const submissions = getSubmissions(filters);
        const total = countSubmissions({
            search: search || undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined
        });

        res.json({
            success: true,
            data: submissions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Error fetching submissions:', error);
        res.status(500).json({ error: 'Failed to fetch submissions' });
    }
});

export default router;
```

**Step 3: Commit**

```bash
git add src/admin/routes/
git commit -m "feat: add admin login and dashboard API routes"
```

---

## Task 7: Create Admin Static Files

**Files:**
- Create: `src/admin/public/login.html`
- Create: `src/admin/public/index.html`
- Create: `src/admin/public/admin.css`
- Create: `src/admin/public/admin.js`

**Step 1: Create login.html**

```html
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Login - NoRisk</title>
    <link rel="stylesheet" href="/admin/static/admin.css">
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
    <div class="admin-login-container">
        <div class="admin-login-box">
            <h1>NoRisk Admin</h1>
            <form id="loginForm">
                <div class="form-group">
                    <label for="username">Username</label>
                    <input type="text" id="username" name="username" required autofocus>
                </div>
                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" id="password" name="password" required>
                </div>
                <div class="form-group checkbox">
                    <label>
                        <input type="checkbox" id="rememberMe" name="rememberMe">
                        Ricordami
                    </label>
                </div>
                <button type="submit" class="btn-primary">Accedi</button>
                <div id="errorMessage" class="error-message"></div>
            </form>
        </div>
    </div>
    <script>
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const errorDiv = document.getElementById('errorMessage');
            errorDiv.textContent = '';

            try {
                const response = await fetch('/admin/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: document.getElementById('username').value,
                        password: document.getElementById('password').value,
                        rememberMe: document.getElementById('rememberMe').checked
                    })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    window.location.href = '/admin';
                } else {
                    errorDiv.textContent = data.error || 'Login failed';
                }
            } catch (error) {
                errorDiv.textContent = 'Network error. Please try again.';
            }
        });
    </script>
</body>
</html>
```

**Step 2: Create index.html (dashboard)**

```html
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - NoRisk Admin</title>
    <link rel="stylesheet" href="/admin/static/admin.css">
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
    <div class="admin-container">
        <header class="admin-header">
            <h1>NoRisk Admin</h1>
            <button id="logoutBtn" class="btn-secondary">Logout</button>
        </header>

        <main class="admin-main">
            <div class="filters">
                <input type="text" id="searchInput" placeholder="Cerca per nome, email, codice...">
                <select id="dateFilter">
                    <option value="">Tutte le date</option>
                    <option value="today">Oggi</option>
                    <option value="week">Ultimi 7 giorni</option>
                    <option value="month">Ultimo mese</option>
                </select>
                <button id="searchBtn" class="btn-primary">Cerca</button>
            </div>

            <div class="table-container">
                <table class="submissions-table">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Nome Cognome / Ragione Sociale</th>
                            <th>Email</th>
                            <th>Telefono</th>
                            <th>Codice Preventivo</th>
                        </tr>
                    </thead>
                    <tbody id="submissionsTable">
                        <!-- Populated by JS -->
                    </tbody>
                </table>
            </div>

            <div class="pagination" id="pagination">
                <!-- Populated by JS -->
            </div>
        </main>
    </div>

    <!-- Detail Modal -->
    <div id="detailModal" class="modal">
        <div class="modal-content">
            <span class="modal-close">&times;</span>
            <div id="modalBody"></div>
        </div>
    </div>

    <script src="/admin/static/admin.js"></script>
</body>
</html>
```

**Step 3: Create admin.css**

```css
/* Admin Dashboard Styles - Based on norisk-form.css */
:root {
    --brand-primary: #6B1C23;
    --brand-primary-hover: #5A181E;
    --brand-primary-faint: rgba(107, 28, 35, 0.15);
    --text-main: #2C2C2C;
    --text-body: #333333;
    --text-secondary: #555555;
    --text-muted: #666666;
    --border-default: #E0E0E0;
    --bg-white: #FFFFFF;
    --bg-light: #F9F9F9;
    --radius-sm: 3px;
}

* {
    box-sizing: border-box;
}

body {
    margin: 0;
    font-family: 'Montserrat', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', sans-serif;
    color: var(--text-body);
    background: var(--bg-light);
    line-height: 1.6;
}

/* Login Page */
.admin-login-container {
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background: var(--bg-light);
    padding: 20px;
}

.admin-login-box {
    background: var(--bg-white);
    padding: 40px;
    border-radius: var(--radius-sm);
    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    width: 100%;
    max-width: 400px;
}

.admin-login-box h1 {
    color: var(--brand-primary);
    font-weight: 700;
    font-size: 1.5rem;
    margin: 0 0 30px 0;
    text-align: center;
}

.form-group {
    margin-bottom: 20px;
}

.form-group label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-secondary);
    margin-bottom: 8px;
}

.form-group input[type="text"],
.form-group input[type="password"] {
    width: 100%;
    height: 48px;
    padding: 12px 16px;
    font-size: 16px;
    font-family: inherit;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.form-group input:focus {
    outline: none;
    border-color: var(--brand-primary);
    box-shadow: 0 0 0 2px rgba(107, 28, 35, 0.1);
}

.form-group.checkbox label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
}

.form-group.checkbox input[type="checkbox"] {
    accent-color: var(--brand-primary);
    width: 18px;
    height: 18px;
}

.btn-primary {
    width: 100%;
    padding: 16px;
    background: var(--brand-primary);
    color: white;
    border: none;
    border-radius: var(--radius-sm);
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.3s ease;
}

.btn-primary:hover {
    background: var(--brand-primary-hover);
}

.error-message {
    color: #dc2626;
    font-size: 14px;
    margin-top: 16px;
    text-align: center;
}

/* Dashboard Layout */
.admin-container {
    min-height: 100vh;
}

.admin-header {
    background: var(--bg-white);
    border-bottom: 1px solid var(--border-default);
    padding: 16px 40px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.admin-header h1 {
    color: var(--brand-primary);
    font-weight: 700;
    font-size: 1.25rem;
    margin: 0;
}

.btn-secondary {
    padding: 10px 20px;
    background: transparent;
    color: var(--brand-primary);
    border: 1px solid var(--brand-primary);
    border-radius: var(--radius-sm);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
}

.btn-secondary:hover {
    background: var(--brand-primary-faint);
}

.admin-main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 30px 40px;
}

/* Filters */
.filters {
    display: flex;
    gap: 16px;
    margin-bottom: 24px;
    flex-wrap: wrap;
}

.filters input,
.filters select {
    height: 48px;
    padding: 12px 16px;
    font-size: 14px;
    font-family: inherit;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
}

.filters input {
    flex: 1;
    min-width: 250px;
}

.filters select {
    min-width: 150px;
}

.filters input:focus,
.filters select:focus {
    outline: none;
    border-color: var(--brand-primary);
}

.filters .btn-primary {
    width: auto;
    padding: 12px 32px;
}

/* Table */
.table-container {
    background: var(--bg-white);
    border-radius: var(--radius-sm);
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    overflow-x: auto;
}

.submissions-table {
    width: 100%;
    border-collapse: collapse;
}

.submissions-table th {
    background: var(--bg-light);
    padding: 16px;
    text-align: left;
    font-weight: 600;
    font-size: 13px;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 2px solid var(--border-default);
}

.submissions-table td {
    padding: 16px;
    border-bottom: 1px solid var(--border-default);
    font-size: 14px;
}

.submissions-table tbody tr {
    cursor: pointer;
    transition: background-color 0.2s;
}

.submissions-table tbody tr:hover {
    background: var(--bg-light);
}

.submissions-table .date {
    color: var(--text-muted);
    font-size: 13px;
}

.submissions-table .ragione-sociale {
    color: var(--text-muted);
    font-size: 13px;
    margin-top: 4px;
}

/* Pagination */
.pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    margin-top: 24px;
}

.pagination button {
    padding: 8px 16px;
    background: var(--bg-white);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
}

.pagination button:hover:not(:disabled) {
    border-color: var(--brand-primary);
    color: var(--brand-primary);
}

.pagination button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.pagination button.active {
    background: var(--brand-primary);
    color: white;
    border-color: var(--brand-primary);
}

.pagination .info {
    color: var(--text-muted);
    font-size: 14px;
    margin: 0 16px;
}

/* Modal */
.modal {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    z-index: 1000;
    justify-content: center;
    align-items: center;
    padding: 20px;
}

.modal.active {
    display: flex;
}

.modal-content {
    background: var(--bg-white);
    border-radius: var(--radius-sm);
    padding: 32px;
    max-width: 500px;
    width: 100%;
    max-height: 80vh;
    overflow-y: auto;
    position: relative;
}

.modal-close {
    position: absolute;
    top: 16px;
    right: 16px;
    font-size: 24px;
    cursor: pointer;
    color: var(--text-muted);
}

.modal-close:hover {
    color: var(--text-main);
}

.modal-section {
    margin-bottom: 20px;
}

.modal-section:last-child {
    margin-bottom: 0;
}

.modal-section h3 {
    font-size: 0.85rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--brand-primary);
    margin: 0 0 12px 0;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--brand-primary-faint);
}

.modal-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid var(--border-default);
}

.modal-row:last-child {
    border-bottom: none;
}

.modal-label {
    color: var(--text-secondary);
    font-size: 14px;
}

.modal-value {
    color: var(--text-main);
    font-size: 14px;
    font-weight: 500;
}

/* Mobile */
@media (max-width: 768px) {
    .admin-header {
        padding: 16px 20px;
    }

    .admin-main {
        padding: 20px;
    }

    .filters {
        flex-direction: column;
    }

    .filters input,
    .filters select {
        width: 100%;
    }

    .submissions-table {
        font-size: 13px;
    }

    .submissions-table th,
    .submissions-table td {
        padding: 12px 8px;
    }
}
```

**Step 4: Create admin.js**

```javascript
// Admin Dashboard JavaScript
let currentPage = 1;
let currentSearch = '';
let currentDateFilter = '';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadSubmissions();

    // Event listeners
    document.getElementById('searchBtn').addEventListener('click', handleSearch);
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.querySelector('.modal-close').addEventListener('click', closeModal);
    document.getElementById('detailModal').addEventListener('click', (e) => {
        if (e.target.id === 'detailModal') closeModal();
    });
});

async function loadSubmissions(page = 1) {
    currentPage = page;

    const params = new URLSearchParams({
        page,
        limit: 20
    });

    if (currentSearch) params.append('search', currentSearch);

    const dateRange = getDateRange(currentDateFilter);
    if (dateRange.from) params.append('dateFrom', dateRange.from);
    if (dateRange.to) params.append('dateTo', dateRange.to);

    try {
        const response = await fetch(`/admin/api/submissions?${params}`);

        if (response.status === 401) {
            window.location.href = '/admin/login';
            return;
        }

        const data = await response.json();

        if (data.success) {
            renderTable(data.data);
            renderPagination(data.pagination);
        }
    } catch (error) {
        console.error('Error loading submissions:', error);
    }
}

function renderTable(submissions) {
    const tbody = document.getElementById('submissionsTable');

    if (submissions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px;">Nessun risultato trovato</td></tr>';
        return;
    }

    tbody.innerHTML = submissions.map(sub => `
        <tr onclick="showDetail(${sub.id})">
            <td class="date">${formatDate(sub.created_at)}</td>
            <td>
                <div>${escapeHtml(sub.nome_cognome)}</div>
                ${sub.ragione_sociale ? `<div class="ragione-sociale">${escapeHtml(sub.ragione_sociale)}</div>` : ''}
            </td>
            <td>${escapeHtml(sub.email)}</td>
            <td>${escapeHtml(sub.telefono)}</td>
            <td><code>${escapeHtml(sub.codice_preventivo)}</code></td>
        </tr>
    `).join('');
}

function renderPagination(pagination) {
    const container = document.getElementById('pagination');
    const { page, totalPages, total } = pagination;

    let html = '';

    // Prev button
    html += `<button ${page === 1 ? 'disabled' : ''} onclick="loadSubmissions(${page - 1})">← Precedente</button>`;

    // Page numbers
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(totalPages, page + 2);

    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="${i === page ? 'active' : ''}" onclick="loadSubmissions(${i})">${i}</button>`;
    }

    // Next button
    html += `<button ${page === totalPages ? 'disabled' : ''} onclick="loadSubmissions(${page + 1})">Successiva →</button>`;

    // Info
    html += `<span class="info">Pagina ${page} di ${totalPages} (${total} totali)</span>`;

    container.innerHTML = html;
}

function handleSearch() {
    currentSearch = document.getElementById('searchInput').value.trim();
    currentDateFilter = document.getElementById('dateFilter').value;
    loadSubmissions(1);
}

function getDateRange(filter) {
    const today = new Date();
    const format = (d) => d.toISOString().split('T')[0];

    switch (filter) {
        case 'today':
            return { from: format(today), to: format(today) };
        case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return { from: format(weekAgo), to: format(today) };
        case 'month':
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return { from: format(monthAgo), to: format(today) };
        default:
            return { from: null, to: null };
    }
}

async function showDetail(id) {
    try {
        // Fetch single submission (reusing list endpoint with search)
        const response = await fetch(`/admin/api/submissions?search=${id}&limit=1`);
        const data = await response.json();

        if (data.success && data.data.length > 0) {
            const sub = data.data[0];
            const modalBody = document.getElementById('modalBody');

            modalBody.innerHTML = `
                <div class="modal-section">
                    <h3>Dati Anagrafici</h3>
                    <div class="modal-row">
                        <span class="modal-label">Nome Cognome</span>
                        <span class="modal-value">${escapeHtml(sub.nome_cognome)}</span>
                    </div>
                    ${sub.ragione_sociale ? `
                    <div class="modal-row">
                        <span class="modal-label">Ragione Sociale</span>
                        <span class="modal-value">${escapeHtml(sub.ragione_sociale)}</span>
                    </div>` : ''}
                    ${sub.partita_iva ? `
                    <div class="modal-row">
                        <span class="modal-label">Partita IVA</span>
                        <span class="modal-value">${escapeHtml(sub.partita_iva)}</span>
                    </div>` : ''}
                </div>

                <div class="modal-section">
                    <h3>Contatti</h3>
                    <div class="modal-row">
                        <span class="modal-label">Email</span>
                        <span class="modal-value">${escapeHtml(sub.email)}</span>
                    </div>
                    <div class="modal-row">
                        <span class="modal-label">Telefono</span>
                        <span class="modal-value">${escapeHtml(sub.telefono)}</span>
                    </div>
                </div>

                <div class="modal-section">
                    <h3>Preventivo</h3>
                    <div class="modal-row">
                        <span class="modal-label">Codice Preventivo</span>
                        <span class="modal-value"><code>${escapeHtml(sub.codice_preventivo)}</code></span>
                    </div>
                    ${sub.premium_amount ? `
                    <div class="modal-row">
                        <span class="modal-label">Premio</span>
                        <span class="modal-value">€ ${sub.premium_amount.toFixed(2)}</span>
                    </div>` : ''}
                </div>

                ${sub.event_type ? `
                <div class="modal-section">
                    <h3>Evento</h3>
                    <div class="modal-row">
                        <span class="modal-label">Tipo</span>
                        <span class="modal-value">${escapeHtml(sub.event_type)}</span>
                    </div>
                    ${sub.event_date ? `
                    <div class="modal-row">
                        <span class="modal-label">Data</span>
                        <span class="modal-value">${sub.event_date}</span>
                    </div>` : ''}
                </div>` : ''}

                <div class="modal-section">
                    <h3>Registrazione</h3>
                    <div class="modal-row">
                        <span class="modal-label">Data registrazione</span>
                        <span class="modal-value">${formatDateTime(sub.created_at)}</span>
                    </div>
                </div>
            `;

            document.getElementById('detailModal').classList.add('active');
        }
    } catch (error) {
        console.error('Error loading detail:', error);
    }
}

function closeModal() {
    document.getElementById('detailModal').classList.remove('active');
}

async function handleLogout() {
    try {
        await fetch('/admin/api/logout', { method: 'POST' });
        window.location.href = '/admin/login';
    } catch (error) {
        console.error('Logout error:', error);
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT');
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('it-IT');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
```

**Step 5: Commit**

```bash
git add src/admin/public/
git commit -m "feat: add admin dashboard UI (login, dashboard, css, js)"
```

---

## Task 8: Integrate Admin Routes into Main App

**Files:**
- Modify: `src/index.js`

**Step 1: Read current index.js**

Understand existing middleware and route structure.

**Step 2: Add imports and session setup**

Add near top of file:
```javascript
import session from 'express-session';
import SQLiteStoreFactory from 'better-sqlite3-session-store';
import { initDatabase } from './utils/db.js';
import { CONFIG } from './config/constants.js';
import loginRoutes from './admin/routes/login.js';
import dashboardRoutes from './admin/routes/dashboard.js';
import { requireAuth } from './admin/middleware/auth.js';

const SQLiteStore = SQLiteStoreFactory(session);
```

**Step 3: Initialize database on startup**

Add after dotenv.config():
```javascript
// Initialize SQLite database
initDatabase();
console.log('✅ Database initialized');
```

**Step 4: Add session middleware**

Add after existing middleware (before routes):
```javascript
// Session middleware for admin
app.use(session({
    store: new SQLiteStore({
        dir: './database',
        db: 'sessions.db'
    }),
    secret: CONFIG.ADMIN.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    name: 'norisk.admin.session',
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: CONFIG.ADMIN.COOKIE_MAX_AGE
    }
}));
```

**Step 5: Mount admin routes**

After session middleware, add:
```javascript
// Admin routes
app.use('/admin', loginRoutes);
app.use('/admin', dashboardRoutes);

// Serve admin static files
app.use('/admin/static', express.static(path.join(__dirname, 'admin/public')));

// Admin dashboard page (protected)
app.get('/admin', requireAuth, (req, res) => {
    res.sendFile('index.html', { root: './src/admin/public' });
});
```

**Step 6: Remove /health route**

Delete or comment out:
```javascript
// REMOVE THIS:
app.get('/health', (req, res) => {
    ...
});
```

Also remove from console.log at bottom of file.

**Step 7: Update server startup logs**

Add admin URL to console output:
```javascript
console.log(`\n🚀 Server running on http://localhost:${PORT}`);
console.log(`🎯 Quote endpoint: POST http://localhost:${PORT}/api/quote`);
console.log(`🔐 Admin dashboard: http://localhost:${PORT}/admin`);
```

**Step 8: Commit**

```bash
git add src/index.js
git commit -m "feat: integrate admin routes, add session support, remove /health"
```

---

## Task 9: Generate Password Hash

**Files:**
- None (utility task)

**Step 1: Create password hash script**

Create temporary script `scripts/hash-password.js`:
```javascript
import bcrypt from 'bcrypt';

const password = process.argv[2];

if (!password) {
    console.error('Usage: node scripts/hash-password.js <password>');
    process.exit(1);
}

const hash = await bcrypt.hash(password, 10);
console.log('\nAdd this to your .env file:\n');
console.log(`ADMIN_PASSWORD_HASH=${hash}\n`);
```

**Step 2: Run script**

```bash
mkdir -p scripts
# Save the script above, then run:
node scripts/hash-password.js your-secure-password
```

**Step 3: Update .env.example**

Add to `.env.example`:
```
# Admin Dashboard
ADMIN_USER=admin
ADMIN_PASSWORD_HASH=
ADMIN_SESSION_SECRET=change-this-to-a-random-secret
```

**Step 4: Commit**

```bash
git add scripts/hash-password.js .env.example
git commit -m "chore: add password hash utility and env example"
```

---

## Task 10: Test the Implementation

**Files:**
- None (testing task)

**Step 1: Start the server**

```bash
npm start
```

Expected output:
```
✅ Database initialized
🚀 Server running on http://localhost:3000
🎯 Quote endpoint: POST http://localhost:3000/api/quote
🔐 Admin dashboard: http://localhost:3000/admin
```

**Step 2: Test login page**

Visit: `http://localhost:3000/admin`

Should redirect to `/admin/login` (if not authenticated).

Login with configured credentials.

**Step 3: Test empty dashboard**

Should show "Nessun risultato trovato" initially.

**Step 4: Test form submission saves to DB**

Submit a test form via `POST /api/quote`.

Check dashboard - should appear in table.

**Step 5: Test search/filter**

Use search box, date filters.

**Step 6: Test pagination**

Add 25+ test records, verify pagination works.

**Step 7: Test logout**

Click logout, verify redirect to login.

**Step 8: Test security**

- Verify `/health` returns 404
- Verify `/admin/api/submissions` without auth returns 401
- Verify login rate limiting works (5 attempts)

**Step 9: Commit**

```bash
# After testing, no code changes needed if all works
git log --oneline -5
```

---

## Deployment Notes

### Environment Variables Required:
```
ADMIN_USER=admin
ADMIN_PASSWORD_HASH=<bcrypt-hash>
ADMIN_SESSION_SECRET=<random-secret>
```

### Nginx Configuration (for subdomain):
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### File Permissions:
```bash
chmod 755 database/
# SQLite will create files with proper permissions
```

---

## Final Checklist

- [ ] All dependencies installed
- [ ] Database module created and tested
- [ ] Scraper saves submissions to DB
- [ ] Admin routes working
- [ ] Login page styled correctly
- [ ] Dashboard shows submissions
- [ ] Search and filters working
- [ ] Pagination working
- [ ] Modal shows full details
- [ ] Logout works
- [ ] /health route removed
- [ ] Rate limiting active
- [ ] Session secure in production
